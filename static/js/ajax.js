if( !window.XMLHttpRequest ) XMLHttpRequest = function() {
    try{ return new ActiveXObject("Msxml2.XMLHTTP.6.0") }catch(e){}
    try{ return new ActiveXObject("Msxml2.XMLHTTP.3.0") }catch(e){}
    try{ return new ActiveXObject("Msxml2.XMLHTTP") }catch(e){}
    try{ return new ActiveXObject("Microsoft.XMLHTTP") }catch(e){}
    throw new Error("Could not find an XMLHttpRequest alternative.")
};

function returnFalse() {
    return false;
}

function ajax(verb, url, options) {
    var request = new XMLHttpRequest();
        success = options.success || returnFalse;
        failure = options.failure || returnFalse;
        body = options.body || null;

    request.onreadystatechange = function () {
        if (request.readyState == 4) {
            if (request.status >= 200 && request.status < 300) {
                //success
                success.call(null, request.responseText, request.status);
                request.onreadystatechange = returnFalse;
            }
            else {
                failure.call(null, request.statusText, request.status);
            }
        }
    }

    //You have to open the connection before setting the request headers.
    request.open(verb, url, !options.synchronous);
    if (verb == "POST") {
        request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        request.setRequestHeader("Connection", "close");
        request.setRequestHeader("Content-length", body.length);
    }
    request.send(body);

    if (options.synchronous && success) {
        success.call(null, request.responseText, request.status);
    }
}

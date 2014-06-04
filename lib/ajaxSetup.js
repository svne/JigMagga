// TODO: this is YD special! move back to ydFrontend
steal("jquery").then("can/util", function () {
    "use strict";
        var ajaxSetup = {
            contentType: 'application/json',
            dataType: 'json',
            mimeType: 'application/json',
            processData: false,
            headers: {}
        },
        appUuid = $.jStorage.get("buid");

    if (appUuid) {
        ajaxSetup.headers.appUuid = appUuid;
    }
    if (Yd.config.locale) {
        ajaxSetup.headers["Accept-Language"] = Yd.config.locale.replace(/_/g, "-") + "," + Yd.config.locale.substr(0,2) + ";q=0.8,en-US;q=0.6,en;q=0.4";
        ajaxSetup.headers["YD-X-Domain"] = Yd.config["parent-domain"] || Yd.config["yd-domain"];
    }
    if (Yd.config.version) {
        ajaxSetup.headers.appVersion = Yd.config.version;
    }
    if (Yd.config.device) {
        ajaxSetup.headers.device = Yd.config.device;
    }

    if (steal.config().env === "development") {
        ajaxSetup.crossDomain = true;
    }
    jQuery.ajaxSetup(ajaxSetup);
    jQuery.ajaxPrefilter(function (options, optionsOriginal, jqXHR) {
        if (options !== undefined) {
            if (options.headers && options.headers["YD-X-Domain"]) {
                options.url += options.url.indexOf("?") === -1 ? "?" : "&";
                options.url += "YD_X_DOMAIN=" + options.headers["YD-X-Domain"];
            }
            if (options.type !== undefined && options.data !== undefined) {
                if (options.type === "POST" || options.type === "PUT") {
                    options.data = JSON.stringify(options.data);
                } else {
                    if (options.data) {
                        options.data = can.param(options.data);
                    }
                }
            }
        }
    });
    can.ajaxTransport("json", function (s) {
        var callback,
            xhrCallbacks,
            xhrId = 0,
            xhrOnUnloadAbort = window.ActiveXObject && function () {
                var key;
                for (key in xhrCallbacks) {
                    xhrCallbacks[ key ](undefined, true);
                }
            };
        if (s.type === "POST") {
            return {
                send: function (headers, complete) {
                    // Get a new xhr
                    var handle, i,
                        xhr = s.xhr();

                    // Open the socket
                    // Passing null username, generates a login popup on Opera (#2865)
                    if (s.username) {
                        xhr.open(s.type, s.url, s.async, s.username, s.password);
                    } else {
                        xhr.open(s.type, s.url, s.async);
                    }

                    // Apply custom fields if provided
                    if (s.xhrFields) {
                        for (i in s.xhrFields) {
                            xhr[ i ] = s.xhrFields[ i ];
                        }
                    }

                    // Override mime type if needed
                    if (s.mimeType && xhr.overrideMimeType) {
                        xhr.overrideMimeType(s.mimeType);
                    }

                    // X-Requested-With header
                    // For cross-domain requests, seeing as conditions for a preflight are
                    // akin to a jigsaw puzzle, we simply never set it to be sure.
                    // (it can always be set on a per-request basis or even using ajaxSetup)
                    // For same-domain requests, won't change header if already provided.
                    if (!s.crossDomain && !headers["X-Requested-With"]) {
                        headers["X-Requested-With"] = "XMLHttpRequest";
                    }

                    // Need an extra try/catch for cross domain requests in Firefox 3
                    try {
                        for (i in headers) {
                            xhr.setRequestHeader(i, headers[ i ]);
                        }
                    } catch (err) {
                    }

                    // Do send the request
                    // This may raise an exception which is actually
                    // handled in jQuery.ajax (so no try/catch here)
                    xhr.send(( s.hasContent && s.data
                        ) || null);

                    callback = function (_, isAbort) {
                        var status, responseHeaders, statusText, responses;

                        try {

                            // Was never called and is aborted or complete
                            if (callback && ( isAbort || xhr.readyState === 4
                                )) {

                                // Only called once
                                callback = undefined;

                                // Do not keep as active anymore
                                if (handle) {
                                    xhr.onreadystatechange = jQuery.noop;
                                }

                                // If it's an abort
                                if (isAbort) {
                                    // Abort it manually if needed
                                    if (xhr.readyState !== 4) {
                                        xhr.abort();
                                    }
                                } else {
                                    responses = {};
                                    status = xhr.status;
                                    responseHeaders = xhr.getAllResponseHeaders();

                                    // When requesting binary data, IE6-9 will throw an exception
                                    // on any attempt to access responseText (#11426)
                                    if (typeof xhr.responseText === "string") {
                                        responses.json = JSON.parse(xhr.responseText);
                                    }

                                    // Firefox throws an exception when accessing
                                    // statusText for faulty cross-domain requests
                                    try {
                                        statusText = xhr.statusText;
                                    } catch (e) {
                                        // We normalize with Webkit giving an empty statusText
                                        statusText = "";
                                    }

                                    // Filter status for non standard behaviors

                                    // If the request is local and we have data: assume a success
                                    // (success with no data won't get notified, that's the best we
                                    // can do given current implementations)
                                    if (!status && s.isLocal && !s.crossDomain) {
                                        status = responses.json ? 200 : 404;
                                        // IE - #1450: sometimes returns 1223 when it should be 204
                                    } else if (status === 1223) {
                                        status = 204;
                                    }
                                }
                            }
                        } catch (firefoxAccessException) {
                            if (!isAbort) {
                                complete(-1, firefoxAccessException);
                            }
                        }

                        // Call complete if needed
                        if (responses) {
                            // YD extension
                            if (status === 200 && responses.json && responses.json.status && (responses.json.status === "ERROR" || responses.json.status === "SEVERE")) {
                                status = responses.json.errorCodes;
                                statusText = responses.json.status;
                            }
                            complete(status, statusText, responses, responseHeaders);
                        }
                    };

                    if (!s.async) {
                        // if we're in sync mode we fire the callback
                        callback();
                    } else if (xhr.readyState === 4) {
                        // (IE6 & IE7) if it's in cache and has been
                        // retrieved directly we need to fire the callback
                        setTimeout(callback);
                    } else {
                        handle = ++xhrId;
                        if (xhrOnUnloadAbort) {
                            // Create the active xhrs callbacks list if needed
                            // and attach the unload handler
                            if (!xhrCallbacks) {
                                xhrCallbacks = {};
                                jQuery(window).unload(xhrOnUnloadAbort);
                            }
                            // Add to list of active xhrs callbacks
                            xhrCallbacks[ handle ] = callback;
                        }
                        xhr.onreadystatechange = callback;
                    }
                },

                abort: function () {
                    if (callback) {
                        callback(undefined, true);
                    }
                }
            };
        }
    });
});

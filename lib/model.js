steal("jquery").then("can/util", "can/model", "can/model/list", "can/map/delegate", "ydcore/jstorage", function () {
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
    can.extend(can.Model, {

        cacheDeferred: function (methodName, params, success, error, reset, data) {
            var current, index = can.param(params),
                objectName = "deferred_" + methodName,
                self = this;
            can.Model[objectName] = can.Model[objectName] || {};
            can.Model[objectName][this._fullName] = can.Model[objectName][this._fullName] || {};
            if (reset || !can.Model[objectName][this._fullName] || !can.Model[objectName][this._fullName][index]) {
                if (data) {
                    current = new this(data);
                    can.Model[objectName][this._fullName][index] = $.Deferred();
                    can.Model[objectName][this._fullName][index].resolve(current);
                } else {
                    can.Model[objectName][this._fullName][index] = this[methodName](params);
                }
            } else if (data) {
                can.Model[objectName][this._fullName][index] = can.extend(can.Model[objectName][this._fullName][index], data);
            }
            can.Model[objectName][this._fullName].currentIndex = index;
            can.Model[objectName][this._fullName][index].done(function () {
                can.trigger(self, "loaded");
                if (success) {
                    success.apply(this, arguments);
                }
            });
            if (error) {
                can.Model[objectName][this._fullName][index].fail(error);
            }
            return can.Model[objectName][this._fullName][index];
        },
        findAllCached: function (params, success, error, reset) {
            return this.cacheDeferred("findAll", params, success, error, reset);
        },
        findOneCached: function (params, success, error, reset) {
            return this.cacheDeferred("findOne", params, success, error, reset);
        },
        findOneStored: function (params, success, error, reset) {
            return this.cacheDeferred("findOne", params, function (model) {
                $.jStorage.set(this._fullName, model);
                success(model);
            }, error, reset);
        },
        updateOneStored: function (data, success, error) {
            var self = this;
            return this.cacheDeferred("findOne", "", function (model) {
                $.jStorage.set(self._fullName, model);
                success(model);
            }, error, false, data);
        },
        getCurrent: function (success, error) {
            var current, data, objectName;
            if (can.Model.deferred_findOne
                && can.Model.deferred_findOne[this._fullName]
                && can.Model.deferred_findOne[this._fullName].currentIndex !== undefined) {
                current = can.Model.deferred_findOne[this._fullName][can.Model.deferred_findOne[this._fullName].currentIndex];
                if (success) {
                    current.done(success);
                }
                if (error) {
                    current.fail(error);
                }
                //noinspection JSLint
                return current;
            } else if (can.Model.deferred_findAll
                && can.Model.deferred_findAll[this._fullName]
                && can.Model.deferred_findAll[this._fullName].currentIndex !== undefined) {
                current = can.Model.deferred_findAll[this._fullName][can.Model.deferred_findAll[this._fullName].currentIndex];
                if (success) {
                    current.done(success);
                }
                if (error) {
                    current.fail(error);
                }
                //noinspection JSLint
                return current;
            } else {
                data = $.jStorage.get(this._fullName);
                if (data) {
                    objectName = "deferred_" + (can.isArray(data) ? "findAll" : "findOne"
                        );
                    current = new this(data);
                } else {
                    objectName = "deferred_findOne";
                    current = new this();
                }
                can.Model[objectName] = can.Model[objectName] || {};
                can.Model[objectName][this._fullName] = can.Model[objectName][this._fullName] || {};
                can.Model[objectName][this._fullName][""] = $.Deferred();
                can.Model[objectName][this._fullName][""].resolve(current);
                can.Model[objectName][this._fullName].currentIndex = "";
                if (success) {
                    can.Model[objectName][this._fullName][""].done(success);
                }
                if (error) {
                    can.Model[objectName][this._fullName][""].fail(error);
                }
                return can.Model[objectName][this._fullName][""];
            }
        },
        storeCurrent: function (success, error) {
            var self = this;
            this.getCurrent(function (model) {
                $.jStorage.set(self._fullName, model.serialize());
                if (success) {
                    success(model);
                }
            }, function (e) {
                if (error) {
                    error(e);
                }
            });
        },
        uncache: function () {
            if (can.Model.deferred_findOne
                && can.Model.deferred_findOne[this._fullName]) {
                delete (can.Model.deferred_findOne[this._fullName]
                    );
            }
            if (can.Model.deferred_findAll
                && can.Model.deferred_findAll[this._fullName]) {
                delete (can.Model.deferred_findAll[this._fullName]
                    );
            }
            if ($.jStorage.get(this._fullName)) {
                $.jStorage.deleteKey(this._fullName);
            }
        },
        reDefine: function (model, modelConstructor) {
            if (modelConstructor && modelConstructor.fullName) {
                if (!model.constructor || !model.attr) {
                    model = new modelConstructor(model);
                } else if (model.constructor.fullName !== modelConstructor.fullName) {
                    model = new modelConstructor(model.attr());
                }
            }
            return model;
        }
    });
    can.extend(can.List.prototype, {
        store: function () {
            var index = "",
                objectName = "deferred_findAll";
            $.jStorage.set(this.constructor._fullName, this.serialize());
            can.Model[objectName] = can.Model[objectName] || {};
            can.Model[objectName][this.constructor._fullName] = can.Model[objectName][this.constructor._fullName] || {};
            can.Model[objectName][this.constructor._fullName].currentIndex = index;
            can.Model[objectName][this.constructor._fullName][index] = $.Deferred();
            can.Model[objectName][this.constructor._fullName][index].resolve(this);
        },
        flush: function () {
            var self = this,
                attributes = null,
                key = null;
            if ($.jStorage.get(this.constructor._fullName)) {
                $.jStorage.deleteKey(this.constructor._fullName);
            }
            attributes = this.attr();
            this.splice(0, attributes.length);
            for (key in attributes) {
                if (attributes.hasOwnProperty(key)) {
                    self.removeAttr(key);
                }
            }
        },
        cache: function (fullname) {
            var index = "",
                objectName = "deferred_findAll",
                fullname = fullname || this.constructor.Observe._fullName;
            can.Model[objectName] = can.Model[objectName] || {};
            can.Model[objectName][fullname] = can.Model[objectName][this.constructor._fullName] || {};
            can.Model[objectName][fullname].currentIndex = index;
            can.Model[objectName][fullname][index] = $.Deferred();
            can.Model[objectName][fullname][index].resolve(this);
        }

    });
    can.extend(can.Map.prototype, {
        init: function () {

        },
        store: function () {
            var index = "",
                objectName = "deferred_findOne";
            $.jStorage.set(this.constructor._fullName, this.serialize());
            can.Model[objectName] = can.Model[objectName] || {};
            can.Model[objectName][this.constructor._fullName] = can.Model[objectName][this.constructor._fullName] || {};
            can.Model[objectName][this.constructor._fullName].currentIndex = index;
            can.Model[objectName][this.constructor._fullName][index] = $.Deferred();
            can.Model[objectName][this.constructor._fullName][index].resolve(this);
        },
        flush: function (donotflushArray) {
            var self = this,
                attributes = null,
                key = null,
                donotflushArray = donotflushArray || [];
            if ($.jStorage.get(this.constructor._fullName)) {
                $.jStorage.deleteKey(this.constructor._fullName);
            }
            attributes = this.attr();
            for (key in attributes) {
                if (attributes.hasOwnProperty(key) && donotflushArray.indexOf(key)) {
                    self.removeAttr(key);
                }
            }
        },
        findLivebindingsInDom: function (domElements) {
            var self = this,
                nodelist = can.$(domElements);
            self.lateLiveBinding = {};
            nodelist.each(function () {
                var el = $(this),
                    data = el.data();
                if (!self.lateLiveBinding[data.bindingobj]) {
                    self.lateLiveBinding[data.bindingobj] = {};
                }
                self.lateLiveBinding[data.bindingattr] = {
                    type: data.bindingtype,
                    element: el,
                    classname: data.classname
                };
            });
        },
        findChildByBindingAttr: function (bindingAttr, removeLast) {
            if (removeLast) {
                bindingAttr = bindingAttr.substr(0, bindingAttr.lastIndexOf("."));
            }
            bindingAttr = "[\"" + bindingAttr.replace(/\./g, "\"][\"") + "\"]";
            return eval("this" + bindingAttr);
        },
        bindLateLiveBinding: function () {
            var self = this;
            this.bind('change', function (ev, attr, how, newVal, oldVal) {
                var className,
                    attrName;
                if (self.lateLiveBinding[attr]) {
                    if (self.lateLiveBinding[attr].type === "tag") {
                        self.lateLiveBinding[attr].element.html(newVal);
                        self.lateLiveBinding[attr].element.addClass("changed");
                    } else if (self.lateLiveBinding[attr].type === "class") {
                        className = self.lateLiveBinding[attr].classname || attr.substr(attr.lastIndexOf(".") + 1);
                        if (newVal) {
                            self.lateLiveBinding[attr].element.addClass(className);
                        } else {
                            self.lateLiveBinding[attr].element.removeClass(className);
                        }
                    } else if (self.lateLiveBinding[attr].type.indexOf("attr-") === 0) {
                        attrName = self.lateLiveBinding[attr].type.substr(self.lateLiveBinding[attr].type.indexOf("-") + 1);
                        self.lateLiveBinding[attr].element.attr(attrName, newVal);
                    }
                }
            });
        },
        /*
         * Better Delegate Late binding function
         * @param DOM ELEMENTS , callback function
         * @author Toni Meuschke <meuschke@lieferando.de>
         */
        bindLateLiveBindingNew: function (elements, func) {
            var data,
                self = this;
            $.each(elements, function (v, i) {
                data = $(i).data();
                if (data.bindingattr) {
                    self.delegate(data.bindingattr, "change", function (ev, prop, how, newVal, oldVal) {
                        if (typeof func === 'function') {
                            func($(i), ev, prop, how, newVal, oldVal, this, self);
                        }
                    });
                }
            });
        },
        specialSort: function (method, comp, silent) {
            var comparator = comp || this.comparator,
                args = method ? [method] : [function (a, b) {
                    a = a[comparator];
                    b = b[comparator];
                    return a === b ? 0 : (a < b ? -1 : 1
                        );
                }],
                res = [].sort.apply(this, args);
            !silent && can.trigger(this, "reset");
        },
        cache: function () {
            var index = "",
                objectName = "deferred_findOne",
                fullname = this.constructor._fullName;
            can.Model[objectName] = can.Model[objectName] || {};
            can.Model[objectName][fullname] = can.Model[objectName][this.constructor._fullName] || {};
            can.Model[objectName][fullname].currentIndex = index;
            can.Model[objectName][fullname][index] = $.Deferred();
            can.Model[objectName][fullname][index].resolve(this);
        },
        /**
         * Wrapper around attr function Lazy Load attributes that stored as external json links
         * Load data and replace json link by loaded result if data is valid json data
         * attr:'http://somedomain.com/data.json'
         * @param attributeName{String} attr name
         * @param success{function}  success handler
         * @param error{function}  error handler
         * @result{Object|can.Deferred} - return Deffered if attr is external reference or data if attr is local
         */
        fetchAttr: function (attributeName, success, error) {
            var self = this,
                urlReference = self.tryGetReference(attributeName),
                _localValue, _list,
                deferredResult = {isOk: false},
                _defferred;
            if (urlReference.isOk) {
                deferredResult = self.tryUpdateDeferredForAttr(attributeName, success, error);
                _defferred = deferredResult.result;
                if (deferredResult && deferredResult.isOk && deferredResult.result) {
                    return _defferred;
                } else {
                    self['__' + attributeName + '_url'] = urlReference;
                    if (urlReference && urlReference.isOk && urlReference.result) {
                        can.ajax({
                            type: "GET",
                            url: urlReference.result,
                            success: function (data) {
                                if (!can.isArray(data)) {
                                    self.attr(attributeName, data);
                                    _defferred.resolveWith(self, data);
                                } else {
                                    _list = new can.List(data);
                                    self.attr(attributeName, _list.slice());
                                    _defferred.resolveWith(self, data);
                                }

                                self.removeDeferredForAttr(attributeName);
                            },
                            error: function () {
                                _defferred.rejectWith(self, Array.prototype.slice.apply(arguments));
                                self.removeDeferredForAttr(attributeName);
                            }
                        });
                    } else {
                        _defferred.rejectWith(self, arguments);
                        steal.dev.log('invalid reference');
                    }
                }
                return _defferred;
            } else {
                _localValue = self.attr(attributeName);
                if (_localValue) {
                    if (typeof success === 'function') {
                        success(_localValue);
                    }
                } else {
                    if (typeof error === 'function') {
                        error(self, arguments);
                    }
                }
                return _localValue;
            }
        },
        /**
         * Check that attr have external reference to json file.
         * Note only link format  testing no data load.
         *@param attributeName{String} - attr name for testing
         */
        tryGetReference: function (attributeName) {
            var self = this,
                len,
                _reference = self.attr(attributeName),
                result = {isOk: false, result: null};
            if (typeof _reference === 'string') {
                _reference = _reference.replace(/^\s\s*/, '').replace(/\s\s*$/, '');  //trim
                len = _reference.length;
                if (len > 15 &&  /// length of http://a/a.json
                    (_reference.indexOf('http') === 0
                        ) && _reference.indexOf('.json') === len - 5) {
                    result = {isOk: true, result: _reference};
                }
            }
            else {
                result = {isOk: false, result: _reference};
            }
            return result;
        },
        isReference: function (attributeName) {
            return this.tryGetReference(attributeName).isOk;
        },
        /**
         * Helper method to create shared deferred object . Deferred object is created for each attribute
         * @param attributeName
         * @param success
         * @param error
         * @returns {*}
         */
        initDeferredForAttr: function (attributeName, success, error) {
            var deferred = can.Deferred(),
                self = this,
                succesCalls = [],
                errorCalls = [];
            self['__deffered' + attributeName + '__'] = deferred;

            succesCalls = self['__deffered_succes' + attributeName + '__'] = (typeof success === 'function'
                ) ? [success] : [];
            deferred.done(succesCalls);
            errorCalls = self['__deffered_succes' + attributeName + '__'] = (typeof error === 'function'
                ) ? [error] : [];
            deferred.fail(errorCalls);
            return deferred;
        },
        /**
         * Clean up deferred object information
         * @param attributeName
         */
        removeDeferredForAttr: function (attributeName) {
            var self = this;
            delete self['__deffered' + attributeName + '__'];
            delete self['__deffered_succes' + attributeName + '__'];
            delete self['__deffered_succes' + attributeName + '__'];
        },
        /**
         * Upsert method that update or init deffered object
         * @param attributeName
         * @param succes
         * @param error
         * @returns {{isOk: boolean, result:can.Deferred}} - status object isOk : true - update operation ,
         *  false - new deferred have created
         */
        tryUpdateDeferredForAttr: function (attributeName, succes, error) {
            var self = this,
                _deferred = self['__deffered' + attributeName + '__'],
                succesCalls = [],
                errorCalls = [],
                result = {isOk: false};
            if (_deferred) {
                if (typeof succes === 'function') {
                    succesCalls = self['__deffered_succes' + attributeName + '__'] || [];
                    succesCalls.push(succes);
                    _deferred.done(succesCalls);
                }
                if (typeof error === 'function') {
                    errorCalls = self['__deffered_error' + attributeName + '__'] || [];
                    errorCalls.push(error);
                    _deferred.fail(errorCalls);
                }
                result = {isOk: true, result: _deferred};
            }
            else {
                result = {isOk: false, result: self.initDeferredForAttr(attributeName, succes, error)};
            }
            return result;
        },
        /**
         *
         * Validate a email serverside
         *
         */

        emailValidation: function (email, attr, invalidAttr) {
            var self = this;
            invalidAttr = invalidAttr || "emailFail";
            if (!self._oldFailMail || self._oldFailMail !== email) {
                self._oldFailMail = email;
                clearTimeout(self._emailTimer);
                self._emailTimer = setTimeout(function () {
                    can.ajax({
                        url: Yd.config.api + Yd.config.version + "/customer/checkemail",
                        data: {"email": email},
                        dataType: Yd.config["ajax-data-type"],
                        success: function (data) {
                            if (data.status === "UNKNOWN") {
                                self.attr(invalidAttr, data.status);
                            } else if (data.status === "INVALID") {
                                self.attr(invalidAttr, data.status);
                            } else if (data.status === "BLACKLISTED") {
                                self.attr(invalidAttr, data.status);
                            } else if (data.status === "MODIFIED") {
                                confirm('', {
                                    html: can.view.render("//yd/library/views/ModifyEmail.ejs", {
                                        oldMail : email,
                                        modifiedEmail: data.address
                                    })
                                }, function (confirm) {
                                    if (confirm) {
                                        self.attr(attr, data.address)
                                    }
                                    self.attr(invalidAttr, false);
                                });
                            } else {
                                self.attr(invalidAttr, false);
                            }
                        }
                    });
                }, 1300);
            }
        }
    });
});
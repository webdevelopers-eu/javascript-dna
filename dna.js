/**
 * Javascript DNA 1.0
 *
 * Minimalistic asynchronous script loader, dependency resolver and
 * framework base. No bullshits.
 *
 * @license The MIT License (MIT), https://github.com/webdevelopers-eu/javascript-dna
 * @preserve Copyright (c) 2016 Daniel Ševčík, www.webdevelopers.eu
 */
'use strict';
if (typeof jQuery != 'function') throw new Error('DNA requires jQuery');

(function($, window) {
    var settings = { // Use dna(SETTINGS) to modify this variable (calls internally dna['core'].set(SETTINGS))
        'rewrite': [
        ],
        'downloader': {
            'javascript': function (dfd, url, config) {
                dfd.resolve(url.replace(/^javascript:/, ''));
            },
            '*': function (dfd, url, config) {
                $.ajax({
                    'url': url,
                    'dataType': 'text',
                    'cache': true,
                    'type': 'GET',
                    'async': true,
                    // 'xhrFields': {
                    //     onprogress: function (e) {
                    //         console.log('progress', e);
                    //         if (e.lengthComputable) {
                    //             // dfd.notify(parseInt(e.loaded / e.total * 100), 10);  // notify as a factor of the event object
                    //             console.log('progress', parseInt(e.loaded / e.total * 100), e);  // notify as a factor of the event object
                    //         }
                    //     }
                    // },
                    'headers': {
                        'X-Requested-With': 'DNA'
                    }
                })
                    .done(function(doc) {
                        dfd.resolve(doc);
                    })
                    .fail(function(jqXHR, textStatus, errorThrown) {
                        dfd.reject.call(this, new DNAError('Download "' + url + '" failed: ' + jqXHR.status + ' ' + textStatus + ' ' + errorThrown, 606, {'config': config, 'xhr': jqXHR, 'textStatus': textStatus,  'error': errorThrown}));
                    });

                return true;
            }
        },
        'factory': { // Methods to evaluate scripts based on config.eval value
            'dna': function(dfd, jString, protoName, config) {
                protoName = protoName ? protoName : 'undefined';
                var evalStr = jString + '\n\n/* Javascript DNA: Compat Layer */;\n' + 'typeof ' + protoName + ' == \'undefined\' ? undefined : ' + protoName;
                try {
                    dfd.resolve(function(context) {
                        return context == window ? window.eval(evalStr) :  (function () {return eval(evalStr);}).call(context);
                    }(config._context));
                } catch (e) {
                    dfd.reject(new DNAError('Failed to evaluate the script: ' + (e.message || e), 610, e));
                }
            },
            'deferred': function(factory, jString, protoName, config) {
                (function(factory) {config.context == window ? window.eval(jString) : eval(jString);}(factory));
            }
        }
    };
    var console = window.console || {'log': (function() {})}; console.error = console.error || console.log;
    var installed = [];
    var contexts = {};

    /**
     * @param {...(string|function|object|array)} arguments
     *          string: proto name to initialize or URL of JSON file with DNA configurations
     *          function: callback after proto initialization,
     *          object: DNA configuration
     *          array: array of other aforementioned parameters
     * @return {Promise}
     */
    var dna = function() {
        var args = arguments;
        var dfd = $.Deferred()
                .done(function() {
                    $(window).trigger('dna:done', [{'dnaArguments': args, 'arguments': arguments}]);
                })
                .fail(function() {
                    $(window).trigger('dna:fail', [{'dnaArguments': args, 'arguments': arguments}]);
                })
                .always(function() {
                    $(window).trigger('dna:always', [{'dnaArguments': args, 'arguments': arguments}]);
                });
        var reject = function() {dfd.reject.apply(this, arguments);};
        var opts = dna['core'].getOpts(arguments, [
            {'recursive': true, 'match': 'array'},
            ['jsonURLs', /\//],
            ['required', 'string'],
            ['settings', function(arg) {return $.isPlainObject(arg) && !arg.proto && !arg.id;}],
            ['configs', 'plainObject'],
            ['callbacks', 'function']
        ]);
        opts.settings.forEach(dna['core'].set);
        if (opts.jsonURLs.length + opts.required.length + opts.configs.length == 0) { // empty args
            dna['core'].checkQueue();
            return dfd.resolve().done(opts.callbacks).promise();
        }
        try {
            opts.configs.forEach(dna['core'].configure.bind(dna['core']));
            $.when.apply(this, opts.jsonURLs.map(rewriteURL).map(download)) // Resolve 'jsonURLs': download JSON configs
                .done(function() {
                    // Format downloaded Configs with added config.baseURL
                    var args = $.makeArray(arguments).map(function(v, k) {
                        return dna['core']
                            .getOpts($.parseJSON(v), [['configs', 'plainObject'], 'recursive'])
                            .configs
                            .map(function(config) {
                                config.baseURL = opts.jsonURLs[k];
                                return config;
                            });
                    });
                    // insert JSON configs
                    dna(args)
                        .done(function() {
                            dna['core'].whenSatisfied(opts.required) // whenSatisfied checks whole queue
                                .done(function() {
                                    $.when.apply(this, opts.required.map(function(name) { // Resolve 'require'
                                        return dna['core'].require(name);
                                    }))
                                        .done(opts.callbacks, function() {
                                            dfd.resolve.apply(this, arguments);
                                        })
                                        .fail(reject);
                                })
                                .fail(reject);
                        })
                        .fail(reject);
                })
                .fail(reject);
        } catch (e) {
            dfd.reject(new DNAError(e));
        }

        return dfd.promise();
    };

    /**
     * To allow pushing of data to dna variable before dna() is really loaded.
     *
     * var dna = dna || [];
     * dna.push(['service1', callback]);
     *
     * Note: This method does not return Promise object. It supports
     * only success-callbacks passed as parameters (see dna() arguments).
     *
     * @param {mixed...} argument
     * @return {integer} number of queue/unresolved requests;
     */
    install('push', function() {
        dna.apply(this, arguments);
        return dna['core'].queue.length;
    });


    /**
     *  The dna['core'] service.
     */
    function DNACore() {
        this.queue = [];
        this.configs = [];
        this.resources = {};
    };

    /** @type {string} */
    DNACore.prototype.version = '1.0';

    /** @type {array} */
    DNACore.prototype.queue = null; // assigning [] would cause to share this accross instances - not sure if we want it

    /** @type {array} */
    DNACore.prototype.configs = null; // assigning [] would cause to share this accross instances - not sure if we want it

    /** @type {object} */
    DNACore.prototype.resources = null; // assigning {} would cause to share this accross instances - not sure if we want it

    /**
     * Resolve relative URL path
     *
     * Examples:
     *
     * dna['core'].resolveURL('file#hash')
     * - result: "https://example.org/file#hash" resolved to current document
     *
     * dna['core'].resolveURL('file#hash', '/directory/', 'https://example.org')
     * - result: "https://example.org/directory/file#hash
     *
     * @param {string...} url Any URL to resolve
     * @return {string} Absolute URL
     */
    DNACore.prototype.resolveURL = function() {
        var doc = document.implementation.createHTMLDocument( 'html', '', '');
        var base = doc.head.appendChild(doc.createElement('base'));
        var link = doc.body.appendChild(doc.createElement('a'));
        var url = location ? location.href : 'https://no-location-href.example.com/';
        for (var i = arguments.length - 1; 0 <= i; i--) {
            if (typeof arguments[i] == 'string' && arguments[i].length) {
                base.setAttribute('href', url);
                link.setAttribute('href', arguments[i]);
                url = link.href;
            }
        }
        return url;
    };

    /**
     * Set various settings. Example:
     *  dna['core'].set({
     *          'factory': {EVAL_TYPE: callback(dfd, jScript, config), ...},
     *          'rewrite': [callback(currentURI, originalURI), ...],
     *          'downloader': {SCHEME: callback(dfd, uri), ...}
     * });
     *
     * @param {object} obj Plain object with DNA settings.
     * @return {undefined}
     */
    DNACore.prototype.set = function(obj) {
        $.each(obj, function(k, v) {
            switch (k) {
            case 'factory':
                // we don't want people to mess with standard evals - they should define their own
                delete v.dna;
                settings[k] = $.extend(settings[k], v);
                break;
            case 'downloader':
                delete v['*']; // protect default downloader - let people define their own
                settings[k] = $.extend(settings[k], v);
                break;
            case 'rewrite':
                settings[k] = settings[k].concat(v);
                break;
            default:
                settings[k] = v;
            }
        });
        console.log('DNA: Settings altered.', settings);
    };


    /**
     *  config := {
     *      [ "id": ID, ] // required if `service` AND `proto` was not specified
     *      [ "service": QNAME, ] // requires `proto` specified
     *      [ "proto": QNAME, ]
     *      [ "require": QNAME | ID | [ QNAME | ID, ... ], ]
     *      [ "load": URL | URL#ID | [ URL | URL#ID, ... ], ]
     *      [ "eval": "dna" | "window" ]
     *  }
     */
    DNACore.prototype.configure = function(config) {
        var idOK = false;
        config = $.extend({}, config); // clone it so later modification to the object does not do mass

        // IDs must not contain [/] because we recognize dna()'s JSON URLs by those characters
        if (config.id) idOK = validateString(config.id, /^[a-zA-Z0-9_:@#$*.-]+$/i, 'Invalid `id` name in ' + JSON.stringify(config) + '.');
        if (config.service) idOK = validateString(config.service, /^[a-zA-Z0-9_:@#$*.-]*$/, 'Invalid `service` name in ' + JSON.stringify(config) + '.');
        if (config.proto) idOK = validateString(config.proto, /^[A-Z][a-zA-Z0-9_]*(=[a-zA-Z0-9_:@#$*.-]+)*$/, 'Invalid `proto` name in ' + JSON.stringify(config) + '.');

        if (!idOK) $.error('At least one must be specified `id` or `service` or `proto` in Config ' + JSON.stringify(config));
        if (config.service && !config.proto) $.error('Service "' + config.service + '" requires the `proto` property: ' + JSON.stringify(config));

        // Only minimal fast cleaning of IDs so we can find the config.
        // Thorough cleanup is done when downloading
        cleanConfigFast(config);

        [config.id, config.service]
            .concat(config.proto.slice(config.proto.length > 1 ? 1 : 0))
            .forEach(function (name) {
                if (name) {
                    if (typeof dna[name] == 'undefined') {
                        dna[name] = null;
                    } else {
                        var conflictConfig = dna['core'].getConfig(name);
                        var msgs =  ['DNA: Conflicting property `dna["' + name + '"]`.'];
                        if (dna[name] && $.inArray(name, installed) == -1) {
                            msgs.push('YOU MUST NOT MODIFY `dna` PROPERTIES DIRECTLY! The existing `dna["' + name + '"]` property was not installed as standard DNA module.');
                        } else {
                            if (conflictConfig) {
                                msgs.push('Conflicting config exists: ' + JSON.stringify(conflictConfig) + '.\nNote: All `id`, `proto` and `service` names must be unique accross the board.');
                            } else {
                                msgs.push('Conflicting special DNA core property: dna["' + name + '"]. Name `' + name + '` is reserved.');
                            }
                        }
                        $.error(msgs.join('\n'));
                    }
                }
            });

        this.configs.push(config);
    };

    /**
     * Check if we have all Configs loaded to satisfy given requirement.
     *
     * Example:
     *   dna['core'].canSatisfy(['Proto1', 'service2']);
     *
     * @param {array} requirements Array of names or ids
     * @return {boolean} false: missing configs, true: all required configs to satisfy the requirement available
     */
    DNACore.prototype.canSatisfy = function(requirements, stack) {
        if (typeof requirements == 'undefined' || requirements.length == 0) return true; // undefined

        stack = stack || [];
        for (var i in requirements) {
            if ($.inArray(requirements[i], stack) !== -1) {
                throw new DNAError('DNA: Recursive requirement loop: ' + stack.join(' > ') + ' > ' + requirements[i], 601, {'requirements': requirements, 'stack': stack});
            }
            var config = this.getConfig(requirements[i]);

            if (!config) {
                return false;
            }
            if (config.eval && !settings.factory[config.eval]) {
                return false;
            }

            var nextStack = stack.slice();
            nextStack.push(requirements[i]);
            if (!this.canSatisfy(config.require, nextStack)) {
                return false;
            }
        }
        return true;
    };

    /**
     * Run callbacks and resolve returned Deferred when we have enough
     * configuration information to resolve all requirements.
     *
     * Example:
     *   dna['core'].whenSatisfied('Proto1', ['Proto2', 'service3']).done(canDo);
     *
     * @param {array|string|callback...} arguments
     * @return {Deferred}
     */
    DNACore.prototype.whenSatisfied = function() {
        var dfd = $.Deferred();
        var newOpts  = dna['core'].getOpts(arguments, [
            ['requirements', 'string'],
            ['callbacks', 'function'],
            'recursive'
        ]);
        newOpts._dfd = dfd;
        this.queue.push(newOpts);
        this.checkQueue();
        return dfd;
    };

    DNACore.prototype.checkQueue = function() {
        for (var i = this.queue.length - 1; 0 <= i; i--) {
            var opts = this.queue[i];
            try {
                var can = this.canSatisfy(opts.requirements);
            } catch (e) {
                this.queue.splice(i, 1);
                opts._dfd.reject(new DNAError(e));
                break;
            }

            if (can) {
                this.queue.splice(i, 1);
                $(opts.callbacks).each(function(k, callback) {
                    callback();
                });
                opts._dfd.resolve(opts);
            } else {
                console.log('DNA: Queued action #' + (i + 1) + '/' + this.queue.length + ': Waiting for yet undefined requirements: ' + opts.requirements.join(', '));
            }
        }
    };

    DNACore.prototype.getConfig = function (name) {
        for (var i = 0; i < this.configs.length; i++) {
            var c = this.configs[i];
            if (c.id == name || c.service == name || $.inArray(name, c.proto, c.proto.length > 1 ? 1 : 0) !== -1) {
                return readyConfig(c);
            }
        }
        return null;
    };


    /**
     * Categorize unsorted function arguments according to argument types or other rules.
     *
     * Examples:
     *
     * // Unsorted parameters
     * dna['core'].getOpts(['10px', 'right'], [
     *     ['width', /px$/],
     *     ['position', /top|right/]
     * ]); // Result: {"width":["10px"],"position":["right"]}
     *
     * // Switched order of parameters
     * dna['core'].getOpts(['right', '10px'], [
     *     ['width', /px$/],
     *     ['position', /top|right/]
     * ]); // Result: {"width":["10px"],"position":["right"]}
     *
     * // More advanced
     * dna['core'].getOpts(['10px', {'position': 'bottom', 'newAttr': 'some value'}, ['top', 'right', '1234']], [
     *     {'match': ['array', 'plainObject'], 'recursive': true},
     *     {'name': 'width', 'match': [/px$/, 'numeric']},
     *     ['obj', 'object'],
     *     ['position', /top|right/],
     *     ['other', '*']
     * ]); // Result: {"width":["10px"],"obj":[],"position":["bottom","top","right"],"other":["1234"],"newAttr":["some value"]}
     *
     * dna['core'].getOpts(['10px', {'position': 'bottom', 'newAttr': 'some value'}, ['top', 'right', '1234']], [
     *     ['strings', 'string'],
     *     'recursive'
     * ]); // Result: {"strings":["10px","bottom","some value","top","right","1234"]}
     *
     *
     * Syntax of capture object:
     *
     * capture: [
     *    [NAME,  MATCH],
     *    {'name': NAME, 'match': MATCH},
     *    {'match': MATCH, 'recursive': true},
     *    'recursive', // alias for {'match': '*', 'recursive': true},
     *    ...
     * ]
     * MATCH := MATCHER | [MATCHER, MATCHER, ...]
     *
     * MATCHER := '*' | 'array' | 'boolean' | 'date' | 'error' |
     * 'function' | 'null' | 'number' | 'object' | 'regexp' | 'string'
     * | 'undefined' | 'xmlDocument' | 'plainObject' | 'emptyObject' |
     * 'array' | 'numeric' | /REGEXP/ | CALLBACK
     *
     * Rule: First match wins (argument will be assigned only to first matching group)
     *
     * @param {array} args Arguments to group
     * @param {array} capture Definition of capture groups
     * @return {object} with associated lists of values
     */
    DNACore.prototype.getOpts = function(args, capture) {
        // Normalize capture & init groups
        var groups = {};
        capture.forEach(function(v, k) {
            if (capture[k] == 'recursive') {
                capture[k] = {'match': '*', 'recursive': true};
            }
            if ($.isArray(capture[k])) {
                capture[k] = {'name': capture[k][0], 'match': capture[k][1]};
            }
            if (typeof capture[k] != 'object') {
                $.error('Capture item must be of type object or array.');
            }
            if (!$.isArray(capture[k].match)) {
                capture[k].match = [capture[k].match];
            }
            if (!capture[k].recursive) {
                groups[capture[k].name] = [];
            }
        });

        $.each($.makeArray(args), (function(k, arg) {
            if (!getOptsCategorize(arg, capture, groups)) {
                $.error('Unexpected opt (' + (typeof arg) + ') ' + arg);
            }
        }).bind(this));

        return groups;
    };


    /**
     * Add arg to appropriate groups based on capture rules.
     *
     * @param {mixed} arg Anything
     * @param {array} capture List of rules to match arg
     * @param {object} groups named list of groups to assign arg to
     * @return {boolean} false if argument didn't match anything, true if it was assigned to group
     */
    function getOptsCategorize(arg, capture, groups) {
        var types = [$.type(arg)];

        if ($.isPlainObject(arg)) types.push('plainObject');
        if ($.isNumeric(arg)) types.push('numeric');
        if ($.isXMLDoc(arg)) types.push('xmlDocument');

        return capture.some(function(v, k) {
            var matches = capture[k].match.some(function(matcher) {
                return getOptsMatch(arg, matcher, types);
            }, this);

            if (!matches) return false;

            if (capture[k].recursive) {
                if ($.isPlainObject(arg)) {
                    $.each(arg, function(k, v) {
                        if (!groups[k]) groups[k] = [];
                        groups[k].push(v);
                    });
                } else {
                    $.each(arg, (function(k, v) {
                        getOptsCategorize(v, capture, groups);
                    }).bind(this));
                }
            } else {
                groups[capture[k].name].push(arg);
            }
            return true;
        }, this);
    };


    /**
     * Does the value  match given rule?
     *
     * @param {mixed} arg Anything
     * @param {mixed} match Rule
     * @param {array} types List of arg's types in case we match the type (match is of type string)
     * @return {boolean} true matches, false does not match
     */
    function  getOptsMatch(arg, match, types) {
        switch (typeof match) {
        case 'function':
            return match(arg);
        case 'object': // RegExp
            return $.inArray('string', types) !== -1  && match.test(arg);
        case 'string':
            return match == '*' || $.inArray(match, types) !== -1;
        default:
            $.error('Cannot parse opts. Unexpected match type "' + typeof match + '"');
        }
        return false;
    };


    DNACore.prototype.require = function() {
        return requireMulti.call(this, $.makeArray(arguments), []);
    };

    function requireMulti(args, stack) {
        var promises = [];
        try {
            dna['core'].getOpts(args, [['names', 'string'], 'recursive']).names
                .forEach((function(name) {
                    promises.push(requireSingle.call(this, name, stack));
                }).bind(this));
        } catch (e) {
            return $.Deferred().reject(new DNAError(e)).promise();
        }

        return $.when.apply(this, promises);
    };


    function requireSingle(name, stack) {
        var config, promises = [], dfd = $.Deferred();

        if ($.inArray(name, stack) != -1) {
            $.error('DNA: Recursive requirement: ' + stack.join(' > ') + ' > ' + name + ' (recursion)');
        }
        stack.push(name);

        config = dna['core'].getConfig(name);
        if (!config) $.error('DNA: Cannot satisfy the requirement "' + name + '"');

        if (config._dfd) return config._dfd; // Already pending resolution of this Config
        config._dfd = dfd.promise();

        promises.push(downloadResources(config)); // Must be first among promises because we capture the first returned parameter (proto object) in $.when(promises) bellow
        promises.push(requireMulti.call(this, [config.require], stack));

        $.when.apply(this, promises).done(function(scripts) {
            var val;
            evaluateScripts(scripts, config)
                .done(function(proto) {
                    // Install objects
                    if (config.proto[0]) {
                        if (proto) {
                            $.each(config.proto.slice(config.proto.length > 1 ? 1 : 0), function(k, v) {
                                install(v, proto);
                            });
                        } else {
                            dfd.reject(new DNAError('DNA: Cannot find the Proto object window["' + config.proto + '"]: ' + JSON.stringify(config), 602, {'config': config}));
                        }
                    }
                    if (proto && config.service) {
                        install(config.service, new proto);
                    }
                    if (config.id == name) {
                        val = config;
                    } else if (dna[name]) {
                        val = dna[name];
                    }

                    if (val) {
                        dfd.resolve(val);
                    } else {
                        dfd.reject(new DNAError('DNA: Cannot find the requested object dna["' + name + '"]: ' + JSON.stringify(config), 603, {'config': config}));
                    }
                })
                .fail(function() {
                    dfd.reject.apply(this, arguments);
                });
        }).fail(function() {
            dfd.reject.apply(this, arguments);
        });

        return config._dfd;
    };


    function downloadResources(config) {
        var urls = dna['core'].getOpts(config.load, [['urls', 'string'], 'recursive']).urls;

        var promises = [];
        urls.forEach(function(url) {
            promises.push(loadGetResource(url, config));
        });

        var dfd = $.Deferred();
        $.when.apply(this, promises)
            .done(function() {
                var scripts = [];
                for (var i = 0; i < arguments.length; i++) {
                    scripts.push(arguments[i]);
                }
                dfd.resolve(scripts);
            })
            .fail(function() {
                dfd.reject.apply(this, arguments);
            });

        return dfd;
    };

    // Evaluates downloaded scripts from the same config
    function evaluateScripts(scripts, config) {
        var proto, dfd = $.Deferred();

        // Note - there is a risk of running too deep recursively - tested in Chromium with dep chain of 100 items with 32 loaded files for each item
        function evaluate(script) {
            if (!script) {
                if (scripts.length) {
                    return dfd.reject(new DNAError('Scripts queue is not empty and we got no data!', 607, {'script': script, 'queue': scripts}));
                } else {
                    return dfd.resolve(proto); // most / last script - resolve main dfd
                }
            }
            var factory = settings.factory[config.eval || 'dna'];
            var dfdEval = $.Deferred()
                    .done(function(captured) {
                        proto = captured || proto;
                        evaluate(scripts.shift());
                    })
                    .fail(function(e) {
                        dfd.reject(new DNAError('Evaluation of the script failed.', 608,  e));
                    });
            if (typeof factory != 'function') {
                return dfdEval.reject(new DNAError('Unknown evaluation type "' + config.eval + '"', 604, config));
            }
            try {
                factory(dfdEval, script, config.proto[0], config);
            } catch (e) {
                return dfdEval.reject(new DNAError(e));
            }
            return dfdEval;
        };
        evaluate(scripts.shift());

        return dfd;
    }

    function loadGetResource(url, config) {
        var dfd = $.Deferred();
        var isHTTP = url.match(/^https?:/);
        var parts = isHTTP ? url.split('#') : [url]; // to support other schemes like 'javascript:'
        var callback;

        callback = function(string) {
            if (parts.length == 1) { // Javascript
                dfd.resolve(string + (isHTTP ? ' //# sourceURL=' + url + '#dna' : ''));
                return;
            }
            // HTML
            var doc = document.implementation.createHTMLDocument( 'html', '', '');
            doc.childNodes[1].innerHTML = string;
            try {
                var $script = $('#' + parts[1], doc);
                if (!$script.length) throw 'Bundled resource "#' + parts[1] + '" not found in "' + url + '"';
            } catch (e) {
                dfd.reject(new DNAError('Cannot extract resource "#' + parts[1] + '" from bundle "' + url + ': ' + (e.message || e), 609, e));
                return;
            }
            var jString = $.trim($script.text());

            if (jString.length) {
                dfd.resolve(jString + ' //# sourceURL=' + url);
            } else if ($script.attr('src')) {
                var linkURL = $script.get(0).src || $script.attr('src') ||
                        $script.get(0).href || $script.attr('href');
                if (!linkURL) {
                    dfd.reject(new DNAError('The script "' + url + '" has no contents and no reference to other external resource.', 605, {'script': $script.get(0), 'source': string, 'url': url}));
                } else {
                    loadGetResource(dna['core'].resolveURL(linkURL, url), config)
                        .done(function() {
                            dfd.resolve.apply(this, arguments);
                        })
                        .fail(function() {
                            dfd.reject.apply(this, arguments);
                        });
                }
            } else {
                dfd.reject(404, 'Cannot load script "' + url + '"');
            }
        };

        download(parts[0], config)
            .done(callback)
            .fail(function() {
                dfd.reject.apply(this, arguments);
            });

        return dfd;
    }

    function validateString(string, pattern, error) {
        if (!string || !pattern.test(string)) {
            $.error('DNA: ' + error + ' String ' + JSON.stringify(string) + ' does not match the pattern ' + pattern);
        }
        return true;
    }

    function download(url, config) {
        if (dna['core'].resources[url]) {
            return dna['core'].resources[url];
        }

        var dfd = $.Deferred();
        dna['core'].resources[url] = dfd.promise();

        // RFC 2396, Appendix A: scheme = alpha *( alpha | digit | "+" | "-" | "." )
        var scheme = url.match(/^([a-z][a-z0-9+.-]*):/i)[1];

        dfd.fail(function(e) {new DNAError(e);}); // write to console

        if (!settings.downloader[scheme] || settings.downloader[scheme](dfd, url, config) === false) {
            settings.downloader['*'](dfd, url, config);
        }

        return dna['core'].resources[url];
    };

    // There are two rewrite entry points:
    // - JSON-config URL
    // - config's load property
    function rewriteURL(url, baseURL) {
        var urlIn = url;
        settings.rewrite.forEach(function(cb) {
            url = cb(url, urlIn) || url;
        });
        url = dna['core'].resolveURL(url, baseURL);
        return url;
    }

    function cleanConfigFast(config) {
        delete config._clean;
        config.proto = config.proto ? config.proto.split('=') : []; // support aliasing Proto=Alias=Alias2...
        return config;
    }

    function readyConfig(config) {
        if (config._ready) return config;

        delete config._dfd;

        config.load = dna['core']
            .getOpts(config.load, [['urls', 'string'], 'recursive'])
            .urls
            .map(function(url) {
                return rewriteURL(url, config.baseURL);
            });

        if ($.type(config.require) !== 'array') {
            config.require = config.require ? [config.require] : [];
        }

        if ($.type(config.load) !== 'array') {
            config.load = config.load ? [config.load] : [];
        }

        // Context - could we use yield for that?
        config.context = config.context || false;
        if (config.context === 'window') {
            config._context = window;
        } else {
            config._context = config.context && contexts[config.context] || {};
        }
        if (config.context) {
            contexts[config.context] = config._context;
        }

        config._ready = true;

        return config;
    }

    function install(property, obj) {
        dna[property] = obj;
        installed.push(property);
    }

    function DNAError(info, code, detail) {
        if (info instanceof Error) {
            this.name = info.name || 'DNAError';
            this.message = info.message || 'Unknown Error.';
            this.code = info.code || 700;
            this.detail = info.detail || info;
        } else {
            this.name = 'DNAError';
            this.message = info || 'Ups!';
            this.code = code || 700;
            this.detail = detail;
        }

        if (detail instanceof DNAError || $.type(detail) == 'error') {
            this.stack = detail.stack;
        } else {
            this.stack = (new Error()).stack;
        }

        if (!(detail instanceof DNAError)) {
            console.error('DNAError #' + this.code + ': ' + info, detail, this.stack);
        }
    }
    DNAError.prototype = Object.create(Error.prototype);
    DNAError.prototype.toString = function() {return 'DNAError';};
    DNAError.prototype.constructor = DNAError;

    install('Error', DNAError);
    install('core', new DNACore);
    console.log('DNA: Ready.');

    var initQueue = window.dna || [];  // replace optional queue of calls with reall object
    window.dna = dna;

    // Resolve calls to dna() made before dna loaded
    // using `dna = dna || []; dna.push(args);`
    for (var i = 0; i < initQueue.length; i++) {
        window.dna.apply(this, [initQueue[i]]);
    }
})(jQuery, window);

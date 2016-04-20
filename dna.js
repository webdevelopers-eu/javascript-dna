/**
 * Javascript DNA 1.0
 *
 * Minimalistic asynchronous script loader, dependency resolver and
 * framework base. No bullshits.
 *
 * The MIT License (MIT)
 * Copyright (c) 2016 Daniel Ševčík, www.webdevelopers.eu
 */
'use strict';
if (typeof jQuery != 'function') throw new Error('DNA requires jQuery');

(function($, window) {
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
                .done(function() {$(window).trigger('dna:done', [{'dnaCallArguments': args, 'callbackCallArguments': arguments}]);})
                .fail(function() {$(window).trigger('dna:fail', [{'dnaCallArguments': args, 'callbackCallArguments': arguments}]);})
                .always(function() {$(window).trigger('dna:always', [{'dnaCallArguments': args, 'callbackCallArguments': arguments}]);})
        ;
        var opts = dna.core.getOpts(arguments, [
            {'recursive': true, 'match': 'array'},
            ['jsonURLs', /[.\/]/],
            ['required', 'string'],
            ['configs', 'plainObject'],
            ['callbacks', 'function']
        ]);
        if (opts.jsonURLs.length + opts.required.length + opts.configs.length == 0) { // empty args
            return dfd.resolve().done(opts.callbacks).promise();
        }

        try {
            opts.configs.forEach(dna.core.configure.bind(dna.core));
            $.when.apply(this, opts.jsonURLs.map(download)) // Resolve 'jsonURLs': download JSON configs
                .done(function() {
                    // Format downloaded Configs with added config.baseURL
                    var args = $.makeArray(arguments).map(function(v, k) {
                        return dna.core
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
                            dna.core.whenSatisfied(opts.required)
                                .done(function() {
                                    $.when.apply(this, opts.required.map(function(name) { // Resolve 'require'
                                        return dna.core.require(name);
                                    }))
                                        .done(opts.callbacks, function() {
                                            dfd.resolve.apply(this, $.makeArray(arguments));
                                        })
                                        .fail(function() {
                                            dfd.reject.apply(this, $.makeArray(arguments));
                                        });
                                })
                                .fail(function() {
                                    dfd.reject.apply(this, arguments);
                                });
                        })
                        .fail(function() {
                            dfd.reject.apply(this, $.makeArray(arguments));
                        });
                });
        } catch (e) {
            dfd.reject(e);
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
     * @return {integer} number of waiting/unresolved requests;
     */
    dna.push = function() {
        dna.apply(this, arguments);
        return dna.core.waiting.length;
    };

    /**
     *  The dna.core service.
     */
    function DNACore() {
        this.waiting = [];
        this.configs = [];
        this.resources = {};
    };

    /** @type {string} */
    DNACore.prototype.version = '1.0';

    /** @type {array} */
    DNACore.prototype.waiting = null; // assigning [] would cause to share this accross instances - not sure if we want it

    /** @type {array} */
    DNACore.prototype.configs = null; // assigning [] would cause to share this accross instances - not sure if we want it

    /** @type {object} */
    DNACore.prototype.resources = null; // assigning {} would cause to share this accross instances - not sure if we want it

    /**
     * Resolve relative URL path
     *
     * Examples:
     *
     * dna.core.resolveURL('file#hash')
     * - result: "https://example.org/file#hash" resolved to current document
     *
     * dna.core.resolveURL('file#hash', '/directory/', 'https://example.org')
     * - result: "https://example.org/directory/file#hash
     *
     * @param {string...} url Any URL to resolve
     * @return {string} Absolute URL
     */
    DNACore.prototype.resolveURL = function() {
        var doc = document.implementation.createHTMLDocument( 'html', '', '');
        var base = doc.head.appendChild(doc.createElement('base'));
        var link = doc.body.appendChild(doc.createElement('a'));
        var url = location ? location.href : 'https://example.com/';
        for (var i = arguments.length - 1; 0 <= i; i--) {
            base.setAttribute('href', url);
            link.setAttribute('href', arguments[i]);
            url = link.href;
        }
        return url;
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
    DNACore.prototype.configure = function(config, baseURL) {
        var idOK = false;
        config = $.extend({}, config); // clone it so later modification to the object does not do mass

        // IDs must not contain [./] because we recognize dna()'s URLs by those characters
        if (config.id) idOK = validateString(config.id, /^[a-z0-9:_-]+$/i, 'Invalid `id` name in ' + JSON.stringify(config) + '.');
        if (config.service) idOK = validateString(config.service, /^[a-z][a-zA-Z0-9_]+$/, 'Invalid `service` name in ' + JSON.stringify(config) + '.');
        if (config.proto) idOK = validateString(config.proto, /^[A-Z][a-zA-Z0-9_]+$/, 'Invalid `proto` name in ' + JSON.stringify(config) + '.');

        if (!idOK) $.error('At least one must be specified `id` or `service` or `proto` in Config ' + JSON.stringify(config));
        if (config.service && !config.proto) $.error('Service "' + config.service + '" requires the `proto` property: ' + JSON.stringify(config));

        var initNames = [config.id, config.proto, config.service];

        initNames.forEach(function (name) {
            if (name) {
                if (typeof dna[name] == 'undefined') {
                    dna[name] = null;
                } else {
                    $.error('DNA: ' +
                                    'Conflicting name `' + name + '` / ' +
                                    'redundand Config registration while registering config: ' + JSON.stringify(config) + '; ' +
                                    'conflicting config exists: ' + JSON.stringify(dna.core.getConfig(name)) + '. ' +
                                    'Note: All `id`, `proto` and `service` names must be unique accross the board.'
                                   );
                }
            }
        });

        // Cleanup - we reserve some properties for ourselves
        delete config._dfd;

        this.configs.push(config);
    };

    /**
     * Check if we have all Configs loaded to satisfy given requirement.
     *
     * Example:
     *   dna.core.canSatisfy(['Proto1', 'service2']);
     *
     * @param {array} requirements Array of names or ids
     * @return {boolean} false: missing configs, true: all required configs to satisfy the requirement available
     */
    DNACore.prototype.canSatisfy = function(requirements, stack) {
        if (typeof requirements == 'undefined' || requirements.length == 0) return true; // undefined

        stack = stack || [];
        for (var i in requirements) {
            if ($.inArray(requirements[i], stack) !== -1) {
                throw new Error('DNA: Recursive requirement loop: ' + stack.join(' > ') + ' > ' + requirements[i] );
            }
            var config = this.getConfig(requirements[i]);

            if (!config) {
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
     *   dna.core.whenSatisfied('Proto1', ['Proto2', 'service3']).done(canDo);
     *
     * @param {array|string|callback...} arguments
     * @return {Deferred}
     */
    DNACore.prototype.whenSatisfied = function() {
        var dfd = $.Deferred();
        var newOpts  = this.getOpts(arguments, [
            ['requirements', 'string'],
            ['callbacks', 'function'],
            'recursive'
        ]);
        newOpts._dfd = dfd;
        this.waiting.push(newOpts);

        for (var i = this.waiting.length - 1; 0 <= i; i--) {
            var opts = this.waiting[i];
            try {
                var can = this.canSatisfy(opts.requirements);
            } catch (e) {
                this.waiting.splice(i, 1);
                opts._dfd.reject(e);
                break;
            }

            if (can) {
                this.waiting.splice(i, 1);
                $(opts.callbacks).each(function(k, callback) {
                    callback();
                });
                opts._dfd.resolve(opts);
            } else {
                console.log('DNA: Queued action #' + (i + 1) + '/' + this.waiting.length + ': Waiting for yet undefined requirements: ' + opts.requirements.join(', '));
            }
        }

        return dfd;
    };

    DNACore.prototype.getConfig = function (name) {
        for (var i = 0; i < this.configs.length; i++) {
            var c = this.configs[i];
            if (c.id == name || c.proto == name || c.service == name) {
                if (c.baseURL) { // we will resolve it on get rather then on load because on load it may never be used so it could waste CPU resources
                    c.load = dna.core
                        .getOpts(c.load, [['urls', 'string'], 'recursive'])
                        .urls
                        .map(function(url) {return dna.core.resolveURL(url, c.baseURL);});
                    delete c.baseURL;
                }
                if ($.type(c.require) == 'string') {
                    c.require = [c.require];
                }
                if ($.type(c.load) == 'string') {
                    c.load = [c.load];
                }
                return c;
                break;
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
     * dna.core.getOpts(['10px', 'right'], [
     *     ['width', /px$/],
     *     ['position', /top|right/]
     * ]); // Result: {"width":["10px"],"position":["right"]}
     *
     * // Switched order of parameters
     * dna.core.getOpts(['right', '10px'], [
     *     ['width', /px$/],
     *     ['position', /top|right/]
     * ]); // Result: {"width":["10px"],"position":["right"]}
     *
     * // More advanced
     * dna.core.getOpts(['10px', {'position': 'bottom', 'newAttr': 'some value'}, ['top', 'right', '1234']], [
     *     {'match': ['array', 'plainObject'], 'recursive': true},
     *     {'name': 'width', 'match': [/px$/, 'numeric']},
     *     ['obj', 'object'],
     *     ['position', /top|right/],
     *     ['other', '*']
     * ]); // Result: {"width":["10px"],"obj":[],"position":["bottom","top","right"],"other":["1234"],"newAttr":["some value"]}
     *
     * dna.core.getOpts(['10px', {'position': 'bottom', 'newAttr': 'some value'}, ['top', 'right', '1234']], [
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
            this.getOpts(args, [['names', 'string'], 'recursive']).names
                .forEach((function(name) {
                    promises.push(requireSingle.call(this, name, stack));
                }).bind(this));
        } catch (e) {
            return $.Deferred().reject(e).promise();
        }

        return $.when.apply(this, promises);
    };


    function requireSingle(name, stack) {
        var config, promises = [], dfd = $.Deferred();

        if ($.inArray(name, stack) != -1) {
            $.error('DNA: Recursive requirement: ' + stack.join(' > ') + ' > ' + name + ' (recursion)');
        }
        stack.push(name);

        config = dna.core.getConfig(name);
        if (!config) $.error('DNA: Cannot satisfy the requirement "' + name + '"');

        if (config._dfd) return config._dfd; // Already pending resolution of this Config
        config._dfd = dfd.promise();

        var requirePromises = requireMulti.call(this, [config.require], stack); // must be called before this.load(config), but promise added after it to load/execute scripts form deepest requirement first
        promises.push(this.load(config, config.load || [])); // Must be first among promises because we capture the first returned parameter (proto object) in $.when(promises) bellow
        promises.push(requirePromises);

        $.when.apply(this, promises).done(function(proto) {
            var val;

            // Install objects
            if (config.proto) {
                if (proto) {
                    dna[config.proto] = proto;
                } else {
                    dfd.reject(new Error('DNA: Cannot find the Proto object window["' + config.proto + '"]: ' + JSON.stringify(config)));
                }
            }
            if (config.proto && config.service) {
                dna[config.service] = new dna[config.proto];
            }
            if (config.id == name) {
                val = config;
            } else if (dna[name]) {
                val = dna[name];
            }

            if (val) {
                dfd.resolve(val);
            } else {
                dfd.reject(new Error('DNA: Cannot find the requested object dna["' + name + '"]: ' + JSON.stringify(config)));
            }
        }).fail(function() {
            dfd.reject.apply(this, $.makeArray(arguments));
        });

        return config._dfd;
    };


    DNACore.prototype.load = function(config, urls) {
        urls = this.getOpts(urls, [['urls', 'string'], 'recursive']).urls;

        var promises = [];
        urls.forEach(function(url) {
            promises.push(loadGetResource(url));
        });

        var evaluator, retStatement;
        switch (config['eval'] || 'dna') {
        case 'window':
            evaluator = function(jsString) {
                return window.eval(jsString);
            };
            retStatement = '\n; ' + (config.proto ? 'window["' + config.proto + '"]' : 'undefined');
            break;
        case 'dna':
            evaluator = function(jsString) {
                return eval(jsString);
            };
            retStatement = '\n; ' + (config.proto || 'undefined');
            break;
        default:
            throw new Exception('Unknown evaluation type "' + config['eval'] + '" in config: ' + JSON.stringify(config));
        }

        var dfd = $.Deferred();
        $.when.apply(this, promises)
            .done(function() {
                var proto = undefined;
                for (var i = 0; i < arguments.length; i++) {
                    proto = (evaluator(arguments[i] + retStatement)) || proto;
                }
                dfd.resolve(proto);
            })
            .fail(function() {
                console.log('DNA: Load failed', urls, arguments);
                dfd.reject.apply(this, arguments);
            });

        return dfd;
    };

    function loadGetResource(url) {
        var dfd = $.Deferred();
        var parts = url.split('#');
        var callback;

        callback = function(string) {
            if (parts.length == 1) { // Javascript
                dfd.resolve(string + ' //# sourceURL=' + url + '#dna');
                return;
            }
            // HTML
            var doc = document.implementation.createHTMLDocument( 'html', '', '');
            doc.childNodes[1].innerHTML = string;
            var $script = $('#' + parts[1], doc);
            var jsString = $.trim($script.text());

            if (jsString.length) {
                dfd.resolve(jsString + ' //# sourceURL=' + url);
            } else if ($script.attr('src')) {
                var linkURL = $script.get(0).src || $script.attr('src') ||
                        $script.get(0).href || $script.attr('href');
                if (!linkURL) {
                    dfd.reject(new Error('The script "' + url + '" has no contents and no reference to other external resource.'));
                }
                loadGetResource(dna.core.resolveURL(linkURL, url))
                    .done(function() {
                        dfd.resolve.apply(this, $.makeArray(arguments));
                    })
                    .fail(function() {
                        dfd.reject.apply(this, $.makeArray(arguments));
                    });
            } else {
                dfd.reject(404, 'Cannot load script "' + url + '"');
            }
        };

        download(parts[0], 'text')
            .done(callback)
            .fail(function() {dfd.reject.apply(this, $.makeArray(arguments));});

        return dfd;
    }

    function validateString(string, pattern, error) {
        if (!string || !pattern.test(string)) {
            $.error('DNA: ' + error + ' String ' + JSON.stringify(string) + ' does not match the pattern ' + pattern);
        }
        return true;
    }

    function download(url, type) {
        if (dna.core.resources[url]) {
            return dna.core.resources[url];
        }

        var dfd = $.Deferred();
        dna.core.resources[url] = dfd.promise();

        $.ajax({url: url, dataType: type || 'text', cache: true, type: 'GET', async: true})
            .done(function(doc) {
                dfd.resolve(doc);
            })
            .fail(function() {
                console.log('DNA: Cannot download "' + url + '"', arguments);
                dfd.reject.apply(this, $.makeArray(arguments));
            });

        return dna.core.resources[url];
    };

    dna.DNACore = DNACore;
    dna.core = new DNACore;

    console.log('DNA: Ready.');

    var queue = window.dna || [];  // replace optional queue of calls with reall object
    window.dna = dna;

    // Resolve calls to dna() made before dna loaded
    // using `dna = dna || []; dna.push(args);`
    for (var i = 0; i < queue.length; i++) {
        window.dna.apply(this, [queue[i]]);
    }
})(jQuery, window);

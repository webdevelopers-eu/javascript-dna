<!-- markdown-toc start - Don't edit this section. Run M-x markdown-toc-generate-toc again -->
**Table of Contents**

- [Javascript DNA / jDNA](#javascript-dna--jdna)
    - [Motivation](#motivation)
    - [Features](#features)
    - [Quick Tutorial](#quick-tutorial)
    - [Syntax](#syntax)
        - [Configuration Object](#configuration-object)
            - [Register Configurations](#register-configurations)
            - [Prototype Aliases](#prototype-aliases)
    - [Evaluation Engines](#evaluation-engines)
        - [Engine `dna`](#engine-dna)
        - [Engine `deferred`](#engine-deferred)
    - [Ozone API](#ozone-api)
    - [Settings](#settings)
    - [Core Plugin System](#core-plugin-system)
        - [Custom URL Rewriting](#custom-url-rewriting)
        - [Downloaders](#downloaders)
            - [Inbuilt Javascript Scheme](#inbuilt-javascript-scheme)
            - [Inbuilt CSS Scheme](#inbuilt-css-scheme)
            - [Inbuilt Config Scheme](#inbuilt-config-scheme)
            - [Inbuilt Remote Scheme](#inbuilt-remote-scheme)
            - [Custom](#custom)
        - [Custom Evaluation Engines](#custom-evaluation-engines)
    - [Bundled Assets](#bundled-assets)
    - [Examples](#examples)
        - [Complete Example #1](#complete-example-1)
    - [Portable Modules](#portable-modules)
    - [Tricks](#tricks)
        - [Call DNA Before It Loads](#call-dna-before-it-loads)
        - [External Configurations](#external-configurations)
        - [Load Anything](#load-anything)
    - [Experimental Features](#experimental-features)
        - [Named Context](#named-context)
    - [Troubleshooting](#troubleshooting)
    - [ToDo](#todo)

<!-- markdown-toc end -->
# Javascript DNA / jDNA

Unobtrusive, simple to use, asynchronous script loader and dependency resolver that will
- dramatically __optimize__ the loading speed of many scripts
- bring __order__ into big web apps
- allow you to define __clean__ Javascript classes (prototypes) the way you always wanted to - without `define()` or `module.exports` auxiliary trash
- ability to resolve dependencies for all Javascript files CSS files and [more](#downloaders)

## Motivation

Q: Why another AMD solution? We have Dojo Toolkit, RequireJS, and ScriptManJS...
> A: There was a need for modern, __clean__ and __intuitive__ loader. What every programer needs is a system that you can say to "I need classes `Class1` and `Class2` for my code to work." System will somehow make that happen and then execute your dependent code. This is what everybody wants. And this is what most f(r)ameworks don't get right.
>
> Programmers are required to alter their precious code to enable loading frameworks. That I consider in most cases as pure evil. Framework should help you and you should not be required to help framework. Do you need to include `define()` at the end of your PHP class definition file? No! Why should you in Javascript?
>
> The desire was to build the system that will understand simple files containing clean (future ECMA6) class declarations or current Javascript prototype definitions without any `define()` and `module.export` trash code. Something you are used to from other languages. Something where one can express dependencies using __class names__ rather then cryptic ids or file paths... Something like
```javascript
// Contents of file /just/anywhere/file.js
function Point(x, y) {
    this.coord = [x, y];
}
Point.prototype.toString = function() {
        return '[' + this.coord.join(' x ') + ']';
};
```
> that can be intuitively required in the code:
```javascript
dna(
       'Point', // I need the Point prototype
       function() { // Run this after you load the Point prototype
           new dna.Point(10, 20);
       }
   );
```
> There was nothing like that. Most solutions failed to meet this simple expectation of every programmer by making impractical design choices or implementing unnecessarily complex solutions to achieve simple goal.
>
> If you want to try something __simple__, __intuitive__ and very __powerfull__ then _Javascript DNA_ is here for you!

## Features

- [x] __Simple API__ - all you need is just one method `dna(...)`. That's really it. There is not more to it.
- [x] __Bundles__ - optional script archives capable of accommodating dozens of scripts that are fast to download and don't carry unnecessary burden on browser's internal script parser.
- [x] __CSS resources__ - you can load javascripts as easy as CSS resources only when needed.
- [x] __100% asynchronous__ - scripts are loaded out-of-order yet evaluation order is guaranteed.
- [x] __Out-of-order API__ - with our unique O₃ API (Ozone API) you can call DNA methods in any order, define your hooks with their requirements before feeding DNA with dependency information, call DNA even before it is loaded and more. No need to worry _if_, _when_ or in _what order_ you can use any of DNA features.
- [x] __Optimized__ - small and fast with minified size of just about 11kB.
- [x] __Easy debugging__ - shows correct source/lines in debuggers. Reporting problems in console. Global error handlers.
- [x] __Open plugin system__ - support for URL-rewritting, download and script evaluation plugins.
- [x] __jQuery__ based

## Quick Tutorial

Include DNA script on your page
```html
<script src=".../dna.js"></script>
```

Define locations of your Javascript prototypes and their dependencies

```javascript
dna({
     'proto': 'MyPrototype1', // Prototype name that you use in your code requirements
     'require': 'MyPrototype2', // It requires also another prototype defined elsewhere
     'load': '/somewhere/func1.js' // There is MyPrototype1 expected to be defined.
  }, {
     'proto': 'MyPrototype2',
     'load': '/somewhere/func2.js'
  });
```

Create files with your javascript classes:

File `/somewhere/func1.js`
```javascript
function MyPrototype1() {
    new dna.MyPrototype2; // we expect DNA to resolve also MyPrototype2 requirement
}
```
File `/somewhere/func2.js`
```javascript
function MyPrototype2() {
    alert('Hello world!');
}
```
Execute your function after DNA exports explicitly required `MyPrototype1` and its dependency `MyPrototype2` as `dna` properties:
```javascript
dna('MyPrototype1', function() { new dna.MyPrototype1; });
```

## Syntax

```
dna( [ REQUIREMENT | CONFIGURATION | CONFIGURATION_URL | CALLBACK | ARRAY | SETTINGS ], ...):Promise
dna.push( REQUIREMENT | CONFIGURATION | CONFIGURATION_URL | CALLBACK | ARRAY | SETTINGS ):Number
```

* `REQUIREMENT`:`String` is a string with `id`, `proto`, `service` identifier that needs to be resolved before calling callbacks.
* `CONFIGURATION`:`Object` is an object with list of requirements and scripts to load. See more in [Configuration](#configuration-object) section.
* `CONFIGURATION_URL`:`String` you can store your configuration(s) as an array of objects in an external JSON file. This will load configurations from the file. JSON URL must contain at least one character "`/`" (e.g. "`./dna.json`") Note: Listed URIs will be [rewritten](#custom-url-rewriting) and [downloaded](#custom-downloader) using plugin system. JSON files can contain also string names of prototypes/services to be loaded right away.
* `CALLBACK`:`Function` any callback(s) to be executed when all requirements were resolved. Same as specifying callback using `$(...).done(CALLBACK);`
* `ARRAY`:`Array` list of any combination of items of type `REQUIREMENT` | `CONFIGURATION` | `CONFIGURATION_URL` | `CALLBACK` | `ARRAY` | `SETTINGS` .
* `SETTINGS`:`Object` see more in [Settings](#settings) and [Core Plugin System](#core-plugin-system) section.

Returned values
* `Promise` -  the call to `dna(...)` always returns jQuery [Promise](https://api.jquery.com/category/deferred-object/) object that you can use to hook your callbacks onto immediately or anytime later.
* `Number` - the call to `dna.push(...)` returns the size of queue of commands waiting for resolution.

Call ```dna.push()``` only if you are not sure if DNA is loaded. See section [Call DNA Before It Loads](#call-dna-before-it-loads). Good practice is to call it with a callback without any dependencies specified. This will call the callback immediatelly after DNA is loaded.

```javascript
var dna = dna || [];
dna.push(function() { // On DNA load
    dna(…);
    …;
});
```

### Configuration Object

Configuration Objects are used to define dependencies and requirements.

```javascript
{
    'id': ID,
    'proto': PROTO,
    'service': SERVICE,
    'require': REQUIRE,
    'load': LOAD,
    'eval': EVAL,
    'context': CONTEXT
}
```
Where
* `ID`:`Identifier` Optional. Unique super-identifier (unique across all `id`, `proto`, `service` identifiers in all configurations).
* `PROTO`:`Identifier` Optional. A super-identifier. Name of the `Function` javascript object. Must start with an upper-case letter. This object will be available as `dna` property (e.g. `dna[PROTO]`) after successful resolution. See [Prototype Aliases](#prototype-aliases) to see how to load multiple versions of the same script.
* `SERVICE`:`Identifier` Optional. A super-identifier. Name of the `dna` property. Must start with a lower-case letter. The `dna[SERVICE]` will be populated with object created using `PROTO` `Function` (in a nutshell it will do `dna[SERVICE]=new dna[PROTO];`).
* `REQUIRE`:`URI|Identifier|Array` Optional. One or  array of `id`, `proto` or `service` identifiers that define dependencies or relative or absolute `CONFIGURATION_URL` of file with additional list of JSON-serialized `CONFIGURATION` objects to be loaded. All dependencies referred by listed super-identifiers will be resolved prior to resolving `load` section of this particular configuration
* `LOAD`:`URI|Array` Optional. A list of absolute or relative (resolved to a containing `.json` file or current document) URLs of Javascript or HTML (see [Bundled Assets](#bundled-assets)) files to be loaded and parsed/executed. Files are guaranteed to be executed in listed order with required dependencies executed first. Note: Listed URIs will be [rewritten](#custom-url-rewriting) and [downloaded](#custom-downloader) using plugin system.
* `EVAL`:`String` Optional. Accepted values: `dna` (default) or custom name. See more in [Evaluation Engines](#evaluation-engines) section.
 * `dna` evaluates the script in closure scope and expects the script to define variable of name specified in configuration's `proto` property.
 * `deferred` your script is not expected to define variable of name specified in `config.proto` property but you are expected to pass object representing `config.proto` to Deferred object stored in `factory` variable.
 * custom name expects you to specify your own factory to execute the code and return the result object. See more in [Custom Evaluation Engines](#custome-valuation-engines) section.
* `CONTEXT`:`String` Optional. Default: `false`. Name of the context to evaluate the script. Currently supported values: "`window`" or `false`.
 * `false` (default) boolean causes the script evaluation in its own context.
 * "`window`" string causes evaluation in `window` object context.
 * `STRING` *Experimental* - any name identifying a shared context. Scripts having the same context name will have `this` and `context` set to the same private Object. See [Named Context](#named-context) section for more information.

Note: At least one `id` or `proto` super-identifier must be specified in the single Configuration Object.

#### Register Configurations

Just pass the Configuration Object or URL pointing to JSON file with Configuration Objects to `dna()` method. See [syntax](#syntax) section for more. Examples:

```javascript
dna( '/dna.json' );
dna( {'proto': 'Test', 'load': '/file.js'} );
dna(
    '/dna.json',
    {'proto': 'Test', 'load': '/file.js'},
    [ '/other.json', '/otherother.json' ]
);
```
You can also include other JSON configuration files from withing Configuration Object.

```javascript
[
  {
    "id": "load-big-project",
    "require": "./my/big-project.json"
  }
]
```

You can then load additional `big-project.json` just by requiring `load-big-project`. E.g. `dna("load-big-project").done(...);`

It is also possible to load external JSON using `config` scheme - see more in [Inbuilt Config Scheme][(#inbuilt-config-scheme) section.


#### Prototype Aliases

Sometimes you will need to load Javascript class that has the name that conflicts with other class. Usually it is the case of supporting different versions of the same class.

In that case you can use prototype alias to export the prototype in different property. Example:

```javascript
dna({
    'proto': 'MyStuff',
    'load': '/lib/my-stuff-v1.js'
}, {
    'proto': 'MyStuff=MyStuff@2',
    'load': '/lib/my-stuff-v2.js'
});

dna('MyStuff@2', newerCodeCallback);
```
In this case the class `MyStuff` from the file `my-stuff-v1.js` will be exported as `dna.MyStuff` while the same class from file `my-stuff-v2.js` will be exported as `dna["MyStuff@2"]`.

You can use also multiple aliases:
```javascript
dna({
    'proto': 'MyStuff=MyStuff@2=webdevelopers.eu:MyStuff@2',
    'load': '/lib/my-stuff-v2.js'
});
```
in which case `MyStuff` from `my-stuff-v2.js` will be available as both `dna["MyStuff@2"]` and `dna["webdevelopers.eu:MyStuff@2"]` but not as `dna.MyStuff`.

## Evaluation Engines

You can execute your scripts in various ways. You can even register your own [Custom Evaluation Engines](#custom-evaluation-engines).

DNA comes with following evaluation engines.

### Engine `dna`

Your script is expected to define variable matching the name specified in config's `proto` property that holds the prototype object representing your module.

Example:

```javascript
dna({
    'proto': 'MyModue',
    'load': '/mymodule.js',
    'eval': 'dna' // default
});
```
Contents of `/mymodule.js` is expected to define `MyModule` variable holding the Object. For example:
```javascript
function MyModule() {}
```

### Engine `deferred`

Sometimes you need to asynchronously load other parts of the module and you cannot define the prototype right away during script evaluation.

For that the `deferred` engine is the right one as it expects you to pass the prototype object to `Promise` when you are ready.

Example:

```javascript
dna({
    'proto': 'MyModue',
    'load': '/mymodule.js'
    'eval': 'deferred'
});
```
Contents of `/mymodule.js` is expected to call `factory.resolve(...);` when your module is ready.
```javascript
// variable `factory` is already populated with Deferred object you are expected to resolve/reject.
doSomeAsyncInit
  .done(function(myProto) {
        // myProto prototype is the outcome of your module.
        // It will be passed on to DNA to be registered in dna.MyModule property.
        factory.resolve(myProto);
  });
```

This Engine will allow you to include other extensive configurations on request. That way you can chain up .json configurations and modules that will be loaded on request or can be specified as dependencies for other modules.
```javascript
dna({
    'id': 'extensive:module',
    'load': 'javascript: dna("/lot-of.json", "extensive:loader", function() { factory.resolve(); });',
    'eval': 'deferred'
});

// will load /lot-of.json with additional configuration
// and initialize service dna['extensive:loader']
dna('extensive:module', function() {
    // My extensive module is ready
});
```
Note: for the trick with `"load": "javascript:..."` see [Custom Downloader](#custom-downloader) section.

## Ozone API

Nowadays Javascript loader should download scripts asynchronously and out-of-order. DNA pushed it even further by making whole API fully out-of-order (O₃ API) to match your needs for worryless coding.

You can define callbacks before you load configurations. DNA will delay your callback's resolution until it gets enough information to resolve all dependencies.
```javascript
// DNA is not loaded yet? Create surrogate object.
var dna = dna || [];

// Treat dna.push([ARGS]) as it were dna(ARGS)
dna.push(['MyService', doSomething]);

// Note - DNA is not loaded yet and just line before
// you specified dependency on MyService that was not defined either
dna.push({'proto': 'MyService', 'load': ['my1.js', 'my2.js']});
```
And when DNA is included everything falls in place automatically and `doSomething()` will get executed.

## Settings

You can pass object with settings to ```dna(SETTINGS)``` method. Supported properties are

* `timeout`:`Integer` number of milliseconds to wait before failing when trying to satisfy object requirements. Default: 5000
* `rewrite`:`object` see [Core Plugin System](#core-plugin-system)
* `factory`:`object` see [Core Plugin System](#core-plugin-system)
* `downloader`:`object` see [Core Plugin System](#core-plugin-system)

Exampe:

```javascript
dna({'timeout': 1000});
```

## Core Plugin System

The main difference between asynchronous loaders is how loader
- interprets URLs
- downloads files
- evaluates scripts

Javascript DNA has core plugin system that allows you to define your own behavior for all of main components.

To register your plugins pass the plugin configuration object to dna:
```javascript
dna({
    'rewrite': rewritePlugins,
    'downloader': downloaderPlugins,
    'factory': factoryPlugins
});
```

### Custom URL Rewriting

To register your own URL rewritting callback use this syntax
```javascript
  dna({
      'rewrite': function(currentURI, originalURI, baseURI) | [ function(currentURI, originalURI, baseURI), ... ]
    });
```

Example:
```javascript
if (server.development) {
    dna({
        'rewrite': function(currentURI, originalURI, baseURI) {
            return currentURI.replace(/\.min\.js$/, '.js');
        }
    });
}
```

You can register multiple rewrite callbacks. They will be called in order of registration.

The resulting URI will be resolved to absolute URL if it is relative after all rewrite callbacks were applied.

### Downloaders

You can also register your own URI downloader. That way you can download files not only from server but also from local storage, variables or other resources.

DNA has following native scheme downloaders

- [`javascript`](#inbilt-javascript-scheme): able to exectue javascript URLs. Eg. ```'load': 'javascript: alert("Hello World!");'```
- [`css`](#inbuilt-css-scheme): able to load CSS URLs. Eg. ```'load': 'css:./modules/my.css'```
- [`config`](#inbuilt-config-scheme): able to load additional DNA configurations. Eg. ```'load': 'config:./modules/my.json'```
- [`remote`](#inbuilt-remote-scheme): able to load scripts from third-party domains. Eg. ```'load': 'remote:https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js'```
- `*`: default downloader that uses standard `$.AJAX` call.

#### Inbuilt Javascript Scheme
The inbuilt `javascript` scheme hook allows you to embed javascripts into URLs.

```javascript
dna({
    'id': 'my-test',
    'load': 'javascript: alert("Hello World!");'
}, 'my-test'});
```

#### Inbuilt CSS Scheme
Inbuilt `css` sheme downloader allows you to embed CSS.

```javascript
dna({
    'id': 'my-test',
    'load': 'css:./my.css'
}, 'my-test'});
```
#### Inbuilt Config Scheme
Inbuilt `config` sheme downloader allows you to load additional DNA configurations on demand.

```javascript
dna({
    'id': 'my-test',
    'load': [
        'config:my/dna.json',
        'my/script.js'
}, 'my-test'});
```

You can also specify config URL in `require` section:

```javascript
dna({
    'id': 'my-test',
    'require': './other.json'
}, 'my-test'});
```

Note: If the configuration object contains only `id` property and
`require` property that contains URLs of other JSON configurations
then such configuration can be overriden by other configuration with
the same `id`.

For example you can have one configuration file

```javascript
[
    {
      'id': 'my-test',
      'require': './other.json'
    }
]
```

that includes `other.json` file

```javascript
[
    {
      'id': 'my-test',
      'proto': 'MyTest',
      'load': './my-test.js'
    }
]
```

and DNA will not complain about duplicate `id` super-identifier and
the original configuration will be replaced with the one from
`other.json`. That way you can split large JSON configurations into
multiple JSON files.


#### Inbuilt Remote Scheme
Inbuilt `remote` sheme downloader allows you to load scripts from third-party domains.

```javascript
dna({
    'id': 'my-test',
    'load': [
        'load': 'remote:https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js',
        'my/script.js'
}, 'my-test'});
```

#### Custom
You can register only one downloader for each URI scheme.

To register your own downloader use this syntax
```javascript
  dna({
      'downloader': {
          SCHEME: function(dfd, uri, config),
          ...
      }
    });
```
Your downloader is expected to call `dfd.reject(ERROR)` or `dfd.resolve(DATA_STRING)` after the download.

Example:
```javascript
dna({
    'downloader': {
        'variable': function(dfd, uri, config) {
            var contents = myCachedContents[uri.replace('variable:', '')];

            if (contents) dfd.resolve(contents);
            else dfd.reject(new Error('Cannot download URI "' + uri + '"!'));
        }
    }
});

dna({
    'proto': 'Test',
    'load': 'variable:myTest'
}, 'Test', callback);
```

Note: When your downloader returns `false` then default `$.AJAX` downloader will be called instead. If you return `false` from your downloader then you are supposed not to resolve `dfd` Deferred object.

### Custom Evaluation Engines

You can specify your own function to execute downloaded scripts. That way you can bridge RequireJS or CommonJS or any other module format.

To specify execution handler use this syntax
```javascript
  dna({
    'factory': {
      EVAL: function(dfd, jString, protoName, config),
      ...
    }
  });
```
Your factory is expected to call `dfd.reject(ERROR)` or `dfd.resolve(FUNCTION)` after resolution.

Example:
```javascript
  dna({
    'factory': {
      'my-common-js': function(dfd, jString, protoName, config) {
        var exports = {};
        (function(exports) {
           eval(jString);
        }(exports));
        dfd.resolve(exports[protoName]); // Return the exported object
      },
      'my-other-method': mySuperEvaluator
    }
  });
  dna({
    'proto': 'MyModule',
    'load': '/lib/my.js',
    'eval': 'my-common-js'
  });
```

Note: Thanks to Ozone API if you try to require a class that has unknown `eval` type then the request will be queued until apropriate `eval` type is defined. O₃ API allows you to define custom factories anytime without worrying if any code requiring custom factory was called before it has been even defined.

In fact this should allow also ECMA6 bridge.
```javascript
// app.js
import something as calculator from 'calculator';

console.log(calculator.sum(1, 2)); // => 3
```
where factory can search for `import` statement, do sub-call to DNA to resolve the found dependency and remove the `import` statement for compatibility with non-ECMA6 browsers... :-)

## Bundled Assets

You can bundle multiple scripts into one XML or HTML file for optimized download.

Just create a document (e.g. `my-bundle.html`) and put standard `script` tags with `id` attributes in it.
```html
<script id="myScript">function MyObject() {alert('Hello World!');}<script>
```

When specifying `load` property of the DNA Configuration object use the URL pointing to HTML file with hash part specifying the element ID.
```javascript
{
    'proto': 'MyObject',
    'load': ['/my-bundle.html#myScript', '/my-unbundled.js']
}
```
DNA will download the `my-bundle.html` file only once (and reuse it later for other included scripts) and then it will extract and execute script with the attribute `id="myScript"`.

It is good idea to make sure your web server allows browser-side caching of XML/HTML files.

For developement you can have empty `script` tags linking to external javascripts: `<script id="myScript" src="/libs/myscript.js"></script>`.
DNA will figure out that the content of `script` tag is missing and will use linked resource instead.

For production site you can populate the HTML with embeded scripts or use the web server [PageSpeed Module](https://developers.google.com/speed/pagespeed/module/) or other tools to do it automatically for you.

## Examples

Load jQuery plugins
```javascript
    dna('/dna-configs/my.json', 'jquery:my');
```

Contents of `my.json` (note the [CSS scheme](#inbuilt-css-scheme) trick)
```javascript
[
    {
        "id": "jquery:my",
        "load": ["css:js/jquery.my.css", "js/jquery.my.js"]
    }
]
```

Mixed confugration using JSON file and inline Configuration Objects + requiring service `dna.svc2` and prototype `dna.Svc1`:
```javascript
dna(
      'Svc1', 'svc2',
      '/configs/svcs.json',
      {'service': 'svc2', 'proto': 'Svc2', 'load': ['/js/base.js', '/js/svc2.js']}
    )
        .done(run)
        .fail(ups);
```

Out-of-order calls (O₃ API): first require `dna.Svc1` and `dna.svc2` to run your callback `run` and then later on load required configurations.
```javascript
dna(['Svc1', 'svc2'], run);

dna('/configs/svcs.json');

dna({'service': 'svc2', 'proto': 'Svc2', 'load': ['/js/base.js', '/js/svc2.js']});
```

Making DNA calls before `dna.js` gets loaded using asynchronous `script` tag.
```html
<script>
  var dna = dna || [];
  dna.push(function() { alert('DNA just loaded!'); });
  dna.push([ 'svc', function(svc) { alert('Service `dna.svc` is ready!'); } ]);
</script>
...
<script async src="/dna.js"></script>
```

### Complete Example #1

Contents of `index.html`:

```html
<script>
    var dna = dna || [];
    dna.push(function() { // on DNA load

      dna('/app/config.json', 'myApp', function() { // load and start my app
        dna.myApp.start();
      });

    });
</script>
...
<script src="/dna.js" async></script>
```

Contents of `/app/config.json` (relative paths are resolved relatively to JSON's file directory `/app/`):

```javascript
[
    {
        'service': 'myApp',
        'proto': 'MyApplication',
        'require': 'app:base',
        'load': './my.js'
    }, {
        'id': 'app:base',
        'load': ['./base/jquery.js', '/lib/bootstrap.js'],
        'context': 'window'
    }
]
```

Contents of `/app/my.js`:

```javascript
function MyApplication() {
    this.version = '0.1';
}

MyApplication.prototype.start = function() {
    alert('Hello world!');
}
```

## Portable Modules

If you write piece of code for global distribution then make sure you create configuration with globally (worldwide) unique ids so programmers using your code can integrate it without changes to your configs.

Good idea is to prefix your super-identifiers with your domain name.

Example of your `config.json` file:
```javascript
[
    {
        'proto': 'Example=example.com:Example',
        'require': ['example.com:Main', 'example.com:service'],
        'load': './example.js'
    }, {
        'service': 'example.com:service',
        'proto': 'ServiceProto=example.com:ServiceProto',
        'require': 'example.com:Main',
        'load': './service.js'
    }, {
        'proto': 'Main=example.com:Main',
        'load': './main.js'
    }
]
```
Code in the example will result in exports into `dna["example.com:..."]` properties.

See more in [Prototype Aliases](#prototype-aliases) section.

## Tricks

There are many ways how to leverage the strength of DNA in your project.

### Call DNA Before It Loads

You can make DNA calls even before DNA was loaded.

Create simple ```[]``` array if DNA is not loaded yet and call the ```dna.push([arguments])``` method on it as it was ```dna(arguments)``` method.

```html
<script>
var dna = dna || [];
dna.push([ 'service1', function(svc1) {...} ]);
dna.push(callbackOnDNAStart);
</script>
...
<script src=".../dna.js" async="async"></script>
```

Note: Multiple arguments must be passed to ```dna.push()``` as an array.

There is one limitation though, the ```dna.push()``` method does not return the [Promise](https://api.jquery.com/category/deferred-object/) object so you must pass your on-success callbacks as arguments.

### External Configurations

Store your configurations in JSON file and load it, don't forget that `dna()` always returns the jQuery [Promise](https://api.jquery.com/category/deferred-object/) object.
```javascript
dna('/my-defs.json', 'MyObject1', 'MyObject2', myCallback)
    .done(myOtherCallback)
    .done(myOtherOtherCallback, oneMoreCallback)
    .fail(myWTF);
```

### Load Anything

You can use `dna()` to load any script that was not directly written for DNA.
```javascript
dna({
        'id': 'jquery',
        'load': '/libs/jquery.min.js',
        'context': 'window'
    }, {
        'id': 'jquery:iPop',
        'require': 'jquery',
        'load': '/libs/jquery.ipop.js',
        'context': 'window'
    });

dna('jquery:iPop', callback);
```
Most of older scripts can be specified using `id` attribute and executed using `context` type `window`. To support newer scripts (like AMD scripts) use [custom factories](#custome-valuation-engines) that you can tailor to fit any framework and/or your special needs.

## Experimental Features

### Named Context

Sometimes selected scripts need to share the variables. Polluting global `window` scope with variables is not the best solution.

With DNA you can use the experimental named contexts. Scripts sharing the same name of the context will have `this` and variable `context` set to their own shared Object.

```javascript
dna({
        'id': 'test:1',
        'load': 'javascript: context.myVar1 = "var 1"; console.log("Script 1", context.myVar1, context.myVar2);',
        'context': 'my-private'
    }, {
        'id': 'test:2',
        'load': 'javascript: context.myVar2 = "var 2"; console.log("Script 2", context.myVar1, context.myVar2);',
        'context': 'my-private'
    },
    'test:1', 'test:2');
```
If named context is not specified then with `dna` eval mode each configuration has its own private Object set as context automatically.

## Troubleshooting

Watch the Javascript Console.

## ToDo
- [ ] Document $(window) events 'dna:fail', 'dna:done', 'dna:always'

# Javascript DNA / jDNA

Minimalist, jQuery based, simple to use, asynchronous script loader and dependency resolver that will
- dramatically __optimize__ the loading speed of many scripts
- bring __order__ into your big web app
- allow you to define __clean__ Javascript classes (prototypes) the way you always wanted to - without any `define()` or `module.exports` auxiliary trash

<!-- markdown-toc start - Don't edit this section. Run M-x markdown-toc-generate-toc again -->
**Table of Contents**

- [Javascript DNA / jDNA](#javascript-dna--jdna)
    - [Motivation](#motivation)
    - [Features](#features)
    - [Quick Tutorial](#quick-tutorial)
    - [Syntax](#syntax)
        - [Configuration Object](#configuration-object)
            - [Register Configurations](#register-configurations)
    - [Load Optimizations](#load-optimizations)
    - [Examples](#examples)
        - [Complete Example #1](#complete-example-1)
    - [Tricks](#tricks)
        - [Call DNA Before It Is Loaded](#call-dna-before-it-is-loaded)
        - [External Configurations](#external-configurations)
        - [Load Anything](#load-anything)
        - [Load In Any Order](#load-in-any-order)
    - [Troubleshooting](#troubleshooting)
    - [ToDo](#todo)

<!-- markdown-toc end -->

## Motivation

Q: Why another AMD solution? We have Dojo Toolkit, RequireJS, and ScriptManJS...
> A: There was a need for __clean__ and __intuitive__ loader. What every programer needs is a system that you can tell it that "I need classes `Class1` and `Class2` for my code to work." System will somehow make that happen and then execute your dependent code. Plain and simple. This is what everybody wants.
>
> Simply system that will understand simple files containing clean (future ECMA6) class declarations or current Javascript prototype definitions without any `define()` and `module.export` trash code. Something you are used to from other languages. Something where one can express dependencies using __class names__ rather then cryptic ids or file names... Something like
```javascript
// Contents of file /just/anywhere/file.js
function Point(x, y) {
    this.coord = [x, y];
}
Point.prototype.toString = function() {
        return '[' + this.coord.join(' x ') + ']';
};
```
> that can be intuitively required in the code by
```javascript
dna(
       'Point', // I need the Point prototype
       function() { // Run this after you load the Point prototype
           new dna.Point(10, 20);
       }
   );
```
> There was nothing like that. Most solutions failed to meet this simple expectation of every programmer by making impractical design choices or implementing unnecessary complex solutions to achieve simple goal.
>
> If you want to try something simple, intuitive and powerfull then Javascript DNA is here for you!

## Features

- [x] __Simple API__ - all you need is just one method `dna(...)`. That's really it. There is not more to it.
- [x] __Bundles__ - optional script archives capable of accommodating dozens of scripts that are fast to download and don't carry unnecessary burden on browser's internal script parser.
- [x] __100% asynchronous__ - scripts are loaded out-of-order yet evaluation order is guaranteed.
- [x] __Out-of-order calls__ - you can call DNA methods in any order, define your needs before configuring the DNA, and even call DNA before it is loaded
- [x] __Optimized__ - small and fast with minified size just about 9.5kB.
- [x] __Easy debugging__ - shows correct source/lines in debuggers. Reporting problems in console. Global error handlers.
- [x] __jQuery__ based

## Quick Tutorial

Include DNA script on your page `<script src=".../dna.js"></script>`

Define locations of your Javascript prototypes and their dependencies

```javascript
dna({
     'proto': 'MyFunc1',
     'require': 'MyFunc2',
     'load': '/my/func1.js'
  }, {
     'proto': 'MyFunc2',
     'load': '/my/func2.js'
  });
```

Create files with your javascript classes:

File `/my/func1.js`
```javascript
function MyFunc1() { new dna.MyFunc2; }
```
File `/my/func2.js`
```javascript
function MyFunc2() { alert('Hello world!'); }
```
Execute your function after DNA exports explicitly required `MyFunc1` and its dependency `MyFunc2` as `dna` properties:
```javascript
dna('MyFunc1', function() { new dna.MyFunc1; });
```

## Syntax

```
dna( [ REQUIREMENT | CONFIGURATION | CONFIGURATION_URL | CALLBACK | ARRAY ], ...):Promise
dna.push( REQUIREMENT | CONFIGURATION | CONFIGURATION_URL | CALLBACK | ARRAY ):Number
```

* `REQUIREMENT`:`String` is a string with `id`, `proto` or `service` identifier that needs to be resolved before calling callbacks.
* `CONFIGURATION`:`Object` is an object with list of requirements and scripts to load. See more in [Configuration](#configuration-object) section.
* `CONFIGURATION_URL`:`String` you can store your configuration(s) as an array of objects in an external JSON file. This will load configurations from the file.
* `CALLBACK`:`Function` any callback(s) to be executed when all requirements were resolved. Same as specifying callback using `$(...).done(CALLBACK);`
* `ARRAY`:`Array` list of any combination of items of type `REQUIREMENT` | `CONFIGURATION` | `CONFIGURATION_URL` | `CALLBACK` | `ARRAY`.

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
    'eval': EVAL
}
```
Where
* `ID`:`String` Optional. Unique super-identifier (unique across all `id`, `proto`, `service` identifiers in all configurations).
* `PROTO`:`String` Optional. A super-identifier. Name of the `Function` javascript object. Must start with an upper-case letter. This object will be available as `dna` property (e.g. `dna[PROTO]`) after successful resolution.
* `SERVICE`:`String` Optional. A super-identifier. Name of the `dna` property. Must start with a lower-case letter. The `dna[SERVICE]` will be populated with object created using `PROTO` `Function` (in core it will do `dna[SERVICE]=new PROTO;`).
* `REQUIRE`:`String|Array` Optional. One or  array of `id`, `proto` or `service` identifiers that define dependencies. All dependencies referred by listed super-identifiers will be resolved prior to resolving this particular configuration.
* `LOAD`:`String|Array` Optional. A list of absolute or relative (resolved to a containing `.json` file or current document) URLs of Javascript or HTML (see [Load Optimizations](#load-optimizations)) files to be loaded and parsed/executed. Files are guaranteed to be executed in listed order with required dependencies executed first.
* `EVAL`:`String` Optional. Accepted values: `dna` (default) or `window`. Script evaluation type `dna` evaluates the script in closure variable scope and expects the script to define variable of name specified in configuration's `proto` property. The value `window` evaluates the script using `window.eval()` method. Note: we can add `commonJS` and `requireJS` keywords later that will evaluate scripts to allow executing scripts from respective frameworks.

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

## Load Optimizations

You can bundle multiple scripts into one XML or HTML file for optimized download.

Just create a document (e.g. `my-bundle.html`) and put standard `script` tags with `id` attributes in it. E.g. `<script id="myScript">function MyObject() {alert('Hello World!');}<script>`

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

For live site you can populate the HTML with embeded scripts or use the web server [PageSpeed Module](https://developers.google.com/speed/pagespeed/module/) or other tools to do it automatically for you.

## Examples

Mixed confugration using JSON file and inline Configuration Objects + requiring service `dna.svc2` and prototype `dna.Svc1`:
```javascript
dna('Svc1', 'svc2', '/configs/svcs.json', {'service': 'svc2', 'proto': 'Svc2', 'load': ['/js/base.js', '/js/svc2.js']})
    .done(run)
    .fail(ups);
```

Out-of-order calls: first require `dna.Svc1` and `dna.svc2` to run your callback `run` and then later on load required configurations.
```javascript
dna(['Svc1', 'svc2'], run);

dna('/configs/svcs.json');

dna({'service': 'svc2', 'proto': 'Svc2', 'load': ['/js/base.js', '/js/svc2.js']});
```

Making DNA calls before `dna.js` gets loaded using asynchronous `script` tag.
```
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

```
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
        'eval': 'window'
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

## Tricks

There are many ways how to leverage the strength of DNA in your project.

### Call DNA Before It Loads

You can make DNA calls even before DNA was loaded.

Create simple ```[]``` array if DNA is not loaded yet and call the ```dna.push([arguments])``` method on it as it was ```dna(arguments)``` method.

```
var dna = dna || [];
dna.push([ 'service1', function(svc1) {...} ]);
dna.push(callbackOnDNAStart);
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
        'eval': 'window'
    }, {
        'id': 'jquery:iPop',
        'require': 'jquery',
        'load': '/libs/jquery.ipop.js',
        'eval': 'window'
    });

dna('jquery:iPop', callback);
```

### Load In Any Order

You can define callbacks before you load configurations. DNA will delay your callback's resolution until it gets enough information to resolve all dependencies.
```javascript
dna('MyService').done(doSomething);

dna({'proto': 'MyService', 'load': ['my1.js', 'my2.js']}); // This will doSomething()
```

## Troubleshooting

Watch the Javascript Console.

## ToDo
- [ ] Document $(window) events 'dna:fail', 'dna:done', 'dna:always'
- [ ] Document aliasing: `config = {'proto': 'Proto1=Proto1:v2', ...}` to allow inclusion different scripts with the same prototype names. Will install `Proto1` as `dna["Proto1:v2"]` and optionally multiple aliases `Proto1=Proto1:v2=Proto1:latest=Proto1`

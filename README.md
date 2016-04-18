# Javascript DNA

Minimalist, jQuery based, simple to use, asynchronous script loader, dependency resolver and little bit more.

It is sometimes referred to as *jDNA* or just *DNA*.

__Goal__: *Focus on Usability and Comfort. (For short "FUC Rule" or "FUCR")*

## Table of Contents

1. [Usage](#usage)
1. [Tricks](#tricks)
 1. [Call DNA Before It Is Loaded](#call-dna-before-it-is-loaded)
 1. [External Configurations](#external-configurations)
 1. [Load Anything](#load-anything)
 1. [Load In Any Order](#load-in-any-order)
1. [Load Optimizations](#load-optimizations)
1. [Syntax](#syntax)
 1. [Configuration](#configuration)
  1. [Syntax](#syntax)
  1. [Registering Configurations](#registering-configurations)
 1. [Examples](#examples)
1. [Troubleshooting](#troubleshooting)
1. [TODO](#todo)

## Motivation

Q: Why yet another AMD solution? We have Dojo Toolkit, RequireJS, and ScriptManJS...
> A: In short because of FUCR (see the stated Goal above). Javascript DNA does not conform to AMD specification - it tries to make things much easier and more flexible.

## Usage

1. Include this script in your page `<script src=".../dna.js"></script>`
2. Define your javascript objects and dependencies
```javascript
dna({
     'id': 'my:object1',
     'require': 'my:object2',
     'load': '/myobject1.js'
  }, {
     'id': 'my:object2',
     'load': '/myobject2.js'
  });
```
3. Execute your callback after everything is loaded and executed
```javascript
dna('my:object1', function() {do();});
```

## Tricks

There are many ways how to leverage the strength of DNA in your project.

### Call DNA Before It Is Loaded

You can make DNA calls even before DNA was loaded.

Create simple ```[]``` array if DNA is not loaded yet and call the ```dna.push([arguments])``` method on it as it were ```dna(arguments)``` method.

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
        'load': '/libs/jquery.min.js'
    }, {
        'id': 'jquery:iPop',
        'require': 'jquery',
        'load': '/libs/jquery.ipop.js'
    });

dna('jquery:iPop', callback);
```

### Load In Any Order

You can define callbacks before you load configurations. DNA will delay your callback's resolution until it gets enough information to resolve all dependencies.
```javascript
dna('MyService').done(doSomething);

dna({'id': 'MyService', 'load': ['my1.js', 'my2.js']}); // This will doSomething()
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

## Syntax

```
dna( [ REQUIREMENT | CONFIGURATION | CONFIGURATION_URL | CALLBACK | ARRAY ], ...):Promise
dna.push( REQUIREMENT | CONFIGURATION | CONFIGURATION_URL | CALLBACK | ARRAY ):Number
```

* `REQUIREMENT`:`String` is a string with `id`, `proto` or `service` identifier that needs to be resolved before calling callbacks.
* `CONFIGURATION`:`Object` is an object with list of requirements and scripts to load. See more in [Configuration](#Configuration) section.
* `CONFIGURATION_URL`:`String` you can store your configuration(s) as an array of objects in an external JSON file. This will load configurations from the file.
* `CALLBACK`:`Function` any callback(s) to be executed on successful resolution dependency resolution. Same as specifying callback using `$(...).done(CALLBACK);`
* `ARRAY`:`Array` list of any combination of items of type `REQUIREMENT` | `CONFIGURATION` | `CONFIGURATION_URL` | `CALLBACK` | `ARRAY`.

Returned values
* `Promise` -  the call to `dna(...)` always returns jQuery [Deferred](https://api.jquery.com/category/deferred-object/) object that you can use to hook your callbacks onto immediately or anytime later.
* `Number` - the call to `dna.push(...)` returns the size of queue of commands waiting for resolution.

Call ```dna.push()``` only if you are not sure if DNA is loaded. See section [Call DNA Before It Is Loaded](#Call-DNA-Before-It-Is-Loaded).

### Configuration

Configuration Objects are used to define dependencies and requirements.

#### Syntax

```javascript
{
    'id': ID,
    'proto': PROTO,
    'service': SERVICE,
    'require': REQUIRE,
    'load': LOAD,
    'type': TYPE
}
```
Where
* `ID`:`String` Optional. Unique super-identifier (unique across all `id`, `proto`, `service` identifiers in all configurations).
* `PROTO`:`String` Optional. A super-identifier. Name of the `Function` javascript object. Must start with an upper-case letter. This object will be available as `dna` property (e.g. `dna[PROTO]`) after successful resolution.
* `SERVICE`:`String` Optional. A super-identifier. Name of the `dna` property. Must start with a lower-case letter. The `dna[SERVICE]` will be populated with object created using `PROTO` `Function` (in core it will do `dna[SERVICE]=new PROTO;`).
* `REQUIRE`:`String|Array` Optional. One or  array of `id`, `proto` or `service` identifiers that define dependencies. All dependencies referred by listed super-identifiers will be resolved prior to resolving this particular configuration.
* `LOAD`:`String|Array` Optional. A list of absolute or relative (resolved to a containing `.json` file or current document) URLs of Javascript or HTML (see [Load Optimizations](#Load-Optimizations)) files to be loaded and parsed/executed.
* `TYPE`:`String` NOT IMPLEMENTED YET. Default: "`dna`". Keyword "`amd`" will indicate that scripts described by this Configuration conform to [AMD Specification](https://github.com/amdjs/amdjs-api/wiki/AMD).

Note: At least one `id` or `proto` super-identifier must be specified in the single Configuration Object.

#### Registering Configurations

Just pass the Configuration Object or URL pointing to JSON file with Configuration Objects to `dna()` method. See [syntax](#Syntax) section for more. Examples:

```javascript
dna( '/dna.json' );
dna( {'id': 'test', 'load': '/file.js'} );
dna(
    '/dna.json',
    {'id': 'test', 'load': '/file.js'},
    [ '/other.json', '/otherother.json' ]
);
```

### Examples

```javascript
dna('Svc1', 'svc2', '/configs/svcs.json', {'service': 'svc2', 'proto': 'Svc2', 'load': ['/js/base.js', '/js/svc2.js']})
    .done(run)
    .fail(ups);
```

```javascript
dna(['Svc1', 'svc2'], run);

dna('/configs/svcs.json');

dna({'service': 'svc2', 'proto': 'Svc2', 'load': ['/js/base.js', '/js/svc2.js']});
```

```
<script>
  var dna = dna || [];
  dna.push(function() { alert('DNA just loaded!'); });
</script>
...
<script async src="/dna.js"></script>
```

#### Complete Example #1

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
        'load': ['./base/jquery.js', '/lib/bootstrap.js']
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

## Troubleshooting

Watch the Javascript Console.

## TODO
- [ ] AMD compatibility
- [ ] different evaluation context based on Configuration parameters (`{..., 'type': 'amd'}` etc.)

/**
 * My Start
 *
 */
function Start() {
    // Do initialization of your app here
    // Load any additional modules

    message('Bootstrapping my app - loading start service', 'Calling <code>dna("start");</code> loaded this <code>start</code> service containing app bootstrapper.');

    // dna.service1.doStuff(); // dna.service1 is specified as requirement for Start - it is already loaded

    dna('service2', function() { // dna.service2 is not requirement so we can load it dynamically/asynchronously
        // dna.service2.doStuff();
        message('All services loaded', 'Service <code>dna.service1</code> loaded automatically as requirement for <code>start</code> service. Service <code>dna.service2</code> loaded dnamically from <code>modules/start.js</code>');
    });

    message('App started', 'Service <code>start</code> from file <code>modules/start.js</code> was created.');
}

Start.prototype = Object.create(null);
Start.prototype.constructor = Start;

/**
 * My Start
 *
 */
function Start() {
    // Do initialization of your app here
    // Load any additional modules

    message("Bootstrapping my app");

    // dna.service1.doStuff(); // dna.service1 is specified as requirement for Start - it is already loaded

    dna('service2', function() { // dna.service2 is not requirement so we can load it dynamically/asynchronously
        // dna.service2.doStuff();
        message("All services loaded");
    });

    message("App started");
}

Start.prototype = Object.create(null);
Start.prototype.constructor = Start;

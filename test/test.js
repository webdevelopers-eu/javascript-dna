var distPath = '../'; // document.querySelector('script[src*="test.js"]').src.replace(/test.js(\?.*)?$/, '');

// Test call before DNA is loaded
var dna = dna || [];
dna.push({
    'id': 'Test16',
    'load': distPath + 'test/generator.php?16'
});

// Start standard tests
dna.push(function() {
    var $table = $('<table border="1" style="max-width: 100%" style="white-space: nowrap;"><caption>DNA Test (<a href="?' + (new Date) + '#">all</a>)</caption></table>').appendTo('body');
    window.testError = function(text) {
        $('<div style="color: red;"></div>').text(text).insertAfter($table);
    };

    function addTest(name, seconds) {
        if (location.hash.match(/^#!test=/) && location.hash != '#!test=' + name) {
            return false;
        }

        seconds = seconds || 2;
        var $result = $('<td class="status" style="white-space: nowrap; font-weight: bold;"><i style="color: silver;">Waiting ' + seconds + ' sec...</i></td>');
        var $name = $('<td style="white-space: nowrap;" class="name"></td>').append($('<a href="?' + (new Date) + '#!test=' + name + '"></a>').text(name));
        var $details = $('<td class="details" style="color: gray; white-space: pre-wrap; font-style: fixed;"></td>').text('timeout: ' + seconds + 's');
        var $tr = $('<tr></tr>')
                .appendTo($table)
                .append($result)
                .append($name)
                .append($details)
        ;
        var timer = setTimeout(function() {
            $result.css({'color': 'red'}).text('FAILED (timed out)');
        }, seconds * 1000);

        var cb = function (retVal, args) {
            // console.log('Test callback "' + name + '": ' + JSON.stringify(retVal));
            clearTimeout(timer);
            $details.text($details.text() + '; received value: ' + JSON.stringify(retVal));
            $details.text($details.text() + '; arguments/types: ' + $.makeArray(args).map(function(x) {return $.type(x) == 'error' ? x.name + '[' + x.message + ']' : $.type(x);}).join(', ') + '; arguments/JSON: ' + JSON.stringify(args) + '');
            if (retVal !== true) {
                $result.css({'color': 'red'}).text('FAILED');
            } else {
                $result.css({'color': 'green'}).text('SUCCESS');
            }
        };

        return function(retVal, argTypes) {
            if (!argTypes) argTypes = [];
            return function() {
                for (let i in argTypes) {
                    if ($.type(arguments[i]) != argTypes[i]) {
                        cb('error: unexpected arguments - expected: ' + argTypes.join(', ') + '', arguments);
                        return;
                    }
                }
                cb(retVal, arguments);
            };
        };
    }

    // ------------------------------------------------------------------------
    var test;

    // ------------------------------------------------------------------------
    test = addTest('Simple config registration');
    if (test) {
        window.dna({
            'proto': 'Test1',
            'require': 'Test2',
            'load': distPath + 'test/generator.php?1'
        },{
            'proto': 'Test2',
            'load': distPath + 'test/generator.php?2'
        }, 'Test1', 'Test2', test(true, ['function', 'function']))
            .fail(test('promise fail'));
    }

    // ------------------------------------------------------------------------
    test = addTest('Non-existing resource Promise failure');
    if (test) {
        window.dna({
            'proto': 'Test3',
            'load': 'about:blank'
        }, 'Test3', test(false))
            .fail(test(true));
    }

    // ------------------------------------------------------------------------
    test = addTest('Non-existing dependency failure', 5);
    if (test) {
        window.dna({
            'proto': 'Test4',
            'require': 'Test5',
            'load': distPath + 'test/generator.php?4'
        }, 'Test4', test(true))
            .fail(test(false));
        setTimeout(function() {
            dna({'id': 'Test5'});
        }, 2000);
    }

    // ------------------------------------------------------------------------
    test = addTest('JSON download'); // Test6-8
    if (test) {
        window.dna(distPath + 'test/test01.json', 'Test6')
            .done(test(true, ['function']))
            .fail(test(false))
        ;
    }

    // ------------------------------------------------------------------------
    test = addTest('Duplicate identifier');
    if (test) {
        window.dna({'proto': 'Test X'}, {'proto': 'Test X'})
            .fail(test(true));
    }

    // ------------------------------------------------------------------------
    test = addTest('Invalid identifier');
    if (test) {
        window.dna({'id': 'Test 7'})
            .fail(test(true));
    }

    // ------------------------------------------------------------------------
    test = addTest('Recursive requirements');
    if (test) {
        window.dna({
            'proto': 'Test9',
            'require': 'Test10',
            'load': distPath + 'test/generator.php?9'
        },{
            'proto': 'Test10',
            'require': 'Test9',
            'load': distPath + 'test/generator.php?10'
        }, 'Test9')
            .done(test(false))
            .fail(test(true));
    }

    // ------------------------------------------------------------------------
    test = addTest('HTML embeded resource');
    if (test) {
        window.dna({
            'proto': 'Test11',
            'load': distPath + 'test/test01.xml#test11'
        }, 'Test11')
            .done(test(true, ['function']))
            .fail(test(false));
    }

    // ------------------------------------------------------------------------
    test = addTest('HTML linked resource');
    if (test) {
        window.dna({
            'proto': 'Test12',
            'load': distPath + 'test/test01.xml#test12'
        }, 'Test12')
            .done(test(true, ['function']))
            .fail(test(false));
    }

    // ------------------------------------------------------------------------
    test = addTest('Configuration after requirement call');
    if (test) {
        window.dna('Test13', test(true))
            .fail(test(false));

        window.dna({
            'proto': 'Test13',
            'load': distPath + 'test/generator.php?13'
        });
    }

    // ------------------------------------------------------------------------
    test = addTest('Inclusion by id');
    if (test) {

        window.dna({
            'id': 'Test14',
            'require': 'Test15',
            'load': distPath + 'test/generator.php?14'
        }, {
            'id': 'Test15',
            'load': distPath + 'test/generator.php?15'
        }, 'Test14')
            .done(test(true))
            .fail(test(false));
    }

    // ------------------------------------------------------------------------
    test = addTest('Calls before DNA load');
    if (test) {
        window.dna('Test16' /* called before DNA load */)
            .done(test(true))
            .fail(test(false));
    }

    // ------------------------------------------------------------------------
    test = addTest('Evaluation test - dna');
    if (test) {
        var cb17 = [ test(false), test(true) ];
        window.dna({
            'proto': 'Test17',
            'load': distPath + 'test/generator.php?17',
            'eval': 'dna'
        }, 'Test17')
            .done(function() {
                dna.Test17 && !window.Test17 ? cb17[1]() : cb17[0]();
            })
            .fail(test(false));
    }

    // ------------------------------------------------------------------------
    test = addTest('Evaluation test - window');
    if (test) {
        var cb18 = [ test(false), test(true) ];
        window.dna({
            'proto': 'Test18',
            'load': distPath + 'test/generator.php?18',
            'eval': 'window'
        }, 'Test18')
            .done(function() {
                dna.Test18 && window.Test18 ? cb18[1]() : cb18[0]();
            })
            .fail(test(false));
    }

});

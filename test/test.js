var distPath = '../'; // document.querySelector('script[src*="test.js"]').src.replace(/test.js(\?.*)?$/, '');

// Test call before DNA is loaded
var dna = dna || [];
dna.push({
    'id': 'Test16',
    'load': distPath + 'test/generator.php?16'
});

// Start standard tests
dna.push(function() {
    var $table = $('<div class="list-group"></div>').appendTo('body');
    var $main = $('<a href="?' + (new Date) + '#" class="list-group-item"><span class="label label-info" style="font-size: 2em;">⌛</span><h1>All DNA Tests</h1></a>').appendTo($table);
    window.testError = function(text) {
        $('<div class="alert alert-danger"></div>').text(text).insertAfter($table);
    };

    function markItem($item, success) {
        $item
            .removeClass('list-group-item-danger list-group-item-success list-group-item-info')
            .addClass(success ? 'list-group-item-success' : 'list-group-item-danger')
            .find('.label')
            .removeClass('label-info label-danger label-success')
            .addClass(success ? 'label-success' : 'label-danger')
            .text(success ? '✓' : '✗');

        if (!$item.is($main)) {
            if ($('.list-group-item-danger, .alert-danger').length) {
                markItem($main, false);
            } else if (!$('.list-group-item-info').length) {
                markItem($main, true);
            }
        }
    }

    function addTest(name, seconds) {
        if (location.hash.match(/^#!test=/) && location.hash != '#!test=' + name) {
            return false;
        }

        seconds = seconds || 2;
        var $result = $('<span class="label label-info" style="font-size: 1.2em;">⌛</span>');
        var $name = $('<span></span>').text(name);
        var details = 'timeout: ' + seconds + 's';
        var $li = $('<a class="list-group-item list-group-item-info"></a>')
                .attr('href', '?' + (new Date) + '#!test=' + name)
                .attr('title', details)
                .appendTo($table)
                .append($name)
                .append($result)
        ;
        var timer = setTimeout(function() {
            markItem($li, false);
        }, seconds * 1000);

        var cb = function (retVal, args) {
            // console.log('Test callback "' + name + '": ' + JSON.stringify(retVal));
            clearTimeout(timer);
            $li.attr('title',
                     $li.attr('title') + '; ' +
                     'received value: ' + JSON.stringify(retVal) + '; ' +
                     'arguments/types: ' + $.makeArray(args).map(function(x) {return $.type(x) == 'error' ? x.name + '[' + x.message + ']' : $.type(x);}).join(', ') + '; ' +
                     'arguments/JSON: ' + JSON.stringify(args) +
                     ''
                    );
            markItem($li, retVal);
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

    // ------------------------------------------------------------------------
    test = addTest('Order of evaluations.');
    if (test) {
        var cb19 = [ test(false), test(true) ];
        window.dna({
            'id': 'Test19',
            'load': [
                distPath + 'test/generator.php?19&order[var]=orderTest19&order[id]=1&delay=1.5',
                distPath + 'test/generator.php?20&order[var]=orderTest19&order[id]=2&delay=0.0',
                distPath + 'test/generator.php?21&order[var]=orderTest19&order[id]=3&delay=1.5'
                ]
        }, 'Test19')
            .done(function() {
                cb19[window.orderTest19.join(' ') == '1 2 3' ? 1 : 0](window.orderTest19);
            })
            .fail(test(false));
    }

});

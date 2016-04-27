var distPath = '../'; // document.querySelector('script[src*="test.js"]').src.replace(/test.js(\?.*)?$/, '');
var classURL = function(query) {return distPath + 'test/generator.php?' + query;};
var dna = dna || [];

var minified = false;
if (location.hash.match(/^#minified/)) {
    document.write('<script type="text/javascript" defer src="../dna.min.js"></script>');
    minified = true;
} else {
    document.write('<script type="text/javascript" defer src="../dna.js"></script>');
}

var calledOnce = {};

// Test call before DNA is loaded
if (isTestActive('Calls before DNA load')) {
    dna.push({
        'id': 'Test16',
        'load': classURL('16')
    });
}

function isTestActive(name) {
    if (location.hash.match(/^#!test=/) && location.hash != '#!test=' + name) {
        return false;
    }
    return true;
}

// Start standard tests
dna.push(function() {
    $('.minified')
        .hide()
        .filter('#minified-' + (minified ? 'on' : 'off'))
        .show();

    var $table = $('<div class="list-group"></div>').appendTo('body');
    var $main = $('<a href="?' + (new Date) + '#" class="list-group-item all"><span class="label label-info" style="font-size: 2em;">⌛</span><h1>All DNA Tests</h1></a>').appendTo($table);
    window.testError = function(text) {
        $('<div class="alert alert-danger"></div>').text(text).insertBefore($table);
    };

    function markItem($item, success) {
        if ($item.is('.marked:not(.all)')) {
            success = false;
            $item.attr('title', $item.attr('title') + ' ERROR: Item was already resolved/rejected!');
            window.testError('Item "' + $item.text() + '" already resolved/rejected!');
        }
        $item
            .addClass('marked')
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

    function addTest(name) {
        if (!isTestActive(name)) return false;

        var seconds = 10;
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
            if ($li.is('.marked')) return;
            $li.attr('title', $li.attr('title') + ' ERROR: TIMED OUT!');
            window.testError('Item "' + $li.text() + '" timed out!');
            markItem($li, false);
        }, seconds * 1000);

        var cb = function (retVal, args) {
            // console.log('Test callback "' + name + '": ' + JSON.stringify(retVal));
            clearTimeout(timer);
            $li.attr('title',
                     $li.attr('title') + '; ' +
                     'callback arguments: ' + $.makeArray(args).map(function(x) {
                         return x instanceof Error ? x.name + '[' + (x.code || '[nocode]') + ' ' + x.message + ']' : JSON.stringify(x) || $.type(x);
                     }).join(', ') + '; ' +
                     ''
                    );
            markItem($li, retVal);
        };

        return function(retVal, argTypes) {
            if (!argTypes) argTypes = [];
            return function() {
                for (var i in argTypes) {
                    if ($.type(arguments[i]) != argTypes[i]) {
                        cb(false, 'error: unexpected arguments - expected: ' + argTypes.join(', ') + '', arguments);
                        return;
                    }
                }
                cb(retVal, arguments);
            };
        };
    }

    // ------------------------------------------------------------------------
    (function() {
        var test = addTest('Simple config registration');
        if (test) {
            window.dna({
                'proto': 'Test1',
                'require': 'Test2',
                'load': classURL('1')
            },{
                'proto': 'Test2',
                'load': classURL('2'),
                'eval': 'dna',
                'namespace': 'window'
            }, 'Test1', 'Test2', test(true, ['function', 'function']))
                .fail(test(false));
        }

    }());
    // ------------------------------------------------------------------------
    (function() {
        var test = addTest('Non-existing resource Promise failure');
        if (test) {
            window.dna({
                'proto': 'Test3',
                'load': 'about:blank'
            }, 'Test3', test(false))
                .fail(test(true));
        }

    }());
    // ------------------------------------------------------------------------
    (function() {
        var test = addTest('Non-existing dependency failure');
        if (test) {
            window.dna({
                'proto': 'Test4',
                'require': 'Test5',
                'load': classURL('4')
            }, 'Test4', test(true))
                .fail(test(false));
            setTimeout(function() {
                dna({'id': 'Test5'});
            }, 2000);
        }

    }());
    // ------------------------------------------------------------------------
    (function() {
        var test = addTest('JSON download'); // Test6-8
        if (test) {
            window.dna(distPath + 'test/test01.json', 'Test6')
                .done(test(true, ['function']))
                .fail(test(false))
            ;
        }

    }());
    // ------------------------------------------------------------------------
    (function() {
        var test = addTest('Duplicate identifier');
        if (test) {
            window.dna({'proto': 'Test X'}, {'proto': 'Test X'})
                .fail(test(true));
        }

    }());
    // ------------------------------------------------------------------------
    (function() {
        var test = addTest('Invalid identifier');
        if (test) {
            window.dna({'id': 'Test 7'})
                .fail(test(true));
        }

    }());
    // ------------------------------------------------------------------------
    (function() {
        var test = addTest('Recursive requirements');
        if (test) {
            window.dna({
                'proto': 'Test9',
                'require': 'Test10',
                'load': classURL('9')
            },{
                'proto': 'Test10',
                'require': 'Test9',
                'load': classURL('10')
            }, 'Test9')
                .done(test(false))
                .fail(test(true));
        }

    }());
    // ------------------------------------------------------------------------
    (function() {
        var test = addTest('HTML embeded resource');
        if (test) {
            window.dna({
                'proto': 'Test11',
                'load': distPath + 'test/test01.xml#test11'
            }, 'Test11')
                .done(test(true, ['function']))
                .fail(test(false));
        }

    }());
    // ------------------------------------------------------------------------
    (function() {
        var test = addTest('HTML linked resource');
        if (test) {
            window.dna({
                'proto': 'Test12',
                'load': distPath + 'test/test01.xml#test12'
            }, 'Test12')
                .done(test(true, ['function']))
                .fail(test(false));
        }

    }());
    // ------------------------------------------------------------------------
    (function() {
        var test = addTest('Configuration after requirement call');
        if (test) {
            window.dna('Test13', test(true))
                .fail(test(false));

            window.dna({
                'proto': 'Test13',
                'load': classURL('13')
            });
        }

    }());
    // ------------------------------------------------------------------------
    (function() {
        var test = addTest('Inclusion by id');
        if (test) {

            window.dna({
                'id': 'Test14',
                'require': 'Test15',
                'load': classURL('14')
            }, {
                'id': 'Test15',
                'load': classURL('15')
            }, 'Test14')
                .done(test(true))
                .fail(test(false));
        }

    }());
    // ------------------------------------------------------------------------
    (function() {
        var test = addTest('Calls before DNA load');
        if (test) {
            window.dna('Test16' /* called before DNA load */)
                .done(test(true))
                .fail(test(false));
        }

    }());
    // ------------------------------------------------------------------------
    (function() {
        var test = addTest('Evaluation test - dna factory');
        if (test) {
            var cb17 = [ test(false), test(true) ];
            window.dna({
                'proto': 'Test17',
                'load': classURL('17'),
                'eval': 'dna'
            }, 'Test17')
                .done(function() {
                    dna.Test17 && !window.Test17 ? cb17[1].apply(this, arguments) : cb17[0].apply(this, arguments);
                })
                .fail(test(false));
        }

    }());
    // ------------------------------------------------------------------------
    (function() {
        var test = addTest('Evaluation test - window namespace');
        if (test) {
            var cb18 = [ test(false), test(true) ];
            window.dna({
                'proto': 'Test18',
                'load': classURL('18'),
                'namespace': 'window'
            }, 'Test18')
                .done(function() {
                    dna.Test18 && window.Test18 ? cb18[1].apply(this, arguments) : cb18[0].apply(this, arguments);
                })
                .fail(test(false));
        }

    }());
    // ------------------------------------------------------------------------
    (function() {
        var test = addTest('Order of evaluations.');
        if (test) {
            var cb19 = [ test(false), test(true) ];
            window.dna({
                'id': 'Test19',
                'load': [
                    classURL('19&order[var]=orderTest19&order[id]=1&delay=4.0'),
                    classURL('20&order[var]=orderTest19&order[id]=2&delay=0.0'),
                    classURL('21&order[var]=orderTest19&order[id]=3&delay=3.0')
                ]
            }, 'Test19')
                .done(function() {
                    cb19[window.orderTest19.join(' ') == '1 2 3' ? 1 : 0](window.orderTest19);
                })
                .fail(test(false));
        }

    }());
    // ------------------------------------------------------------------------
    (function() {
        var test = addTest('Proto aliases.');
        if (test) {
            window.dna({
                'proto': 'Test22=Alias22=Alias22:v2=Alias22:v1',
                'load': classURL('22')
            }, 'Alias22:v2')
                .done(function() {
                    test(!dna.Test22 && dna.Alias22 && dna['Alias22:v2'] && dna['Alias22:v1'], ['function']).apply(this, arguments);
                })
                .fail(test(false));
        }
    }());
    // ------------------------------------------------------------------------
    (function() {
        var test = addTest('Dependency depth 32.');
        if (test) {
            var testId = 23, depDepth = 32, depWidth = 1;
            for (var depth = 0; depth < depDepth; depth++) {
                var conf = {
                    'proto': 'Test' + (testId + depth * depWidth),
                    'require': depth + 1 < depDepth ? 'Test' + (testId + (depth  + 1) * depWidth) : [],
                    'load': []
                };
                for (var width = 0; width < depWidth; width++) {
                    conf.load.push(classURL(testId + depth * depWidth + width));
                }
                window.dna(conf);
            }
            window.dna('Test' + testId, test(true, ['function'])).fail(test(false));
        }
    }());


    // ------------------------------------------------------------------------
    (function() {
        var test = addTest('Rewrite test.');
        if (test) {
            dna({
                'rewrite': function(url) {
                    console.log('Rewritting', url);
                    return url.replace(/^rewrite-test:1$/, classURL('55'));
                }
            }, {
                'rewrite': [function(url) {
                    console.log('Rewritting', url);
                    return url.replace(/^rewrite-test:2$/, classURL('56'));
                }]
            }, {
                'proto': 'Test55',
                'load': ['rewrite-test:2', 'rewrite-test:1']
            },
                'Test55'
               )
                .done(test(true, ['function']))
                .fail(test(false));
        }
    }());

    // ------------------------------------------------------------------------
    (function() {
        var test = addTest('Factory test.');
        if (test) {
            dna({
                'factory': {
                    'eval57': function(dfd, jString, protoName) {
                        dfd.resolve(123456);
                    }
                }
            }, {
                'proto': 'Test57',
                'load': classURL('57'),
                'eval': 'eval57'
            },
                'Test57'
               )
                .done(test(true, ['number']))
                .fail(test(false));
        }
    }());

    // ------------------------------------------------------------------------
    (function() {
        var test = addTest('Fetcher test.');
        if (test) {
            dna({
                'fetcher': {
                    'variable': function(dfd, uri) {
                        var jScript = 'function Test58() { console.log("Fetcher-generated function 58 for uri ' + uri + '!"); }';
                        console.log('Fetcher: generated: ' + jScript);
                        dfd.resolve(jScript);
                    }
                }
            }, {
                'proto': 'Test58',
                'load': 'variable:58'
            },
                'Test58'
               )
                .done(test(true, ['function']))
                .fail(test(false));
        }
    }());

    // // ------------------------------------------------------------------------
    // (function() {
    //     var test = addTest('Namespace test.');
    //     if (test) {
    //         dna({
    //             'proto': 'Test59',
    //             'load': classURL('59'),
    //             'namespace': 'ns:59'
    //         }, {
    //             'proto': 'Test60',
    //             'load': classURL('60'),
    //             'namespace': 'ns:59'
    //         }, {
    //             'proto': 'Test61',
    //             'load': classURL('61'),
    //             'namespace': 'ns:61'
    //         },
    //             'Test59', 'Test60', 'Test61'
    //            )
    //             .done(function(proto1, proto2, proto3) {
    //                 if (proto1() === proto2() && proto2() !== proto3()) {
    //                     test(true, ['function', 'function', 'function'])(arguments);
    //                 } else {
    //                     test(false)();
    //                 }
    //             })
    //             .fail(test(false));
    //     }
    // }());

});

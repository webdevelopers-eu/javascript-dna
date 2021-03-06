var timer = Date.now();
var dna = dna || [];
dna.push(function() {
    message('DNA loaded.', '<code>' + htmlescape($('<div></div>').append($('script[src $= "dna.js"]').clone()).html()) + '</code>');
});

// register default error handler to report unexpected errors
$(window).on('dna:fail', onError);

$(function() {
    if (!$('.list-group.messages').length) {
        $('body')
            .append('<div class="panel panel-default"><div class="panel-heading"><h3 class="panel-title">Javascript DNA / Examples</h3></div><div class="panel-body"></div></div>');
        $('.panel-body')
            .append('<div class="message-block"><h3>What Is Going On?</h3><ol class="list-group messages"></ol></div>');
    }

    message(); // flush buffer

    $('.reveal').each(function(k, v) {
        var code = $('<div></div>').append($(v).clone().removeAttr('class')).html();
        var escaped = $('<div></div>').text(code).html();

        escaped = escaped.replace(/([a-z./]+\/[a-z./]+)/g, '<a target="_tab" href="$1">$1</a>'); // links
        escaped = escaped.replace(/(\/\/.+)$/mg, '<span class="comment">$1</span>'); // comments

        $('<pre></pre>')
            .append(escaped)
            .appendTo('.panel-default');
    });

});

var message = (function() {
    var messages = [];

    return function (msgText, detailHTML, severity) {
        if (msgText) {
            var timerNew = Date.now();
            messages.push([msgText, detailHTML, severity, timerNew - timer]);
            timer = timerNew;
        }

        var $msgs = $ ? $('.list-group.messages') : {};
        if (!$msgs.length) {
            return msgText;
        }

        while (messages.length) {
            $('<li class="message list-group-item list-group-item-' + (messages[0][2] || 'common') + '"></li>')
                .append($('<span class="message-time"></span>').text('+' + (messages[0][3] / 1000) + 's'))
                .append($('<span class="message-main"></span>').text(messages[0][0]))
                .append($('<span class="message-detail"></span>').html(messages[0][1]))
                .appendTo($msgs);
            messages.shift();
        }

        return msgText;
    };
})();

function listArguments(args) {
    return '' + $.makeArray(args).map(function(v, k) {
        var type = $.type(v);
        switch (type) {
        case 'object':
        case 'function':
            return type;
        default:
            return JSON.stringify(v);
        }
    }).join(', ') + '';
}

function htmlescape(str) {
    return $('<div></div>').text(str).html();
}

function onError(ev, info) {
    message('DNA Deferred Object rejected.', 'Call to <code>dna(' + htmlescape(listArguments(info.dnaCallArguments)) + ')</code> failed. Fail callback parameters <code>function(' + htmlescape(listArguments(info.callbackCallArguments)) + ')</code>' , 'danger');
}

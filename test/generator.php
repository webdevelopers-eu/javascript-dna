<?php
header("Content-Type: text/javascript; charset=utf-8");
$num = $_SERVER['QUERY_STRING'];

echo "
function Test$num() {
    console.log('TEST: Service of class Test$num initialized.');
}

console.log('TEST: Proto Test$num loaded.');

// Check duplicate execution
window.loadRegistry = window.loadRegistry || {};
if (window.loadRegistry[$num]) {
    window.testError('ERROR: Resource Test$num loaded twice!');
}
window.loadRegistry[$num] = true;
";

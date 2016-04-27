<?php
header("Content-Type: text/javascript; charset=utf-8");
$num=(int) $_SERVER['QUERY_STRING'];

$inline=array();
if (is_array(@$_GET['order'])) {
    $inlineVar='window['.json_encode(@$_GET['order']['var']).']';
    $inline[]=$inlineVar.'='.$inlineVar.' || [];';
    $inline[]=$inlineVar.'.push('.json_encode(@$_GET['order']['id']).');';
}

if (is_numeric(@$_GET['delay'])) {
    sleep((float) $_GET['delay']);
    $inline[]='/* DELAYED BY '.((float) $_GET['delay']).' seconds */';
}

echo "
var localVar = localVar || [];
localVar.push($num);

function Test$num() {
    console.log('TEST: Service of class Test$num initialized.');
    return localVar;
}

//console.log('TEST: Proto Test$num loaded.');

// Check duplicate execution
window.loadRegistry = window.loadRegistry || {};
if (window.loadRegistry[$num]) {
    window.testError('ERROR: Resource Test$num loaded twice!');
}
window.loadRegistry[$num] = true;

".implode("\n", $inline);

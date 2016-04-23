message('Loading `class3.js');

// My class definition.
function Class3() {
    message('Object created using function `Class3`');
}

Class3.toString = function() {
    return '[I am Class3 from class3.js]';
};

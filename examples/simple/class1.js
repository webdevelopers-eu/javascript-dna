message('Loading `class1.js');

// My class definition.
function Class1() {
    message('Object created using function `Class1`');
}

Class1.toString = function() {
    return '[I am Class1 from class1.js]';
};

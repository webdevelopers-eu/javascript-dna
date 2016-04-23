message('Loading `class2.js');

// My class definition.
function Class2() {
    message('Object created using function `Class2`');
}

Class2.toString = function() {
    return '[I am Class2 from class2.js]';
};

/**
 * Generates a random integer between 0 (inclusive) and maxExcl (exclusive)
 * @param {number} maxExcl - The exclusive upper bound
 * @returns {number} A random integer in the range [0, maxExcl)
 */
function rndInt(maxExcl) {
    return Math.floor(Math.random() * (maxExcl - 0.01));
}

/**
 * Generates a random number between -1 and 1
 * @returns {number} A random number in the range [-1, 1]
 */
function biRnd() {
    return Math.random() * 2 - 1;
}

/**
 * Randomly selects an element from an array
 * @param {Array} array - The array to choose from
 * @returns {*} A random element from the array
 */
function choose(array) {
    return array[rndInt(array.length)];
}

export {
    rndInt,
    biRnd,
    choose,
};
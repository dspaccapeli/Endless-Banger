/**
 * Creates a generic parameter with a name and value
 * @param {string} name - The name of the parameter
 * @param {*} value - The initial value
 * @returns {Object} A parameter object with value, name, and subscribe functionality
 */
function genericParameter(name, value) {
    let listeners = [];
    const state = { value };
    
    function subscribe(callback) {
        callback(state.value);
        listeners.push(callback);
    }

    function publish() {
        for (let l of listeners) {
            l(state.value);
        }
    }
    
    return {
        name,
        subscribe,
        get value() { return state.value; },
        set value(v) { state.value = v; publish(); }
    };
}

/**
 * Creates a trigger parameter (boolean parameter)
 * @param {string} name - The name of the trigger
 * @param {boolean} [value=false] - The initial value
 * @returns {Object} A trigger parameter object
 */
function trigger(name, value = false) {
    return genericParameter(name, value);
}

/**
 * Creates a numeric parameter with bounds
 * @param {string} name - The name of the parameter
 * @param {[number, number]} bounds - The minimum and maximum values
 * @param {number} [value] - The initial value
 * @returns {Object} A numeric parameter object with bounds
 */
function parameter(name, bounds, value) {
    return Object.assign(genericParameter(name, value), {bounds});
}

export {
    genericParameter,
    trigger,
    parameter
};

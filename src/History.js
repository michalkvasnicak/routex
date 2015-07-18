export default class History {
    constructor() {
        ['pushState', 'replaceState', 'addPopStateListener', 'state', 'path', 'query'].forEach(
            (method) => {
                if (typeof this[method] !== 'function') {
                    throw Error(`Routex.History: missing ${method} method on ${this.constructor.name}`);
                }
            }
        );
    }
}

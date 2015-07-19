export default class History {
    constructor() {
        ['pushState', 'replaceState', 'addPopStateListener', 'state', 'pathname', 'query'].forEach(
            (method) => {
                if (typeof this[method] !== 'function') {
                    throw Error(`History: missing ${method} method on ${this.constructor.name}`);
                }
            }
        );
    }
}

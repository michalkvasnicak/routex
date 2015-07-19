import History from './History';

export default class MemoryHistory extends History {

    constructor(path = '/', query = {}) {
        super();

        this._path = path;
        this._query = query;

        this._currentState = null;
    }

    /**
     * Gets current state (in case of initial load it is null)
     *
     * @returns {null|{ name: string, path: string, query: object, vars: object, params: object }}
     */
    state() {
        return this._currentState;
    }

    /**
     * Gets current path
     *
     * @returns {string}
     */
    pathname() {
        return this._path;
    }

    /**
     * Gets current query params
     *
     * @returns {Object}
     */
    query() {
        return this._query;
    }

    /**
     * Pushes new route to history
     *
     * @param {Object} resolvedRoute
     */
    pushState(resolvedRoute = {}) {
        this._currentState = resolvedRoute;
    }

    /**
     * Replaces current state with new one
     *
     * @param {Object} resolvedRoute
     */
    replaceState(resolvedRoute = {}) {
        this._currentState = resolvedRoute;
    }

    /**
     * Adds popState event listener
     */
    addPopStateListener() {
        // do nothing
    }
}

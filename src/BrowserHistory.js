import History from './History';
import qs from 'qs';

const parseQuery = qs.parse;
const stringifyQuery = (params) => qs.stringify(params, { arrayFormat: 'brackets' });

export default class BrowserHistory extends History {

    constructor() {
        super();

        /**
         * Current state of history
         *
         * @type {{ name: string, path: string, query: object, vars: object, params: object }|null}
         * @private
         */
        this._currentState = window.history.state || null;

        /**
         * Contains listeners for popState
         *
         * @type {Function[]}
         * @private
         */
        this._popStateListeners = [];

        this._handlePopState = this._handlePopState.bind(this);

        // register popstate listeners
        if (window.addEventListener) {
            window.addEventListener('popstate', this._handlePopState, true);
        } else {
            window.attachEvent('onpopstate', this._handlePopState);
        }
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
        return window.location.pathname;
    }

    /**
     * Gets current query params
     *
     * @returns {Object}
     */
    query() {
        return parseQuery((window.location.search || '?').substr(1));
    }

    /**
     * Handles pop state event
     *
     * @param {PopStateEvent} event
     * @private
     */
    _handlePopState(event) {
        if (!event.state) {
            return;
        }

        this._currentState = event.state;

        this._popStateListeners.forEach(
             (listener) => listener(
                 event.state
             )
        );
    }

    /**
     * Pushes new route to history
     *
     * @param {Object} resolvedRoute
     */
    pushState(resolvedRoute = {}) {
        const { name, vars, query, path } = resolvedRoute;

        this._currentState = resolvedRoute;

        const queryString = stringifyQuery(resolvedRoute.query) || '';

        window.history.pushState(
            { name, vars, query, path},
            '',
            path + (queryString ? `?${queryString}` : '')
        );
    }

    /**
     * Replaces current state with new one
     *
     * @param {Object} resolvedRoute
     */
    replaceState(resolvedRoute = {}) {
        const { name, vars, path, query } = resolvedRoute;

        this._currentState = resolvedRoute;
        const queryString = stringifyQuery(resolvedRoute.query) || '';

        window.history.replaceState(
            { name, vars, path, query },
            '',
            path + (queryString ? `?${queryString}` : '')
        );
    }

    /**
     * Adds popState event listener
     *
     * @param {Function} listener
     * @returns {Function}  removeListener function
     */
    addPopStateListener(listener) {
        const type = typeof listener;

        if (type !== 'function') {
            throw Error(`Routex.BrowserHistory listener should be function, ${type} given`);
        }

        const { _popStateListeners } = this;

        _popStateListeners.push(listener);

        return function removeListener() {
            const index = _popStateListeners.indexOf(listener);
            _popStateListeners.splice(index);
        };
    }
}

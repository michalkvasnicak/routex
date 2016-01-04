import Route from './Route';
import { normalizeRouteDefinition, runRouteHandlers } from './utils/routeUtils';
import { resolveWithFirstMatched } from './utils/routerUtils';
import { Actions } from 'history';
import invariant from 'invariant';
import { RouteNotFoundError } from './errors';
import { createHref, parseQuery } from './utils/urlUtils';

function instantiateRoutes(routes) {
    return routes.map((definition) => {
        const normalized = normalizeRouteDefinition(definition);

        return new Route(
            normalized.path,
            undefined,
            normalized.children,
            normalized.onEnter,
            normalized.onLeave,
            normalized.component
        );
    });
}

export default class Router {
    constructor(
        routes = [],
        history,
        onTransition = function transitionFinished() {}
    ) {
        invariant(Array.isArray(routes), `Routes should be an array, ${typeof routes} given.`);
        invariant(
            typeof onTransition === 'function',
            `Router onTransition callback should be a function, ${typeof onTransition} given.`
        );

        this.routes = instantiateRoutes(routes);

        // enable queries means that query parameters can be used directly as objects
        this.history = history;

        this.onTransition = onTransition || function transitionFinished() {};

        this.listeners = {
            changeStart: [],
            changeSuccess: [],
            changeFail: [],
            notFound: []
        };

        this.location = null;

        this.handlerWrappers = {
            onEnter(onEnter) {
                return onEnter();
            },
            onLeave(onLeave) {
                return onLeave();
            }
        };

        this._currentRoute = null;
    }

    listen() {
        // listen to popState event
        this.history.listen(this._handleChange.bind(this));
    }

    _handleChange(location) {
        this.location = location;

        if (location.action === Actions.POP) {
            // on handle pop state (we are moving in history)
            // just match route and call change success because we are assuming that everything has been already resolved
            // so just change route

            resolveWithFirstMatched(this.routes, location.pathname, parseQuery(location.search)).then(
                (newRoute) => {
                    this._currentRoute = newRoute;

                    // replace state with new route if is not set (initial load)
                    if (!location.state) {
                        this.history.replaceState(
                            newRoute,
                            createHref(location.pathname, parseQuery(location.search))
                        );
                    }

                    this._callEventListeners('changeSuccess', newRoute);

                    // do nothing about state because it is already store
                    this.onTransition(null, newRoute);
                },
                () => {
                    const e = new RouteNotFoundError('Route not found');
                    this._callEventListeners('notFound', location.pathname, parseQuery(location.search));
                    this.onTransition(e);
                }
            );
        }
    }

    currentRoute() {
        return this._currentRoute;
    }

    _wrapRouteHandler(name, wrapper) {
        invariant(
            typeof wrapper === 'function',
            `${name} handler wrapper should be a function, ${typeof wrapper} given.`
        );

        this.handlerWrappers[name] = wrapper;
    }

    _callEventListeners(name, ...args) {
        this.listeners[name].forEach((listener) => listener(...args));
    }

    _registerEventListener(name, listener) {
        invariant(
            typeof listener === 'function',
            `${name} event listener should be function, ${typeof listener} given.`
        );

        const listeners = this.listeners[name];

        listeners.push(listener);

        return function unsubscribe() {
            const index = listeners.indexOf(listener);
            listeners.splice(index);
        };
    }

    addChangeStartListener(listener) {
        return this._registerEventListener('changeStart', listener);
    }

    addChangeSuccessListener(listener) {
        return this._registerEventListener('changeSuccess', listener);
    }

    addChangeFailListener(listener) {
        return this._registerEventListener('changeFail', listener);
    }

    addNotFoundListener(listener) {
        return this._registerEventListener('notFound', listener);
    }

    /**
     * Wraps route onEnter handler
     *
     * @param {Function} handler
     */
    wrapOnEnterHandler(handler) {
        this._wrapRouteHandler('onEnter', handler);
    }

    /**
     * Wraps route onLeave handler
     *
     * @param {Function} handler
     */
    wrapOnLeaveHandler(handler) {
        this._wrapRouteHandler('onLeave', handler);
    }

    /**
     * Starts router transition
     *
     * @param {String} path
     * @param {Object} query
     * @returns {Promise}
     */
    run(path, query = {}) {
        const rejectTransition = (reason) => {
            const err = new Error(reason);

            return (parentErr) => {
                const e = parentErr || err;
                this._callEventListeners('changeFail', e, this._currentRoute, this);
                this.onTransition(e);

                throw err;
            };
        };

        const resolveComponents = (components) => {
            if (!Array.isArray(components)) {
                return Promise.resolve([]);
            }

            // go through components and if function, call it
            return Promise.all(
                components.map((component) => {
                    if (typeof component === 'function') {
                        try {
                            // if is react class, it throws error
                            const result = component();

                            if (typeof result.then === 'function') {
                                return result;
                            }

                            return component;
                        } catch (e) {
                            return component;
                        }
                    }

                    return component;
                })
            );
        };

        const finishRun = (resolvedRoute) => {
            this._currentRoute = resolvedRoute;
            this._callEventListeners('changeSuccess', resolvedRoute);

            this.history.pushState(resolvedRoute, createHref(path, query));

            this.onTransition(null, resolvedRoute);

            return resolvedRoute;
        };

        const runResolvedRoute = (resolvedRoute) => {
            const currentRoute = this._currentRoute;
            this._callEventListeners('changeStart', currentRoute, resolvedRoute, this);

            const handlerWrappers = this.handlerWrappers;

            // call on leave in order (so we can cancel transition)
            return runRouteHandlers('onLeave', currentRoute, handlerWrappers, resolvedRoute, this).then(
                () => runRouteHandlers('onEnter', resolvedRoute, handlerWrappers, currentRoute, resolvedRoute, this).then(
                    () => resolveComponents(resolvedRoute.components).then(
                        (components) => {
                            return finishRun({ ...resolvedRoute, components });
                        },
                        rejectTransition('Route components cannot be resolved')
                    ),
                    rejectTransition('Route onEnter handlers are rejected.')
                ),
                rejectTransition('Current route onLeave handlers are rejected.')
            );
        };

        const notFound = () => {
            const err = new RouteNotFoundError('Route not found');
            this._callEventListeners('notFound', path, query);
            this.onTransition(err);

            throw err;
        };

        return resolveWithFirstMatched(this.routes, path, query).then(
            runResolvedRoute,
            notFound
        );
    }
}

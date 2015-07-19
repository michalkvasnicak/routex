import Route from './Route';
import { normalizeRouteDefinition } from './utils/routeUtils';
import { resolveWithFirstMatched } from './utils/routerUtils';
import invariant from 'invariant';
import History from './History';
import { RouteNotFoundError } from './errors';

function instantiateRoutes(routes) {
    return routes.map((definition) => {
        const normalized = normalizeRouteDefinition(definition);

        return new Route(
            normalized.path,
            '',
            normalized.children,
            normalized.onEnter,
            normalized.onLeave,
            normalized.component
        );
    });
}

export default class Router {
    constructor(routes = [], history, onTransition = function transitionFinished() {}) {
        invariant(Array.isArray(routes), `Routes should be an array, ${typeof routes} given.`);
        invariant(history instanceof History, 'Router history should be a subclass of History.');
        invariant(
            typeof onTransition === 'function',
            `Router onTransition callback should be a function, ${typeof onTransition} given.`
        );

        this.routes = instantiateRoutes(routes);

        this.history = history;

        this.onTransition = onTransition || function transitionFinished() {};

        this.listeners = {
            changeStart: [],
            changeSuccess: [],
            changeFail: [],
            notFound: []
        };

        this.handlerWrappers = {
            onEnter(onEnter) {
                return onEnter();
            },
            onLeave(onLeave) {
                return onLeave();
            }
        };

        this._currentRoute = null;

        // listen to popState event
        this.history.addPopStateListener(this._handlePopState.bind(this));
    }

    _handlePopState(resolvedRoute) {
        // on handle pop state (we are moving in history)
        // just match route and call change success because we are assuming that everything has been already resolved
        // so just change route

        resolveWithFirstMatched(this.routes, resolvedRoute.pathname, resolvedRoute.query).then(
            (newRoute) => {
                this._currentRoute = newRoute;
                this._callEventListeners('changeSuccess', newRoute);

                // do nothing about state because it is already store

                this.onTransition(null, newRoute);
            }
        );
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

    run(path, query = {}) {
        return new Promise((resolve, reject) => {
            // runs route handler bound to given arguments (from our code)
            // wrapper can call it with additional parameters
            const runWrappedHandler = (originalHandler, originalProps, wrapper) => {
                return wrapper(
                    originalHandler.bind(this, ...originalProps)
                );
            };

            const runRouteHandlers = (handlers, route, ...args) => {
                return new Promise((_resolve, _reject) => {
                    // resolve if current route is not defined (initial load for onLeave?)
                    if (!route) {
                        return _resolve();
                    }

                    return Promise.all(
                        route[handlers].map(
                            (handler) => runWrappedHandler(handler, args, this.handlerWrappers[handlers])
                        )
                    ).then(_resolve, _reject);
                });
            };

            const rejectTransition = (reason) => {
                const err = Error(reason);

                return (parentErr) => {
                    const e = parentErr || err;
                    this._callEventListeners('changeFail', e, this._currentRoute, this);
                    this.onTransition(e);
                    reject(e);
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

                if (this.history.state()) {
                    this.history.pushState(resolvedRoute);
                } else {
                    this.history.replaceState(resolvedRoute);
                }

                this.onTransition(null, resolvedRoute);
                resolve(resolvedRoute);
            };

            const runResolvedRoute = (resolvedRoute) => {
                this._callEventListeners('changeStart', this._currentRoute, resolvedRoute, this);

                // call on leave in order (so we can cancel transition)
                // todo call transition hooks in order?
                runRouteHandlers('onLeave', this._currentRoute, resolvedRoute, this).then(
                    () => runRouteHandlers('onEnter', resolvedRoute, this._currentRoute, resolvedRoute, this).then(
                        () => resolveComponents(resolvedRoute.components).then(
                            (components) => finishRun({ ...resolvedRoute, components }),
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
                reject(err);
            };

            resolveWithFirstMatched(this.routes, path, query).then(
                runResolvedRoute,
                notFound
            );
        });
    }
}

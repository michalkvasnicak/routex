import {
    ROUTE_CHANGE_START,
    ROUTE_CHANGE_FAIL,
    ROUTE_CHANGE_SUCCESS,
    TRANSITION_TO
} from './actionTypes';

import {
    changeSuccess,
    changeFail,
    notFound,
    changeStart
} from './actions';

import qs from 'qs';

/**
 * Trims slashes from path end
 *
 * @param {string} path
 * @returns {string}
 */
function trimSlashesFromPathEnd(path) {
    return path.replace(/(\/)$/, '');
}

/**
 * Normalizes occurrences of multiple slashes in one place to just one slash
 *
 * @param {string} path
 * @returns {string}
 */
function normalizeSlashes(path) {
    return path.replace(/(\/)+\//g, '/');
}


/**
 * Are routes equal?
 *
 * @param {{ name: string, components: Array, vars: Object, query: Object }} current
 * @param {{ name: string, components: Array, vars: Object, query: Object }} next
 *
 * @returns {boolean}
 */
function areRoutesEqual(current, next) {
    if (!current) {
        return false;
    }

    if (current === next) {
        return true;
    }

    if (current.name !== next.name) {
        return false;
    }

    if (current.components.toString() !== next.components.toString()) {
        return false;
    }

    if (JSON.stringify(current.vars) !== JSON.stringify(next.vars)) {
        return false;
    }

    if (JSON.stringify(current.query) !== JSON.stringify(next.query)) {
        return false;
    }

    // we don't need to check params because they are resolved using given vars and query so
    // if they are not changed, it is the same

    return true;
}

/**
 * Builds RegExp matcher
 *
 * @param {string} pathPattern
 *
 * @returns {{ matcher: Function, generator: Function }}
 */
function buildPathMatcherAndGenerator(pathPattern) {
    // first find all variables
    let pathRegexp;
    let generatorPattern;
    let variableNames = [];
    let variablePatterns = [];

    // normalize slashes, trim slashes from end
    // and parse path pattern to variable names, etc
    pathRegexp = normalizeSlashes(pathPattern);
    pathRegexp = generatorPattern = trimSlashesFromPathEnd(pathRegexp);
    pathRegexp = pathRegexp.replace(/:([a-zA-Z]+)(\{(.+)})?/g, (match, variableName, _, variablePattern) => {
        if (variableName) {
            variableNames.push(variableName);
        }

        const pattern = variablePattern || '[^/]+';

        variablePatterns.push(pattern);

        return `(${pattern})`;
    });

    pathRegexp += '/?';

    generatorPattern = generatorPattern.replace(/:([a-zA-Z]+)(\{.+})?/g, (match, variableName) => `[${variableName}]`);

    const matcher = (
        (pattern, variables) => {
            return (pathToMatch) => {
                const matched = pathToMatch.match(new RegExp(`^${pattern}$`, 'i'));

                if (!matched || !matched.length) {
                    return false;
                }

                let vars = {};

                variables.forEach((name, index) => {
                    vars[name] = matched[index + 1];
                });

                return {
                    vars: vars
                };
            };
        }
    )(pathRegexp, variableNames);

    const generator = (
        (variables, patterns, pattern) => {
            return (routeName, params = {}) => {
                let path = pattern || '/';

                // validate and interpolate variables
                variables.forEach((variableName, index) => {
                    if (!params.hasOwnProperty(variableName)) {
                        throw Error(
                            `Parameter \`${variableName}\` of route \`${routeName}\` is not specified.`
                        );
                    }

                    const regex = new RegExp(`^${patterns[index]}$`);

                    if (!regex.test(params[variableName])) {
                        throw Error(
                            `Parameter \`${variableName}\` of route \`${routeName}\` has invalid value. Check route definition.`
                        );
                    }

                    path = path.replace(`[${variableName}]`, params[variableName]);

                    delete params[variableName];
                });

                const stringifiedQuery = qs.stringify(params, { arrayFormat: 'brackets' });

                return {
                    path,
                    query: params,
                    href: path + (!!stringifiedQuery ? `?${stringifiedQuery}` : '' )
                };
            };
        }
    )(variableNames, variablePatterns, generatorPattern);

    // return matcher
    // which returns matched parameters
    return {
        matcher,
        generator
    };
}

/**
 * Flatten nested routes to array
 *
 * @param {Array.<Object>}routes
 * @param {string} basePath
 * @param {Array.<Function>} onEnter
 * @param {Array.<Function>} onLeave
 *
 * @returns {Array}
 */
function flattenRoutes(routes = [], basePath = '/', onEnter = [], onLeave = []) {
    let flattenedRoutes = [];

    routes.forEach((route) => {
        if (!route.hasOwnProperty('name')) {
            throw Error('Routerio.Router: All routes should have names');
        }

        const currentRoutePath = basePath + '/' + route.path;
        const currentOnEnter = route.onEnter || function onEnterDefault() { return Promise.resolve(); };
        const currentOnLeave = route.onLeave || function onLeaveDefault() { return Promise.resolve(); };

        if (route.hasOwnProperty('children')) {
            flattenedRoutes = flattenedRoutes.concat(
                flattenRoutes(
                    route.children,
                    currentRoutePath,
                    [...onEnter, currentOnEnter ],
                    [ currentOnLeave, ...onLeave ]
                ).map((flattenedRoute) => {
                    return {
                        ...flattenedRoute,
                        components: [route.component, ...flattenedRoute.components]
                    };
                })
            );
        }

        const matcherAndGenerator = buildPathMatcherAndGenerator(currentRoutePath);

        flattenedRoutes.push({
            name: route.name,
            ...matcherAndGenerator,
            onEnter: [ ...onEnter, currentOnEnter ],
            onLeave: [ currentOnLeave, ...onLeave ],
            components: [route.component]
        });
    });

    return flattenedRoutes;
}


/**
 * Creates matchers and routes
 *
 * @param {Array.<Object>} routes
 * @param {string} basePath
 * @returns {{routes: {}, matchers: Array.<Function>}}
 */
function createRoutesAndMatchers(routes = [], basePath = '/') {
    const _routes = {};
    const _matchers = [];

    flattenRoutes(routes, basePath).forEach((route) => {
        _routes[route.name] = route;
        _matchers.push(
            (path, query) => {
                const match = route.matcher(path, query);

                if (!match) {
                    return false;
                }

                return {
                    ...route,
                    path,
                    query,
                    vars: match.vars
                };
            }
        );
    });

    return {
        routes: _routes,
        matchers: _matchers
    };
}

/**
 * Runs route handlers with given name
 *
 * @param {string} key
 * @param {Object} route
 * @param {Array} handlerArgs
 *
 * @returns {Promise}
 */
function runRouteHandlers(key, route, handlerArgs) {
    // ugly hack because initial state has null route
    if (route === null) {
        return Promise.resolve();
    }

    let handlers = route[key] || [true];

    if (Array.isArray(handlers)) {
        handlers = handlers.map((handler) => { return handler(...handlerArgs); });
    } else if (typeof handlers === 'function') {
        handlers = [handlers(...handlerArgs)];
    } else {
        return Promise.resolve();
    }

    return Promise.all(handlers);
}

/**
 * Runs route (resolves all handlers)
 *
 * @param {Object} route
 * @param {Object} previousRoute
 * @param {Function} dispatch
 * @param {Function} getState
 *
 * @returns {Promise}
 */
function runRoute(route, previousRoute, dispatch, getState) {
    function rejectHandlersWithError(key, _route, reject) {
        return () => { reject(Error(`${key} handlers on route ${_route.name} are not resolved.`)); };
    }

    return new Promise((resolve, reject) => {
        runRouteHandlers('onLeave', previousRoute, [route, dispatch, getState]).then(
            () => runRouteHandlers('onEnter', route, [previousRoute, route, dispatch, getState]).then(
                () => resolve(route),
                rejectHandlersWithError('onEnter', route, reject)
            ),
            rejectHandlersWithError('onLeave', previousRoute, reject)
        );
    });
}

/**
 * Matches route using path
 *
 * @param {Array.<Function>} matchers
 * @param {Object} currentRoute
 * @param {string} path
 * @param {Object} query
 * @param {Function} dispatch
 * @param {Function} getState
 *
 * @returns {Promise}
 */
function matchRoute(matchers, currentRoute, path, query, dispatch, getState) {
    return new Promise((resolve, reject) => {
        function resolveRoute(resolvedRoute) {
            dispatch(changeSuccess(resolvedRoute));
            resolve(resolvedRoute);
        }

        function rejectRoute(err) {
            dispatch(changeFail(currentRoute, err));
            reject(err);
        }

        for (let matcher of matchers) {
            const matched = matcher(path, query);

            if (matched) {
                if (!areRoutesEqual(currentRoute, matched)) {
                    dispatch(changeStart(currentRoute, matched));

                    // check if current and matched are not the same, if yes just resolve with current route
                    runRoute(matched, currentRoute, dispatch, getState).then(
                        resolveRoute,
                        rejectRoute
                    );
                } else {
                    // we are on same route, so do nothing (no action is dispatched)
                    resolve(currentRoute);
                }

                return;
            }
        }

        dispatch(notFound());
        reject(Error('Route not found'));
    });
}

/**
 * Rehydrates route (adds components, onEnter, onLeave, resolve)
 *
 * This is mainly used because we can't serialize functions to JSON
 *
 * @param {Object.<string, Object>} routes
 * @param {Object} route
 *
 * @returns {{name: string, path: string, query: Object, vars: Object, onEnter: *, onLeave: *, resolve: *, components: *}}
 */
function rehydrateRoute(routes, route) {
    const { onEnter, onLeave, resolve, components } = routes[route.name];

    return {
        ...route,
        onEnter,
        onLeave,
        resolve,
        components
    };
}

/**
 * Processes route (tries to match it and calls onTransition on finish)
 *
 * @param {Array.<Function>} matchers
 * @param {Object} currentRoute
 * @param {string} path
 * @param {object} query
 * @param {Function} changeState
 * @param {Function} onTransition
 * @param {Function} dispatch
 * @param {Function} getState
 */
function processRoute(matchers, currentRoute, path, query = {}, changeState, onTransition, dispatch, getState) {
    const onFinish = typeof onTransition === 'function' ? onTransition : () => {};

    matchRoute(matchers, currentRoute, path, query, dispatch, getState).then(
        (resolvedRoute) => {
            changeState(resolvedRoute);
            onFinish(null, resolvedRoute);
        },
        (err) => onFinish(err)
    );
}

/**
 * Creates routex high order store and reducer that can be used to compose redux
 *
 * @param {Array.<{ name: string, path: string, onEnter: Function, onLeave: Function, resolve: Function component: Object, children: Array }>} routes
 * @param {BrowserHistory|MemoryHistory|HashHistory} history
 * @param {Function} onTransition
 *
 * @returns {{store: routerHighOrderStore, reducer: {router: routerReducer}}}
 */
export default function createRoutex(routes, history, onTransition) {
    const routersAndMatchers = createRoutesAndMatchers(routes);
    const initialReducerState = { state: 'INITIAL', route: null };

    /**
     * Creates router high order store
     *
     * @returns {Function}
     */
    function routerHighOrderStore() {
        return (next) => (reducer, initialState) => {
            let modifiedState = initialState;

            // check if initial state is object and set initial router state or rehydrate existing
            if (typeof initialState === 'object' && initialState !== null) {
                const { router } = initialState;

                // if router is not specified, set initialReducerState as router
                if (!router) {
                    modifiedState = { ...initialState, router: initialReducerState };
                } else if (!!router.route) {
                    // rehydrate route
                    modifiedState.router.route = rehydrateRoute(routersAndMatchers.routes, modifiedState.router.route);
                }
            } else {
                modifiedState = { router: initialReducerState };
            }

            const store = next(reducer, modifiedState);

            // listen to history pop state events
            // if it is pop state we assume that state is known, so route is changed immediately
            history.addPopStateListener(
                (resolvedRoute) => store.dispatch(
                    changeSuccess(
                        rehydrateRoute(
                            routersAndMatchers.routes,
                            resolvedRoute
                        )
                    )
                )
            );

            // initial run (after load) get current state from history (if not set, runRoute and replaceState)
            if (!history.state()) {
                const currentRoute = modifiedState.router.route;

                processRoute(
                    routersAndMatchers.matchers,
                    currentRoute,
                    history.path(),
                    history.query(),
                    (state) => history.replaceState(state),
                    onTransition,
                    (action) => store.dispatch(action),
                    () => store.getState()
                );
            }

            /**
             * Dispatch function of this store
             *
             * @param {*} action
             * @returns {*}
             */
            function dispatch(action) {
                if (typeof action !== 'object' || !action.hasOwnProperty('type') || action.type !== TRANSITION_TO) {
                    return store.dispatch(action);
                }

                processRoute(
                    routersAndMatchers.matchers,
                    store.getState().router.route,
                    action.path,
                    action.query,
                    (state) => history.pushState(state),
                    onTransition,
                    (_action) => dispatch(_action),
                    () => store.getState()
                );
            }

            /**
             * Generates link for given route and params
             *
             * @param {string} routeName
             * @param {Object} params
             * @returns {{ path: string, query: Object, href: string }}
             */
            function generateLink(routeName, params) {
                if (typeof routersAndMatchers.routes[routeName] !== 'object') {
                    throw Error(`Route \`${routeName}\` does not exist.`);
                }

                return routersAndMatchers.routes[routeName].generator(routeName, params);
            }

            return {
                ...store,
                generateLink,
                dispatch
            };
        };
    }

    function routerReducer(state = initialReducerState, action) {
        switch (action.type) {
            case ROUTE_CHANGE_START:
                return {
                    state: 'TRANSITIONING',
                    nextRoute: action.route,
                    route: state.route
                };
            case ROUTE_CHANGE_SUCCESS:
                return {
                    state: 'TRANSITIONED',
                    route: action.route
                };
            case ROUTE_CHANGE_FAIL:
                return {
                    state: 'TRANSITIONED',
                    route: action.route, // will be set to previous route
                    error: action.error
                };
            /*
            todo: not found make as only action which can user listen to and make redirects?
            case 'ROUTE_NOT_FOUND':
                return {
                    state: 'TRANSITIONED',
                    route: action.route // set to previous route
                };*/
            default:
                return state;
        }
    }

    return {
        store: routerHighOrderStore,
        reducer: { router: routerReducer }
    };
}

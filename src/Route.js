import invariant from 'invariant';
import { buildMatcher, normalizeRouteDefinition } from './utils/routeUtils';
import { resolveWithFirstMatched } from './utils/routerUtils';
import {
    NoRoutesToResolveError
} from './errors';

/**
 * Resolves async routes and returns Promise which resolves to normalized definitions
 *
 * @param {Function} children
 * @returns {Promise}
 */
function resolveAsyncRoutes(children) {
    return new Promise((resolve, reject) => {
        const routes = children();

        if (!(routes instanceof Promise)) {
            const type = typeof routes;

            reject(
                Error(`Async route definition resolvers should return a promise, ${type} given.`)
            );
        }

        routes.then(
            (_routes) => {
                if (!Array.isArray(_routes)) {
                    const type = typeof _routes;

                    reject(
                        Error(`Async route definition resolvers should resolve to array, ${type} given.`)
                    );
                }

                resolve(_routes);
            }, reject
        );
    });
}

/**
 * Resolves child routes (sync and async too)
 *
 * @param {Array|Function} children
 * @returns {Promise}
 */
function resolveChildRoutes(children) {
    function normalizeRoutes(routes, onError) {
        try {
            return routes.map((route) => {
                return normalizeRouteDefinition(route);
            });
        } catch (e) {
            onError(e);
        }
    }

    return new Promise((resolve, reject) => {
        if (!Array.isArray(children)) {
            resolveAsyncRoutes(children).then(
                (routes) => resolve(normalizeRoutes(routes, reject)),
                reject
            );
        } else {
            if (!children.length) {
                resolve([]);
            } else {
                resolve(normalizeRoutes(children, reject));
            }
        }
    });
}

export default class Route {
    constructor(
      path = '/',
      basePath = '/',
      children = [],
      onEnter,
      onLeave,
      component
    ) {
        const pathType = typeof path;
        const basePathType = typeof basePath;
        const childrenType = typeof children;
        const onEnterType = typeof onEnter;
        const onLeaveType = typeof onLeave;

        invariant(pathType === 'string', `Route path should be string, ${pathType} given.`);
        invariant(basePathType === 'string', `Route base path should be string, ${basePathType} given.`);
        invariant(
            Array.isArray(children) || childrenType === 'function',
            `Route children should be an array or function, ${childrenType} given.`
        );
        invariant(
            onEnterType === 'function',
            `Route handler \`onEnter\` should be a function, ${onEnterType} given.`
        );
        invariant(
            onLeaveType === 'function',
            `Route handler \`onLeave\` should be a function, ${onLeaveType} given.`
        );

        /**
         * Eager matcher for this route only
         *
         * @type {null|Function}
         */
        this.matcher = null;

        /**
         * Non eager matcher for this route (will match this route + something more)
         *
         * @type {null|Function}
         */
        this.childMatcher = null;

        this.path = path;

        this.basePath = basePath;

        this.onEnter = onEnter;

        this.onLeave = onLeave;

        this.component = component;

        this.children = children;
    }

    match(path, query) {
        return new Promise((resolve, reject) => {
            // lazy create matchers
            if (this.matcher === null) {
                const { eager, nonEager } = buildMatcher(this.path, this.basePath);

                this.matcher = eager;
                this.childMatcher = nonEager;
            }

            const instantiateRoutes = (routes) => {
                return routes.map((route) => {
                    return new Route(
                        route.path,
                        this.path,
                        route.children,
                        route.onEnter,
                        route.onLeave,
                        route.component
                    );
                });
            };


            // this resolves current path using eager regexp
            // in case children does not match
            const resolveOnlyCurrentRoute = () => {
                const match = this.matcher(path);

                if (match) {
                    const { vars } = match;

                    return resolve({
                        pathname: path,
                        vars,
                        query,
                        components: [this.component],
                        onEnter: [this.onEnter],
                        onLeave: [this.onLeave]
                    });
                }

                return reject();
            };

            // this resolves current route only if child routes returned
            // NoRoutesToResolveError ( means children is empty )
            const resolveOnlyCurrentIfNoError = (err) => {
                if (!err || (err instanceof NoRoutesToResolveError)) {
                    resolveOnlyCurrentRoute();
                } else {
                    reject(err);
                }
            };

            // if child matchers matches, try to match children first
            const childMatch = this.childMatcher(path);

            if (childMatch) {
                // resolve children routes
                resolveChildRoutes(this.children).then(
                    (routes) => {
                        try {
                            this.children = instantiateRoutes(routes);

                            // try to match children and resolve with first matched
                            resolveWithFirstMatched(this.children, path, query).then(
                                (match) => {
                                    const { vars, onEnter, onLeave, components } = match;

                                    resolve({
                                        pathname: path,
                                        vars,
                                        query,
                                        components: [this.component, ...components],
                                        onEnter: [this.onEnter, ...onEnter],
                                        onLeave: [this.onLeave, ...onLeave]
                                    });
                                },
                                resolveOnlyCurrentIfNoError // this is called when children don't match
                            );
                        } catch (e) {
                            reject(e);
                        }
                    },
                    reject
                );
            } else {
                resolveOnlyCurrentRoute();
            }
        });
    }
}

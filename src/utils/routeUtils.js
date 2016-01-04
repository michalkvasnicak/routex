import { normalizeSlashes, trimSlashesFromPathEnd } from './stringUtils';
import invariant from 'invariant';

/**
 * Reduce promises
 *
 * @param {Function} fn
 * @param {*} start
 * @returns {Function}
 */
function reduce(fn, start) {
    return (val) => {
        const values = Array.isArray(val) ? val : [val];

        return values.reduce((promise, curr) => {
            return promise.then((prev) => {
                return fn(prev, curr);
            });
        }, Promise.resolve(start));
    };
}

/**
 * Builds path matcher
 *
 * @param {string} pathPattern
 * @param {string} basePath
 *
 * @returns {{ eager: Function, nonEager: Function }}
 */
export function buildMatcher(pathPattern, basePath = '/') {
    // first find all variables
    let pathRegexp;
    const variableNames = [];
    const variablePatterns = [];

    // normalize slashes, trim slashes from end
    // and parse path pattern to variable names, etc
    pathRegexp = normalizeSlashes(basePath + '/' + pathPattern);
    pathRegexp = trimSlashesFromPathEnd(pathRegexp);

    pathRegexp = pathRegexp.replace(/:([a-zA-Z]+)({([^:]+)})?/g, (match, variableName, _, variablePattern) => {
        if (variableNames.indexOf(variableName) !== -1) {
            throw Error(`Route parameter \`${variableName}\` is already defined.`);
        }

        if (variableName) {
            variableNames.push(variableName);
        }

        const pattern = variablePattern || '[^/]+';

        variablePatterns.push(pattern);

        return `(${pattern})`;
    });

    pathRegexp += '/?';

    /**
     * Creates matcher for route path
     *
     * @param {string } pattern
     * @param {bool} eager      should matcher be eager?
     * @returns {Function}
     */
    function createMatcher(pattern, eager) {
        return function matcher(path) {
            const matched = path.match(new RegExp(`^${pattern}${eager ? '$' : '.*$'}`, 'i'));

            if (!matched || !matched.length) {
                return false;
            }

            const vars = {};
            let indexInMatch = 1;

            variableNames.forEach((name, index) => {
                const start = variablePatterns[index][0];
                const end = variablePatterns[index].slice(-1);

                if (start === '(' && end === ')') {
                    vars[name] = matched[indexInMatch];
                    indexInMatch += 2; // skip nested group
                    return;
                }

                vars[name] = matched[indexInMatch++];
            });

            return {
                matched,
                vars
            };
        };
    }

    return {
        eager: createMatcher(pathRegexp, true),
        nonEager: createMatcher(pathRegexp, false)
    };
}


/**
 * Normalizes route definition object (validates it and sets default values)
 *
 * @param {Object} definition
 * @returns {{path: *, children: (*|Array), onEnter: (*|Function), onLeave: (*|Function), component: (*|{})}}
 */
export function normalizeRouteDefinition(definition) {
    const definitionType = typeof definition;

    invariant(
        typeof definition === 'object' && definition !== null,
        `Route definition should be plain object, ${definitionType} given.`
    );

    invariant(
        definition.hasOwnProperty('path'),
        `Route definition should have \`path\` property.`
    );

    const noop = () => { return Promise.resolve(); };

    return {
        path: definition.path,
        children: definition.children || [],
        onEnter: definition.onEnter || noop,
        onLeave: definition.onLeave || noop,
        component: definition.component || null
    };
}

/* eslint-disable consistent-return */
export function runRouteHandlers(handlers, route, wrappers = [], ...args) {
    // if current route is not defined, resolve immediately
    // this will prevent calling onLeave on initial load, because we don't have previous route
    if (!route) {
        return Promise.resolve();
    }

    // runs route handler bound to given arguments (from our code)
    // wrapper can call it with additional parameters
    const runWrappedHandler = (originalHandler, originalProps, wrapper) => {
        return wrapper((...fromWrapper) => originalHandler(...originalProps, ...fromWrapper));
    };

    // create handlers runner
    const composedHandlers = reduce(
        (acc, current) => {
            try {
                const result = runWrappedHandler(current, args, wrappers[handlers]);

                if (result && typeof result.then === 'function') {
                    return result.then(res => {
                        acc.push(res);

                        return acc;
                    });
                }

                acc.push(result);

                return Promise.resolve(acc);
            } catch (e) {
                return Promise.reject(e);
            }
        }, []
    );

    const routeHandlers = route[handlers];

    // if running onEnter, run handlers from parent to child
    // if onLeave, run them from child to parent
    return composedHandlers(
        handlers === 'onEnter' ? routeHandlers : routeHandlers.reverse()
    );
}
/* eslint-enable consistent-return */

export function resolveComponents(components) {
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
}

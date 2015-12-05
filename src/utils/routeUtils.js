import { normalizeSlashes, trimSlashesFromPathEnd } from './stringUtils';
import invariant from 'invariant';

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
        return function matcher(path):Object {
            const matched = path.match(new RegExp(`^${pattern}${eager ? '$' : '.*$'}`, 'i'));

            if (!matched || !matched.length) {
                return false;
            }

            const vars = {};

            variableNames.forEach((name, index) => {
                vars[name] = matched[index + 1];
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

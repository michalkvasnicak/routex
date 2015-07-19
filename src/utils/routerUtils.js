import invariant from 'invariant';
import Route from '../Route';
import {
    NoRoutesToResolveError
} from '../errors';

/**
 * Returns first resolved route, if none resolve, rejects
 *
 * Routes are resolved in order
 *
 * @param {Array} routes
 * @param {string} path
 * @param {query} query
 * @returns {Promise}
 */
export function resolveWithFirstMatched(routes = [], path, query) {
    invariant(Array.isArray(routes), `Routes should be an array, ${typeof routes} given.`);

    function runAndResolveOnFirstResolved(promises, _resolve, _reject, currentIndex = 0) {
        const route = promises[currentIndex];

        invariant(
            route instanceof Route,
            `Routes should contain only Route objects, ${typeof route} given at index ${currentIndex}`
        );

        const result = route.match(path, query);

        result.then(
            _resolve,
            (err) => {
                if (currentIndex === routes.length - 1) {
                    _reject(err);
                } else {
                    runAndResolveOnFirstResolved(promises, _resolve, _reject, currentIndex + 1);
                }
            }
        );
    }

    return new Promise((resolve, reject) => {
        // call routes in order
        if (!routes.length) {
            return reject(new NoRoutesToResolveError('No routes to resolve'));
        }

        return runAndResolveOnFirstResolved(routes, resolve, reject);
    });
}

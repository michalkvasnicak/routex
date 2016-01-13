import { parse as parseQuery, stringify as stringifyQuery } from 'query-string';
export { parse as parseQuery, stringify as stringifyQuery } from 'query-string';

/**
 * Creates href
 *
 * @param {String} path
 * @param {Object.<String, *>} query
 * @returns {String}
 */
export function createHref(path, query = {}) {
    // if path contains ? strip it
    const match = path.match(/^([^?]*)(\?.*)?$/);

    let url = `${match[1]}`;
    let queryParams = match[2] ? parseQuery(match[2]) : {};

    // merge with query
    queryParams = { ...queryParams, ...query };

    // stringify params only if query contains something
    if (Object.keys(queryParams).length) {
        url += `?${stringifyQuery(queryParams)}`;
    }

    return url;
}

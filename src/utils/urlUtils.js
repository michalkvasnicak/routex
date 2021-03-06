import { parse as _parseQuery, stringify as _stringifyQuery } from 'qs';

/**
 * Parses query
 *
 * @param {String} search
 * @returns {Object.<String, *>}
 */
export function parseQuery(search) {
    if (/^\?/.test(search)) {
        return _parseQuery(search.substring(1));
    }

    return {};
}

/**
 * Stringifies query
 *
 * @param {Object.<String, *>} query
 * @returns {String}
 */
export function stringifyQuery(query = {}) {
    return _stringifyQuery(query, { arrayFormat: 'brackets' });
}

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

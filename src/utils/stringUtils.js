/**
 * Trims slashes from path end
 *
 * @param {string} path
 * @returns {string}
 */
export function trimSlashesFromPathEnd(path) {
    return path.replace(/(\/)$/, '');
}

/**
 * Normalizes occurrences of multiple slashes in one place to just one slash
 *
 * @param {string} path
 * @returns {string}
 */
export function normalizeSlashes(path) {
    return path.replace(/(\/)+\//g, '/');
}

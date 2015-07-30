function skipIfWindowDoesNotExist(test) {
    if (typeof window === 'undefined') {
        return undefined;
    }

    return test;
}

export {
    skipIfWindowDoesNotExist
};

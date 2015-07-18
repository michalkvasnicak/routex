import {
    ROUTE_CHANGE_START,
    ROUTE_CHANGE_SUCCESS,
    ROUTE_CHANGE_FAIL,
    ROUTE_NOT_FOUND,
    TRANSITION_TO
} from './actionTypes';


export function changeStart(currentRoute, nextRoute) {
    return {
        type: ROUTE_CHANGE_START,
        route: currentRoute,
        nextRoute: nextRoute
    };
}

export function changeSuccess(currentRoute) {
    return {
        type: ROUTE_CHANGE_SUCCESS,
        route: currentRoute
    };
}

export function changeFail(currentRoute, error) {
    return {
        type: ROUTE_CHANGE_FAIL,
        route: currentRoute,
        error: error
    };
}

export function notFound(notFoundRoute) {
    return {
        type: ROUTE_NOT_FOUND,
        route: notFoundRoute
    };
}

export function transitionTo(path, query = {}) {
    return {
        type: TRANSITION_TO,
        path: path,
        query: query
    };
}

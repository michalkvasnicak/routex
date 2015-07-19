import Router from './Router';

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


export default function createRoutex(routes, history, onTransition) {
    const initialReducerState = { state: 'INITIAL', route: null };

    const store = (next) => (reducer, initialState) => {
        const modifiedInitialState = initialState;

        // reset state of reducer to be initial because components cannot be rehydrated immediately
        // because we need to wait for initial router.run
        if (typeof initialState === 'object' && initialState !== null && initialState.hasOwnProperty('router')) {
            modifiedInitialState.router = initialReducerState;
        }

        const router = new Router(routes, history, onTransition);
        const nextStore = next(reducer, modifiedInitialState);

        router.addChangeStartListener((currentRoute, resolvedRoute/*, router*/) => {
            nextStore.dispatch(changeStart(currentRoute, resolvedRoute));
        });

        router.addChangeSuccessListener((resolvedRoute) => {
            nextStore.dispatch(changeSuccess(resolvedRoute));
        });

        router.addChangeFailListener((error, previousRoute/*, router*/) => {
            nextStore.dispatch(changeFail(previousRoute, error));
        });

        router.addNotFoundListener((path, query) => {
            nextStore.dispatch(notFound(path, query));
        });

        // initial run of router
        router.run(history.pathname(), history.query());

        /**
         * Dispatch function of this store
         *
         * @param {*} action
         * @returns {*}
         */
        function dispatch(action) {
            if (typeof action !== 'object' || !action.hasOwnProperty('type') || action.type !== TRANSITION_TO) {
                return nextStore.dispatch(action);
            }

            router.run(action.pathname, action.query);
        }

        return {
            ...nextStore,
            dispatch
        };
    };

    const reducer = (state = initialReducerState, action) => {
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
    };

    return {
        store,
        reducer: { router: reducer }
    };
}

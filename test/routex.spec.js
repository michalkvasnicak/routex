import { createStore, combineReducers, compose } from 'redux';
import createRoutex from '../src/createRoutex';
import { createMemoryHistory } from 'history';
import * as actions from '../src/actions';
import { spy } from 'sinon';
import { expect } from 'chai';

const transitionTo = actions.transitionTo;

function createRoutexStore(_history, onTransition, initialState) {
    const routex = createRoutex(
        [
            { path: '/', component: 'A' },
            { path: '/child', component: 'Child' },
            { path: '/rejected-on-enter', onEnter: () => Promise.reject(), component: 'RejectedOnEnter' },
            { path: '/rejected-on-leave', onLeave: () => Promise.reject(), component: 'RejectedOnLeave' },
            { path: '/with-variables/:user/:id{\\d+}', component: 'WithVariables' }
        ],
        _history,
        onTransition
    );

    return compose(routex.store, createStore)(combineReducers(routex.reducer), initialState);
}

function stripRouteInfo(route) {
    const { pathname, query, vars, components } = route;

    return {
        pathname,
        query,
        vars,
        components
    };
}

function stepper(steps, done) {
    let currentStep = 0;

    return function nextStep() {
        try {
            steps[currentStep++]();
        } catch (e) {
            done(e);
        }
    };
}

test('routex - replaces state in history on initial load if router state is initial', (done) => {
    let store;
    let history = createMemoryHistory();
    spy(history, 'replaceState');

    let onTransition = spy(() => {
        expect(onTransition.called).to.be.equal(true);
        expect(history.replaceState.called).to.be.equal(true);
        expect(store.getState().router.state).to.be.equal('TRANSITIONED');
        expect(stripRouteInfo(store.getState().router.route)).to.be.deep.equal({
            pathname: '/',
            query: {},
            vars: {},
            components: ['A']
        });

        done();
    });
    store = createRoutexStore(history, onTransition);
});

test('routex - replaces state in history on initial load if current state is null (in browser after load)', (done) => {
    let store;
    let history = createMemoryHistory();
    spy(history, 'replaceState');

    let onTransition = spy(() => {
        expect(onTransition.called).to.be.equal(true);
        expect(history.replaceState.called).to.be.equal(true);
        expect(store.getState().router.state).to.be.equal('TRANSITIONED');
        expect(stripRouteInfo(store.getState().router.route)).to.be.deep.equal({
            pathname: '/',
            query: {},
            vars: {},
            components: ['A']
        });

        done();
    });

    store = createRoutexStore(history, onTransition, {
        router: {
            state: 'TRANSITIONED',
            route: {
                pathname: '/',
                query: {},
                vars: {}
            }
        }
    });
});

test('routex - pushes state to history on successful transition (from known state to another)', (done) => {
    let store;
    let _stepper;
    let history = createMemoryHistory();
    spy(history, 'pushState');

    const steps = [
        () => {
            expect(store.getState().router.state).to.be.equal('TRANSITIONED');
            expect(stripRouteInfo(store.getState().router.route)).to.be.deep.equal({
                pathname: '/',
                query: {},
                vars: {},
                components: ['A']
            });

            store.dispatch(transitionTo('/child', {}));
        },
        () => {
            expect(_stepper.calledTwice).to.be.equal(true);
            expect(history.pushState.called).to.be.equal(true);
            expect(stripRouteInfo(store.getState().router.route)).to.deep.equal({
                pathname: '/child',
                query: {},
                vars: {},
                components: ['Child']
            });

            done();
        }
    ];

    _stepper = spy(stepper(steps, done));

    store = createRoutexStore(history, _stepper, {
        router: {
            state: 'TRANSITIONED',
            route: {
                pathname: '/',
                query: {},
                vars: {}
            }
        }
    });
});

test('routex - changes state using change success action if pop state event is emitted', (done) => {
    let store;
    let _stepper;
    let history = createMemoryHistory();

    const childState = {
        pathname: '/child',
        query: {},
        vars: {},
        components: ['Child']
    };

    const indexState = {
        pathname: '/',
        query: {},
        vars: {},
        components: ['A']
    };

    const steps = [
        () => {
            expect(store.getState().router.state).to.be.equal('TRANSITIONED');
            expect(stripRouteInfo(store.getState().router.route)).to.deep.equal(indexState);

            store.dispatch(transitionTo('/child', {}));
        },
        () => {
            expect(store.getState().router.state).to.be.equal('TRANSITIONED');
            expect(stripRouteInfo(store.getState().router.route)).to.deep.equal(childState);

            // call on pop state with state from history and return back
            // this dispatches ROUTE_CHANGE_SUCCESS immediately
            history.goBack();
        },
        () => {
            expect(store.getState().router.state).to.be.equal('TRANSITIONED');
            expect(stripRouteInfo(store.getState().router.route)).to.deep.equal(indexState);

            // go forward
            history.goForward();
        },
        () => {
            expect(store.getState().router.state).to.be.equal('TRANSITIONED');
            expect(stripRouteInfo(store.getState().router.route)).to.deep.equal(childState);

            done();
        }
    ];

    _stepper = spy(stepper(steps, done));

    store = createRoutexStore(history, _stepper, {
        router: {
            state: 'TRANSITIONED',
            route: {
                pathname: '/',
                query: {},
                vars: {}
            }
        }
    });
});

test('routex - cancels transition if one of onEnter handlers rejects', (done) => {
    const indexState = {
        pathname: '/',
        query: {},
        vars: {},
        components: ['A']
    };

    let store;

    const steps = [
        () => {
            expect(store.getState().router.state).to.be.equal('TRANSITIONED');
            expect(stripRouteInfo(store.getState().router.route)).to.deep.equal(indexState);

            store.dispatch(transitionTo('/rejected-on-enter', {}));
        },
        () => {
            expect(store.getState().router.state).to.be.equal('TRANSITIONED');
            expect(store.getState().router.error).to.be.eql(Error('onEnter handlers on route rejected-on-enter are not resolved.'));
            expect(stripRouteInfo(store.getState().router.route)).to.deep.equal(indexState);

            done();
        }
    ];

    const _stepper = stepper(steps, done);

    store = createRoutexStore(createMemoryHistory(), _stepper, {
        router: {
            state: 'TRANSITIONED',
            route: {
                pathname: '/',
                query: {},
                vars: {}
            }
        }
    });
});

test('routex - cancels transition if one of onLeave handlers rejects', (done) => {
    const indexState = {
        pathname: '/rejected-on-leave',
        query: {},
        vars: {},
        components: ['RejectedOnLeave']
    };

    let store;

    const steps = [
        () => {
            expect(store.getState().router.state).to.be.equal('TRANSITIONED');
            expect(stripRouteInfo(store.getState().router.route)).to.deep.equal(indexState);

            store.dispatch(transitionTo('/', {}));
        },
        () => {
            expect(store.getState().router.state).to.be.equal('TRANSITIONED');
            expect(store.getState().router.error).to.be.eql(Error('onLeave handlers on route rejected-on-leave are not resolved.'));
            expect(stripRouteInfo(store.getState().router.route)).to.deep.equal(indexState);

            done();
        }
    ];

    const _stepper = stepper(steps, done);

    store = createRoutexStore(createMemoryHistory(['/rejected-on-leave']), _stepper, {
        router: {
            state: 'TRANSITIONED',
            route: {
                pathname: '/rejected-on-leave',
                query: {},
                vars: {}
            }
        }
    });
});

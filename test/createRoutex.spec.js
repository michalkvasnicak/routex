import createRoutex from '../src/createRoutex';
import { createMemoryHistory } from 'history';
import { expect } from 'chai';
import Router from '../src/Router';
import { RouteNotFoundError } from '../src/errors';
import { compose, createStore, combineReducers } from 'redux';
import { transitionTo } from '../src/actions';
import { spy } from 'sinon';

describe('createRoutex()', () => {
    let routex;

    beforeEach(() => {
        routex = createRoutex([
            {
                path: '/',
                component: 'Index'
            },
            {
                path: '/test',
                component: 'Test'
            },
            {
                path: '/rejected',
                onEnter: () => Promise.reject()
            }
        ], createMemoryHistory());
    });

    it('exposes public API + router instance', () => {
        expect(routex).to.be.an('object');
        expect(routex).to.have.property('router').and.to.be.instanceof(Router);
        expect(routex).to.have.property('store').and.to.be.a('function');
        expect(routex).to.have.property('reducer').and.to.be.a('object');
        expect(routex.reducer).to.have.property('router').and.to.be.a('function');
    });

    it('exposes redux public API + router instance on redux store', () => {
        const store = compose(routex.store)(createStore)(combineReducers(routex.reducer));

        expect(store).to.be.an('object');
        expect(store).to.have.keys('dispatch', 'subscribe', 'getState', 'replaceReducer', 'router');
        expect(store.router).to.be.instanceof(Router);
    });

    it('starts listening to pop state event on initial store creation', () => {
        routex.router.listen = spy(routex.router.listen);

        compose(routex.store)(createStore)(combineReducers(routex.reducer));

        expect(routex.router.listen.calledOnce).to.be.equal(true);
    });

    it('runs listeners on successful transition dispatch and sets state in reducer', (done) => {
        routex.router.run = spy(routex.router.run);

        const store = compose(routex.store)(createStore)(combineReducers(routex.reducer));
        const startSpy = spy();
        const successSpy = spy();
        let indexRoute;

        const unsubscribe = store.router.addChangeSuccessListener((resolvedRoute) => {
            indexRoute = resolvedRoute;
            unsubscribe(); // unregister previous

            store.router.addChangeStartListener(startSpy);
            store.router.addChangeStartListener((currentRoute, nextRoute) => {
                try {
                    expect(store.getState().router.state).to.be.equal('TRANSITIONING');
                    expect(store.getState().router.route).to.be.equal(indexRoute);
                    expect(store.getState().router.route).to.be.equal(currentRoute);
                    expect(store.getState().router.nextRoute).to.be.equal(nextRoute);
                    expect(currentRoute).to.not.be.equal(nextRoute);
                } catch (e) {
                    done(e);
                }
            });
            store.router.addChangeSuccessListener(successSpy);

            store.dispatch(transitionTo('/test')).then(() => {
                try {
                    expect(startSpy.calledOnce).to.be.equal(true);

                    expect(startSpy.getCall(0).args[0]).to.contain.all.keys('pathname', 'components');
                    expect(startSpy.getCall(0).args[0].pathname).to.be.equal('/');
                    expect(startSpy.getCall(0).args[0].components).to.be.eql(['Index']);

                    expect(startSpy.getCall(0).args[1]).to.contain.all.keys('pathname', 'components');
                    expect(startSpy.getCall(0).args[1].pathname).to.be.equal('/test');
                    expect(startSpy.getCall(0).args[1].components).to.be.eql(['Test']);

                    expect(successSpy.calledOnce).to.be.equal(true);

                    expect(successSpy.getCall(0).args[0]).to.contain.all.keys('pathname', 'components');
                    expect(successSpy.getCall(0).args[0].pathname).to.be.equal('/test');
                    expect(successSpy.getCall(0).args[0].components).to.be.eql(['Test']);

                    expect(store.getState().router.state).to.be.equal('TRANSITIONED');
                    expect(store.getState().router.route).to.be.equal(successSpy.getCall(0).args[0]);
                    expect(store.getState().router).to.not.have.key('nextRoute');

                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });

    it('runs listeners on failed transition dispatch and sets state in reducer', (done) => {
        routex.router.run = spy(routex.router.run);

        const store = compose(routex.store)(createStore)(combineReducers(routex.reducer));
        const startSpy = spy();
        const failSpy = spy();
        let indexRoute;

        const unsubscribe = store.router.addChangeSuccessListener((resolvedRoute) => {
            indexRoute = resolvedRoute;
            unsubscribe(); // unregister previous

            store.router.addChangeStartListener(startSpy);
            store.router.addChangeStartListener((currentRoute, nextRoute) => {
                try {
                    expect(store.getState().router.state).to.be.equal('TRANSITIONING');
                    expect(store.getState().router.route).to.be.equal(indexRoute);
                    expect(store.getState().router.route).to.be.equal(currentRoute);
                    expect(store.getState().router.nextRoute).to.be.equal(nextRoute);
                    expect(currentRoute).to.not.be.equal(nextRoute);
                } catch (e) {
                    done(e);
                }
            });
            store.router.addChangeFailListener(failSpy);

            store.dispatch(transitionTo('/rejected')).catch(() => {
                try {
                    expect(failSpy.calledOnce).to.be.equal(true);

                    expect(failSpy.getCall(0).args[1]).to.be.equal(indexRoute);

                    expect(store.getState().router.state).to.be.equal('TRANSITIONED');
                    expect(store.getState().router.route).to.be.equal(failSpy.getCall(0).args[1]);
                    expect(store.getState().router).to.not.have.key('nextRoute');

                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });

    it('runs only not found listeners on transition dispatch to non existing route', (done) => {
        routex.router.run = spy(routex.router.run);

        const store = compose(routex.store)(createStore)(combineReducers(routex.reducer));
        const startSpy = spy();
        const successSpy = spy();
        const failSpy = spy();
        const notFoundSpy = spy();

        const unsubscribe = store.router.addChangeSuccessListener((resolvedRoute) => {
            unsubscribe(); // unregister previous

            try {
                expect(store.getState().router.state).to.be.equal('TRANSITIONED');
                expect(store.getState().router.route).to.be.equal(resolvedRoute);
            } catch (e) {
                done(e);
            }

            store.router.addChangeStartListener(startSpy);
            store.router.addChangeFailListener(failSpy);
            store.router.addChangeSuccessListener(successSpy);
            store.router.addNotFoundListener(notFoundSpy);

            store.dispatch(transitionTo('/not-existing')).catch((err) => {
                try {
                    expect(err).to.be.instanceof(RouteNotFoundError);

                    expect(startSpy.called).to.be.equal(false);
                    expect(failSpy.called).to.be.equal(false);
                    expect(successSpy.called).to.be.equal(false);
                    expect(notFoundSpy.calledOnce).to.be.equal(true);

                    expect(notFoundSpy.getCall(0).args[0]).to.be.equal('/not-existing');
                    expect(notFoundSpy.getCall(0).args[1]).to.be.eql({});

                    // state is untouched
                    expect(store.getState().router.state).to.be.equal('TRANSITIONED');
                    expect(store.getState().router.route).to.be.equal(resolvedRoute);

                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });
});

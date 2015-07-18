import { createStore, combineReducers, compose } from 'redux';
import { createRoutex, actions } from '../src';
import { stub, spy } from 'sinon';
import { expect } from 'chai';

const transitionTo = actions.transitionTo;

describe('routex', () => {
    let history;

    function createRoutexStore(_history, onTransition, initialState) {
        const routex = createRoutex(
            [
                { name: 'index', path: '/', component: 'A' },
                { name: 'child', path: '/child', component: 'Child' },
                { name: 'rejected-on-enter', path: '/rejected-on-enter', onEnter: () => Promise.reject(), component: 'RejectedOnEnter' },
                { name: 'rejected-on-leave', path: '/rejected-on-leave', onLeave: () => Promise.reject(), component: 'RejectedOnLeave' },
                { name: 'with-variables', path: '/with-variables/:user/:id{\\d+}', component: 'WithVariables' }
            ],
            _history,
            onTransition
        );

        return compose(routex.store(), createStore)(combineReducers(routex.reducer), initialState);
    }

    function stripRouteInfo(route) {
        const { name, path, query, vars, components } = route;

        return {
            name,
            path,
            query,
            vars,
            components
        };
    }

    beforeEach(() => {
        history = {
            addPopStateListener() {},
            pushState() {},
            replaceState() {},
            path() {},
            query() {},
            state() {}
        };

        stub(history);
    });

    it('provides generateLink method on store', () => {
        const store = createRoutexStore(history, spy());

        expect(store).to.have.property('generateLink').that.is.a('function');
    });

    describe('#generateLink()', () => {
        it('throws error if route does not exist', () => {
            const store = createRoutexStore(history, spy());

            expect(() => {
                store.generateLink('test');
            }).to.throw(
                'Route `test` does not exist.'
            );
        });

        it('returns href, path, query for given route', () => {
            const store = createRoutexStore(history, spy());

            expect(store.generateLink('index')).to.deep.equal({
                path: '/',
                query: {},
                href: '/'
            });

            expect(store.generateLink('index', { param: 'a' })).to.deep.equal({
                path: '/',
                query: { param: 'a' },
                href: '/?param=a'
            });

            expect(store.generateLink('with-variables', { id: 10, user: 'Fero' })).to.deep.equal({
                path: '/with-variables/Fero/10',
                query: {},
                href: '/with-variables/Fero/10'
            });

            expect(store.generateLink('with-variables', { id: 10, user: 'Fero', additional: 1 })).to.deep.equal({
                path: '/with-variables/Fero/10',
                query: {
                    additional: 1
                },
                href: '/with-variables/Fero/10?additional=1'
            });

            expect(() => {
                store.generateLink('with-variables', { user: 'Fero' });
            }).to.throw(
                'Parameter `id` of route `with-variables` is not specified.'
            );

            expect(
                () => {
                    store.generateLink('with-variables', { id: 'a', user: 'Fero' });
                }
            ).to.throw(
                'Parameter `id` of route `with-variables` has invalid value. Check route definition.'
            );
        });
    });

    it('replaces state in history on initial load if router state is initial', (done) => {
        let store;

        let onTransition = spy(() => {
            expect(onTransition.called).to.be.equal(true);
            expect(history.addPopStateListener.called).to.be.equal(true);
            expect(history.replaceState.called).to.be.equal(true);
            expect(store.getState().router.state).to.be.equal('TRANSITIONED');
            expect(stripRouteInfo(store.getState().router.route)).to.be.deep.equal({
                name: 'index',
                path: '/',
                query: {},
                vars: {},
                components: ['A']
            });

            done();
        });

        history.path.returns('/');
        history.query.returns({});

        store = createRoutexStore(history, onTransition);
    });

    it('replaces state in history on initial load if current state is null (in browser after load)', (done) => {
        let store;

        let onTransition = spy(() => {
            expect(onTransition.called).to.be.equal(true);
            expect(history.addPopStateListener.called).to.be.equal(true);
            expect(history.replaceState.called).to.be.equal(true);
            expect(store.getState().router.state).to.be.equal('TRANSITIONED');
            expect(stripRouteInfo(store.getState().router.route)).to.be.deep.equal({
                name: 'index',
                path: '/',
                query: {},
                vars: {},
                components: ['A']
            });

            done();
        });

        history.path.returns('/');
        history.query.returns({});

        store = createRoutexStore(history, onTransition, {
            router: {
                state: 'TRANSITIONED',
                route: {
                    name: 'index',
                    path: '/',
                    query: {},
                    vars: {}
                }
            }
        });
    });

    it('pushes state to history on successful transition (from known state to another)', (done) => {
        let store;

        let onTransition = spy();

        history.path.returns('/');
        history.query.returns({});

        store = createRoutexStore(history, onTransition, {
            router: {
                state: 'TRANSITIONED',
                route: {
                    name: 'index',
                    path: '/',
                    query: {},
                    vars: {}
                }
            }
        });

        setTimeout(() => {
            expect(store.getState().router.state).to.be.equal('TRANSITIONED');
            expect(stripRouteInfo(store.getState().router.route)).to.be.deep.equal({
                name: 'index',
                path: '/',
                query: {},
                vars: {},
                components: ['A']
            });

            store.dispatch(transitionTo('/child', {}));

            setTimeout(() => {
                expect(history.addPopStateListener.called).to.be.equal(true);
                expect(onTransition.calledTwice).to.be.equal(true);
                expect(history.path.calledOnce).to.be.equal(true);
                expect(history.query.calledOnce).to.be.equal(true);
                expect(history.pushState.called).to.be.equal(true);
                expect(stripRouteInfo(store.getState().router.route)).to.deep.equal({
                    name: 'child',
                    path: '/child',
                    query: {},
                    vars: {},
                    components: ['Child']
                });

                done();
            }, 0);
        }, 0);
    });

    it('changes state using change success action if pop state event is emitted', (done) => {
        let listener;
        let store;
        let _history = {
            addPopStateListener(_listener) {
                listener = _listener;
            },
            pushState() {},
            replaceState() {},
            path() {},
            query() {},
            state() {}
        };

        stub(_history, 'pushState');
        stub(_history, 'replaceState');
        stub(_history, 'path');
        stub(_history, 'query');
        stub(_history, 'state');

        const childState = {
            name: 'child',
            path: '/child',
            query: {},
            vars: {},
            components: ['Child']
        };

        const indexState = {
            name: 'index',
            path: '/',
            query: {},
            vars: {},
            components: ['A']
        };

        let onTransition = spy();

        _history.path.returns('/');
        _history.query.returns({});

        store = createRoutexStore(_history, onTransition, {
            router: {
                state: 'TRANSITIONED',
                route: {
                    name: 'index',
                    path: '/',
                    query: {},
                    vars: {}
                }
            }
        });

        setTimeout(() => {
            expect(store.getState().router.state).to.be.equal('TRANSITIONED');
            expect(stripRouteInfo(store.getState().router.route)).to.deep.equal(indexState);

            store.dispatch(transitionTo('/child', {}));

            setTimeout(() => {
                expect(store.getState().router.state).to.be.equal('TRANSITIONED');
                expect(stripRouteInfo(store.getState().router.route)).to.deep.equal(childState);

                // call on pop state with state from history and return back
                // this dispatches ROUTE_CHANGE_SUCCESS immediately
                listener({
                    name: 'index',
                    path: '/',
                    query: {},
                    vars: {}
                });

                expect(store.getState().router.state).to.be.equal('TRANSITIONED');
                expect(stripRouteInfo(store.getState().router.route)).to.deep.equal(indexState);

                // go forward
                listener({
                    name: 'child',
                    path: '/child',
                    query: {},
                    vars: {}
                });

                expect(store.getState().router.state).to.be.equal('TRANSITIONED');
                expect(stripRouteInfo(store.getState().router.route)).to.deep.equal(childState);

                done();
            }, 0);
        }, 0);
    });

    it('cancels transition if one of onEnter handlers rejects', (done) => {
        const indexState = {
            name: 'index',
            path: '/',
            query: {},
            vars: {},
            components: ['A']
        };

        let onTransition = spy();

        history.path.returns('/');
        history.query.returns({});

        const store = createRoutexStore(history, onTransition, {
            router: {
                state: 'TRANSITIONED',
                route: {
                    name: 'index',
                    path: '/',
                    query: {},
                    vars: {}
                }
            }
        });

        setTimeout(() => {
            expect(store.getState().router.state).to.be.equal('TRANSITIONED');
            expect(stripRouteInfo(store.getState().router.route)).to.deep.equal(indexState);

            store.dispatch(transitionTo('/rejected-on-enter', {}));

            setTimeout(() => {
                expect(store.getState().router.state).to.be.equal('TRANSITIONED');
                expect(store.getState().router.error).to.be.eql(Error('onEnter handlers on route rejected-on-enter are not resolved.'));
                expect(stripRouteInfo(store.getState().router.route)).to.deep.equal(indexState);

                done();
            }, 0);
        }, 0);
    });

    it('cancels transition if one of onLeave handlers rejects', (done) => {
        const indexState = {
            name: 'rejected-on-leave',
            path: '/rejected-on-leave',
            query: {},
            vars: {},
            components: ['RejectedOnLeave']
        };

        let onTransition = spy();

        history.path.returns('/rejected-on-leave');
        history.query.returns({});

        const store = createRoutexStore(history, onTransition, {
            router: {
                state: 'TRANSITIONED',
                route: {
                    name: 'rejected-on-leave',
                    path: '/rejected-on-leave',
                    query: {},
                    vars: {}
                }
            }
        });

        setTimeout(() => {
            expect(store.getState().router.state).to.be.equal('TRANSITIONED');
            expect(stripRouteInfo(store.getState().router.route)).to.deep.equal(indexState);

            store.dispatch(transitionTo('/', {}));

            setTimeout(() => {
                expect(store.getState().router.state).to.be.equal('TRANSITIONED');
                expect(store.getState().router.error).to.be.eql(Error('onLeave handlers on route rejected-on-leave are not resolved.'));
                expect(stripRouteInfo(store.getState().router.route)).to.deep.equal(indexState);

                done();
            }, 0);
        }, 0);
    });
});

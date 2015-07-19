import { expect } from 'chai';
import { spy, stub } from 'sinon';
import Router from '../src/Router';
import MemoryHistory from '../src/MemoryHistory';
import { RouteNotFoundError } from '../src/errors';

describe('Router', () => {
    describe('#contructor()', () => {
        it('throws if routes are not an array', () => {
            [1, true, 1.0, Date()].forEach((routes) => {
                expect(
                    () => new Router(routes)
                ).to.throw(
                    `Invariant Violation: Routes should be an array, ${typeof routes} given.`
                );
            });
        });

        it('throws if history does not implement History', () => {
            expect(
                () => new Router([], {})
            ).to.throw(
                'Invariant Violation: Router history should be a subclass of History.'
            );
        });

        it('throws if onTransition is not an function or undefined', () => {
            [1, true, 1.0, Date()].forEach((callback) => {
                expect(
                    () => new Router([], new MemoryHistory(), callback)
                ).to.throw(
                    `Invariant Violation: Router onTransition callback should be a function, ${typeof callback} given.`
                );
            });
        });
    });

    describe('#run()', () => {
        it('resolves simple route with sync children and calls all callbacks', () => {
            const onTransition = spy();
            let history;

            const router = new Router(
                [
                    {
                        path: '/',
                        component: 'a',
                        children: () => Promise.resolve([{ path: 'test', component: 'b' }])
                    }
                ],
                history = new MemoryHistory(),
                onTransition
            );

            stub(history);

            const changeStart = spy();
            const changeSuccess = spy();

            router.addChangeStartListener(changeStart);
            router.addChangeSuccessListener(changeSuccess);

            return router.run('/test').then(
                (resolvedRoute) => {
                    expect(resolvedRoute).to.be.an('object');
                    expect(resolvedRoute).to.have.property('pathname').and.be.equal('/test');
                    expect(resolvedRoute).to.have.property('components').and.be.deep.equal(['a', 'b']);
                    expect(resolvedRoute).to.have.property('vars').and.be.deep.equal({});
                    expect(resolvedRoute).to.have.property('query').and.be.deep.equal({});
                    expect(router.currentRoute()).to.be.an('object');
                    expect(history.replaceState.calledOnce).to.be.equal(true);
                    expect(changeStart.calledOnce).to.be.equal(true);
                    expect(changeSuccess.calledOnce).to.be.equal(true);
                    expect(onTransition.calledOnce).to.be.equal(true);
                }
            );
        });

        it('resolves a route with variables and calls all callbacks', () => {
            const onTransition = spy();
            let history;

            const router = new Router(
                [
                    {
                        path: '/',
                        component: 'a',
                        children: () => Promise.resolve([{ path: 'test/:variable', component: 'b' }])
                    }
                ],
                history = new MemoryHistory(),
                onTransition
            );

            const changeStart = spy();
            const changeSuccess = spy();

            stub(history);

            router.addChangeStartListener(changeStart);
            router.addChangeSuccessListener(changeSuccess);

            return router.run('/test/10').then(
                (resolvedRoute) => {
                    expect(resolvedRoute).to.be.an('object');
                    expect(resolvedRoute).to.have.property('pathname').and.be.equal('/test/10');
                    expect(resolvedRoute).to.have.property('components').and.be.deep.equal(['a', 'b']);
                    expect(resolvedRoute).to.have.property('vars').and.be.deep.equal({
                        variable: '10'
                    });
                    expect(resolvedRoute).to.have.property('query').and.be.deep.equal({});
                    expect(router.currentRoute()).to.be.an('object');
                    expect(history.replaceState.calledOnce).to.be.equal(true);
                    expect(changeStart.calledOnce).to.be.equal(true);
                    expect(changeSuccess.calledOnce).to.be.equal(true);
                    expect(onTransition.calledOnce).to.be.equal(true);
                }
            );
        });

        it('rejects if route is not found and calls callbacks', () => {
            const onTransition = spy();
            let history;

            const router = new Router(
                [
                    {
                        path: '/',
                        component: 'a',
                        children: () => Promise.resolve([{ path: 'test/:variable{\\d+}', component: 'b' }])
                    }
                ],
                history = new MemoryHistory(),
                onTransition
            );

            const changeStart = spy();
            const changeFail = spy();
            const notFound = spy();

            stub(history);

            router.addChangeStartListener(changeStart);
            router.addChangeFailListener(changeFail);
            router.addNotFoundListener(notFound);

            return router.run('/test/abcd').catch(
                (err) => {
                    expect(changeStart.called).to.be.equal(false);
                    expect(changeFail.called).to.be.equal(false);
                    expect(notFound.called).to.be.equal(true);
                    expect(err).to.be.instanceof(RouteNotFoundError);
                    expect(router.currentRoute()).to.be.equal(null);
                }
            );
        });

        it('resolves simple route and calls replaceState on initial and pushState on subsequent', () => {
            const onTransition = spy();
            let history;

            const router = new Router(
                [
                    {
                        path: '/',
                        component: 'a',
                        children: () => Promise.resolve([
                            { path: '', component: 'b' },
                            { path: 'test', component: 'c' }
                        ])
                    }
                ],
                history = new MemoryHistory(),
                onTransition
            );

            const changeStart = spy();
            const changeSuccess = spy();

            spy(history, 'state');
            spy(history, 'replaceState');
            spy(history, 'pushState');

            router.addChangeStartListener(changeStart);
            router.addChangeSuccessListener(changeSuccess);

            return router.run('/').then(
                (resolvedRoute) => {
                    expect(resolvedRoute).to.be.an('object');
                    expect(resolvedRoute).to.have.property('pathname').and.be.equal('/');
                    expect(resolvedRoute).to.have.property('components').and.be.deep.equal(['a', 'b']);
                    expect(resolvedRoute).to.have.property('vars').and.be.deep.equal({});
                    expect(resolvedRoute).to.have.property('query').and.be.deep.equal({});
                    expect(router.currentRoute()).to.be.equal(resolvedRoute);

                    expect(history.replaceState.calledOnce).to.be.equal(true);
                    expect(changeStart.calledOnce).to.be.equal(true);
                    expect(changeSuccess.calledOnce).to.be.equal(true);
                    expect(onTransition.calledOnce).to.be.equal(true);

                    return router.run('/test').then(
                        (_resolvedRoute) => {
                            expect(_resolvedRoute).to.be.an('object');
                            expect(_resolvedRoute).to.have.property('pathname').and.be.equal('/test');
                            expect(_resolvedRoute).to.have.property('components').and.be.deep.equal(['a', 'c']);
                            expect(_resolvedRoute).to.have.property('vars').and.be.deep.equal({});
                            expect(_resolvedRoute).to.have.property('query').and.be.deep.equal({});
                            expect(router.currentRoute()).to.be.equal(_resolvedRoute);

                            expect(history.replaceState.calledOnce).to.be.equal(true);
                            expect(history.pushState.calledOnce).to.be.equal(true);
                            expect(changeStart.calledTwice).to.be.equal(true);
                            expect(changeSuccess.calledTwice).to.be.equal(true);
                            expect(onTransition.calledTwice).to.be.equal(true);
                        }
                    );
                }
            );
        });

        it('rejects not found route (and if has previous state, calls fail callback)', () => {
            const onTransition = spy();
            let history;

            const router = new Router(
                [
                    {
                        path: '/',
                        component: 'a',
                        children: () => Promise.resolve([
                            { path: '', component: 'b' },
                            { path: 'test', component: 'c' }
                        ])
                    }
                ],
                history = new MemoryHistory(),
                onTransition
            );

            const changeStart = spy();
            const changeSuccess = spy();
            const changeFail = spy();

            spy(history, 'state');
            spy(history, 'replaceState');
            spy(history, 'pushState');

            router.addChangeStartListener(changeStart);
            router.addChangeSuccessListener(changeSuccess);
            router.addChangeFailListener(changeFail);

            return router.run('/').then(
                (resolvedRoute) => {
                    expect(resolvedRoute).to.be.an('object');
                    expect(resolvedRoute).to.have.property('pathname').and.be.equal('/');
                    expect(resolvedRoute).to.have.property('components').and.be.deep.equal(['a', 'b']);
                    expect(resolvedRoute).to.have.property('vars').and.be.deep.equal({});
                    expect(router.currentRoute()).to.be.an('object');
                    expect(router.currentRoute()).to.have.property('pathname').and.be.equal('/');
                    expect(router.currentRoute()).to.have.property('components').and.be.deep.equal(['a', 'b']);
                    expect(router.currentRoute()).to.have.property('vars').and.be.deep.equal({});
                    expect(history.replaceState.calledOnce).to.be.equal(true);
                    expect(changeStart.calledOnce).to.be.equal(true);
                    expect(changeSuccess.calledOnce).to.be.equal(true);
                    expect(changeFail.called).to.be.equal(false);
                    expect(onTransition.calledOnce).to.be.equal(true);

                    return router.run('/lalala').catch(
                        (err) => {
                            expect(router.currentRoute()).to.be.deep.equal(resolvedRoute);
                            expect(err).to.be.instanceof(RouteNotFoundError);

                            // change listeners should not be called at alle
                            // because they are called only if route matches
                            expect(changeStart.calledOnce).to.be.equal(true);
                            expect(changeFail.called).to.be.equal(false);
                            expect(changeSuccess.calledOnce).to.be.equal(true);

                            // this is called everytime routes finishes
                            expect(onTransition.calledTwice).to.be.equal(true);

                            // we don't expect to change state of history
                            // because we want user to do something about not found event
                            expect(history.replaceState.calledOnce).to.be.equal(true);
                            expect(history.pushState.called).to.be.equal(false);
                        }
                    );
                }
            );
        });
    });

    describe('#transitionTo()', () => {

    });
});

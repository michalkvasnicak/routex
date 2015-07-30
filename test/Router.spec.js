import { expect } from 'chai';
import { spy, stub } from 'sinon';
import { Component } from 'react';
import Router from '../src/Router';
import MemoryHistory from '../src/MemoryHistory';
import { RouteNotFoundError } from '../src/errors';

test('Router.constructor() throws if routes are not an array', () => {
    [1, true, 1.0, Date()].forEach((routes) => {
        expect(
            () => new Router(routes)
        ).to.throw(
            `Invariant Violation: Routes should be an array, ${typeof routes} given.`
        );
    });
});

test('Router.constructor() throws if history does not implement History', () => {
    expect(
        () => new Router([], {})
    ).to.throw(
        'Invariant Violation: Router history should be a subclass of History.'
    );
});

test('Router.constructor() throws if onTransition is not an function or undefined', () => {
    [1, true, 1.0, Date()].forEach((callback) => {
        expect(
            () => new Router([], new MemoryHistory(), callback)
        ).to.throw(
            `Invariant Violation: Router onTransition callback should be a function, ${typeof callback} given.`
        );
    });
});

test('Router.run() resolves simple route with sync children and calls all callbacks', () => {
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

test('Router.run() resolves route components asynchronously', () => {
    const onTransition = spy();
    let history;

    class App extends Component {}

    const router = new Router(
        [
            {
                path: '/',
                component: App,
                children: () => Promise.resolve([
                    {
                        path: 'test',
                        component: () => Promise.resolve(App)
                    }
                ])
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
            expect(resolvedRoute).to.have.property('components').and.be.deep.equal([App, App]);
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

test('Router.run() resolves a route with variables and calls all callbacks', () => {
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

test('Router.run() rejects if route is not found and calls callbacks', () => {
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

test('Router.run() resolves simple route and calls replaceState on initial and pushState on subsequent', () => {
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

test('Router.run() rejects not found route (and if has previous state, calls fail callback)', () => {
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

test('Router.run() calls onEnter on route with current route and resolving route', () => {
    const onTransition = spy();

    const router = new Router(
        [
            {
                path: '/',
                component: 'a',
                children: [{ path: '/nested', component: 'b' }]
            }
        ],
        new MemoryHistory(),
        onTransition
    );

    const changeStart = spy();

    router.addChangeStartListener(changeStart);

    expect(router.currentRoute()).to.be.equal(null);

    return router.run('/').then(
        (resolvedRoute) => {
            expect(changeStart.calledOnce).to.be.equal(true);
            expect(router.currentRoute()).not.to.be.equal(null);
            expect(resolvedRoute).to.be.equal(router.currentRoute());
            const previousRoute = router.currentRoute();

            return router.run('/nested').then(
                (newRoute) => {
                    expect(changeStart.calledTwice).to.be.equal(true);
                    expect(router.currentRoute()).not.to.be.equal(previousRoute);
                    expect(newRoute).not.to.be.equal(previousRoute);
                    expect(router.currentRoute()).to.be.equal(newRoute);
                    expect(changeStart.getCall(1).args[0]).to.be.deep.equal(previousRoute);
                    expect(changeStart.getCall(1).args[1]).to.be.deep.equal(newRoute);
                }
            );
        }
    );
});

function createRouterForWrappers() {
    const onAEnterSpy = spy();
    const onBLeaveSpy = spy();

    const router = new Router([
        { path: '/', component: 'A', onEnter: onAEnterSpy },
        { path: '/test', component: 'B', onLeave: onBLeaveSpy }
    ], new MemoryHistory());

    return {
        router,
        onAEnterSpy,
        onBLeaveSpy
    };
}

test('Router.wrapOnEnterHandler() wraps route onEnter handler with provided function', () => {
    const { router, onAEnterSpy } = createRouterForWrappers();

    const onEnterSpy = spy((onEnter) => {
        return onEnter('a', 'b', 'c');
    });

    router.wrapOnEnterHandler(onEnterSpy);

    return router.run('/', {}).then(
        () => {
            expect(onEnterSpy.calledOnce).to.be.equal(true);
            expect(onAEnterSpy.calledOnce).to.be.equal(true);

            const call = onAEnterSpy.getCall(0);
            const [previous, current, _router, ...rest] = call.args;

            expect(call.args).to.have.length(6);
            expect(previous).to.be.equal(null); // previous route
            expect(current).to.be.an('object').with.property('pathname').equal('/'); // current route
            expect(_router).to.be.equal(router);
            expect(rest).to.be.eql(['a', 'b', 'c']);
        }
    );
});

test('Router.wrapOnLeaveHandler() wraps route onEnter handler with provided function', () => {
    const { router, onBLeaveSpy } = createRouterForWrappers();

    const onLeaveSpy = spy((onLeave) => {
        return onLeave('a', 'b', 'c');
    });

    router.wrapOnLeaveHandler(onLeaveSpy);

    return router.run('/test', {}).then(
        () => {
            return router.run('/', {}).then(
                () => {
                    expect(onLeaveSpy.calledOnce).to.be.equal(true);
                    expect(onBLeaveSpy.calledOnce).to.be.equal(true);

                    const call = onBLeaveSpy.getCall(0);
                    const [resolved, _router, ...rest] = call.args;

                    expect(call.args).to.have.length(5);
                    expect(resolved).to.be.an('object').with.property('pathname').equal('/'); // current route
                    expect(_router).to.be.equal(router);
                    expect(rest).to.be.eql(['a', 'b', 'c']);
                }
            );
        }
    );
});

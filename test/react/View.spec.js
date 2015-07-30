import { expect } from 'chai';
import { createStore, compose, combineReducers } from 'redux';
import { createRoutex, MemoryHistory, actions } from '../../src';
import React, { Component, addons } from 'react/addons';
import { Provider } from 'react-redux';
import { View } from '../../src/react';
import { skipIfWindowDoesNotExist } from '../utils';

const utils = addons.TestUtils;

function createRoutexStore(routes, initialState, onTransition) {
    const routex = createRoutex(routes, new MemoryHistory('/', {}), onTransition);

    return compose(routex.store, createStore)(combineReducers(routex.reducer), initialState);
}

test('View - renders matched route on initial load when state is not provided (default state)', skipIfWindowDoesNotExist((done) => {
    class App extends Component {
        render() {
            return <div>{this.props.children || 'Pom'}</div>;
        }
    }

    const store = createRoutexStore(
        [
            {
                path: '/',
                component: App
            }
        ],
        undefined,
        (err) => {
            if (err) done(err);

            const tree = utils.renderIntoDocument(
                <Provider store={store}>
                    {() => <View />}
                </Provider>
            );

            utils.findRenderedComponentWithType(tree, App);
            done();
        });
}));

test('View - renders matched route on initial load (rehydrated)', skipIfWindowDoesNotExist((done) => {
    class App extends Component {
        render() {
            return <div>{this.props.children || 'Pom'}</div>;
        }
    }

    const store = createRoutexStore(
        [
            {
                path: '/',
                component: App
            }
        ],
        {
            router: { state: 'TRANSITIONED', route: { pathname: '/', query: {}, vars: {} }}
        },
        (err) => {
            if (err) done(err);

            const tree = utils.renderIntoDocument(
                <Provider store={store}>
                    {() => <View />}
                </Provider>
            );

            utils.findRenderedComponentWithType(tree, App);
            done();
        }
    );
}));

test('View - renders route components on successful transition', skipIfWindowDoesNotExist((done) => {
    let started = false;

    class App extends Component {
        render() {
            return <div>{this.props.children || 'Pom'}</div>;
        }
    }

    class Child extends Component {
        render() {
            return <span>pom</span>;
        }
    }

    const store = createRoutexStore(
        [
            {
                path: '/',
                component: App,
                children: [
                    {
                        path: '/child',
                        component: Child
                    }
                ]
            }
        ],
        {
            router: { state: 'TRANSITIONED', route: { pathname: '/', query: {}, vars: {} }}
        },
        () => {
            if (started) {
                return;
            }

            started = true;

            const tree = utils.renderIntoDocument(
                <Provider store={store}>
                    {() => <View />}
                </Provider>
            );

            try {
                utils.findRenderedComponentWithType(tree, App);
            } catch (e) {
                done(e);
            }

            store.dispatch(actions.transitionTo('/child')).then(
                () => {
                    try {
                        expect(store.getState().router.route.pathname).to.be.equal('/child');
                        utils.findRenderedComponentWithType(tree, App);
                        utils.findRenderedComponentWithType(tree, Child);
                        done();
                    } catch (e) {
                        done(e);
                    }
                },
                done.bind(this, Error('Should transition to /child'))
            );
        }
    );
}));

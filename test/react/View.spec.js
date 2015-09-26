/* eslint func-names:0, react/prop-types:0, react/no-multi-comp:0 */
global.navigator = {
    userAgent: 'node.js'
};

import { expect } from 'chai';
import { createStore, compose, combineReducers } from 'redux';
import TestUtils from 'react-addons-test-utils';
import jsdom from 'mocha-jsdom';
import { createRoutex, actions } from '../../src';
import { createMemoryHistory } from 'history';
import React, { Component } from 'react';
import ReactDOM from 'react-dom/server';
import { Provider } from 'react-redux';
import { View } from '../../src/react';

describe('React', () => {
    function createRoutexStore(routes, initialState, onTransition) {
        const routex = createRoutex(routes, createMemoryHistory('/'), onTransition);

        return compose(routex.store)(createStore)(combineReducers(routex.reducer), initialState);
    }

    describe('View', () => {
        jsdom();

        class App extends Component {
            render() {
                return <div>{this.props.children || 'Pom'}</div>;
            }
        }

        class Child extends Component {
            render() {
                return <div>Child</div>;
            }
        }

        it('renders matched route on initial load when state is not provided (default state)', function(done) {
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

                    const tree = TestUtils.renderIntoDocument(
                        <Provider store={store}>
                            <View />
                        </Provider>
                    );

                    TestUtils.findRenderedComponentWithType(tree, App);
                    done();
                });
        });

        it('renders matched route on initial load (rehydrated)', function(done) {
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

                    const tree = TestUtils.renderIntoDocument(
                        <Provider store={store}>
                            <View />
                        </Provider>
                    );

                    TestUtils.findRenderedComponentWithType(tree, App);
                    done();
                }
            );
        });

        it('renders route components on successful transition', function(done) {
            let started = false;

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

                    try {
                        expect(
                            ReactDOM.renderToString(
                                <Provider store={store}>
                                    <View />
                                </Provider>
                            )
                        ).to.match(/Pom/);
                    } catch (e) {
                        done(e);
                    }

                    setImmediate(
                        () => {
                            store.dispatch(actions.transitionTo('/child')).then(
                                () => {
                                    try {
                                        expect(store.getState().router.route.pathname).to.be.equal('/child');
                                        expect(
                                            ReactDOM.renderToString(
                                                <Provider store={store}>
                                                    <View />
                                                </Provider>
                                            )
                                        ).to.match(/Child/);
                                        done();
                                    } catch (e) {
                                        done(e);
                                    }
                                },
                                done.bind(this, Error('Should transition to /child'))
                            );
                        }
                    );

                }
            );
        });
    });
});

/* eslint func-names:0 */
import { expect } from 'chai';
import { createStore, compose, combineReducers } from 'redux';
import { createRoutex, actions } from '../../src';
import { createMemoryHistory } from 'history';
import React, { Component, addons } from 'react/addons';
import ExecutionEnvironment from 'react/lib/ExecutionEnvironment';
import { Provider } from 'react-redux';
import { View } from '../../src/react';

describe('React', () => {
    const utils = addons.TestUtils;

    function createRoutexStore(routes, initialState, onTransition) {
        const routex = createRoutex(routes, createMemoryHistory(), onTransition);

        return compose(routex.store, createStore)(combineReducers(routex.reducer), initialState);
    }

    describe('View', () => {
        class App extends Component {
            render() {
                return <div>{this.props.children || 'Pom'}</div>;
            }
        }

        it('renders matched route on initial load when state is not provided (default state)', function(done) {
            if (!ExecutionEnvironment.canUseDOM) {
                this.skip();
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
        });

        it('renders matched route on initial load (rehydrated)', function(done) {
            if (!ExecutionEnvironment.canUseDOM) {
                this.skip();
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
        });

        it('renders route components on successful transition', function(done) {
            if (!ExecutionEnvironment.canUseDOM) {
                this.skip();
            }

            let started = false;

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
        });
    });
});

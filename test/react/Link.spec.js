/* eslint func-names:0 */
import { expect } from 'chai';
import jsdom from 'mocha-jsdom';
import { createStore, combineReducers, compose } from 'redux';
import { createMemoryHistory } from 'history';
import createRoutex from '../../src/createRoutex.js';
import React, { Component } from 'react';
import TestUtils from 'react-addons-test-utils';
import { Provider } from 'react-redux';
import { Link } from '../../src/react';

describe('React', () => {
    describe('Link', () => {
        jsdom();

        let store;

        beforeEach(() => {
            const routex = createRoutex([], createMemoryHistory());
            store = compose(routex.store)(createStore)(combineReducers(routex.reducer));
        });

        it('renders anchor with simple path', function() {
            const tree = TestUtils.renderIntoDocument(
                <Provider store={store}>
                    <Link to="/path/123" />
                </Provider>
            );

            const link = TestUtils.findRenderedComponentWithType(tree, Link);

            expect(link.render().props.href).to.be.equal('/path/123');
        });

        it('renders anchor with href and query string', function() {
            class Container extends Component {
                render() {
                    return (
                        <Provider store={store}>
                            <Link to="/path/123" query={{ test: 1, name: 'Fero' }} />
                        </Provider>
                    );
                }
            }

            const tree = TestUtils.renderIntoDocument(<Container />);

            const link = TestUtils.findRenderedComponentWithType(tree, Link);

            expect(link.render().props.href).to.be.equal('/path/123?test=1&name=Fero');
        });
    });
});


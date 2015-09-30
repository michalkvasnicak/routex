/* eslint func-names:0 */
import { expect } from 'chai';
import jsdom from 'mocha-jsdom';
import { createStore, combineReducers, compose } from 'redux';
import { createMemoryHistory } from 'history';
import createRoutex from '../../src/createRoutex.js';
import React, { Component } from 'react';
import { Provider } from 'react-redux';
import { Link } from '../../src/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { transitionTo } from '../../src/actions';

describe('React', () => {
    describe('Link', () => {
        jsdom();

        let store;

        beforeEach(() => {
            const routex = createRoutex([{
                path: '/path/:id',
                component: 'a'
            }], createMemoryHistory());

            store = compose(
                routex.store
            )(createStore)(
                combineReducers(routex.reducer)
            );
        });

        it('renders anchor with simple path', function() {
            const tree = renderToStaticMarkup(
                <Provider store={store}>
                    <Link to="/path/123" />
                </Provider>
            );

            expect(tree).to.be.equal('<a href="/path/123"></a>');
        });

        it('renders anchor with href and query string', function() {
            const tree = renderToStaticMarkup(
                <Provider store={store}>
                    <Link to="/path/123" query={{ test: 1, name: 'Fero' }} />
                </Provider>
            );

            expect(tree).to.be.equal('<a href="/path/123?test=1&amp;name=Fero"></a>');
        });

        it('adds props from stateProps by current state', function(done) {
            const stateProps = {
                active: { className: 'active' },
                inactive: { className: 'inactive' }
            };

            store
                .dispatch(transitionTo('/path/123'))
                .then(
                    () => {
                        try {
                            const tree = renderToStaticMarkup(
                                <Provider store={store}>
                                    <div>
                                        <Link to="/path/123" stateProps={stateProps} />
                                        <Link to="/path/12" stateProps={stateProps} />
                                    </div>
                                </Provider>
                            );

                            expect(tree).to.be.equal(
                                '<div>' +
                                '<a href="/path/123" class="active"></a>' +
                                '<a href="/path/12" class="inactive"></a>' +
                                '</div>'
                            );

                            done();
                        } catch (e) {
                            done(e);
                        }
                    },
                    () => done(new Error('Route not found'))
                );
        });
    });
});


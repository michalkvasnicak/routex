import ExecutionEnvironment from 'react/lib/ExecutionEnvironment';
import jsdom from 'mocha-jsdom';
import { expect } from 'chai';
import { createStore, combineReducers } from 'redux';
import React, { render } from 'react/addons';
import { Provider } from 'react-redux';
import { Link } from '../../src/react';

describe('Link', () => {
    let store;
    let div;

    jsdom({ url: 'http://localhost/' });

    beforeEach(() => {
        ExecutionEnvironment.canUseDOM = true;
        div = global.document.createElement('div');

        store = createStore(combineReducers({}));
    });

    it('renders anchor with simple path', () => {
        render(
            (
                <Provider store={store}>
                    {() => <Link to="/path/123" />}
                </Provider>
            ),
            div,
            () => {
                let a = div.querySelector('a');
                expect(a.getAttribute('href')).to.be.equal('/path/123');
            }
        );
    });

    it('renders anchor with href and query string', () => {
        render(
            (
                <Provider store={store}>
                    {() => <Link to="/path/123" query={{ test: 1, name: 'Fero' }} />}
                </Provider>
            ),
            div,
            () => {
                let a = div.querySelector('a');
                expect(a.getAttribute('href')).to.be.equal('/path/123?test=1&name=Fero');
            }
        );
    });
});

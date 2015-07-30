import { expect } from 'chai';
import { createStore, combineReducers } from 'redux';
import React, { render } from 'react/addons';
import { Provider } from 'react-redux';
import { Link } from '../../src/react';
import { skipIfWindowDoesNotExist } from '../utils';

test('renders anchor with simple path', skipIfWindowDoesNotExist(() => {
    const store = createStore(combineReducers({}));
    const div = document.createElement('div');

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
}));

test('renders anchor with href and query string', skipIfWindowDoesNotExist(() => {
    const store = createStore(combineReducers({}));
    const div = document.createElement('div');

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
}));

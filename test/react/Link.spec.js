/* eslint func-names:0 */
import { expect } from 'chai';
import { createStore } from 'redux';
import React, { render } from 'react/addons';
import ExecutionEnvironment from 'react/lib/ExecutionEnvironment';
import { Provider } from 'react-redux';
import { Link } from '../../src/react';

describe('React', () => {
    describe('Link', () => {
        let store;
        let div;

        beforeEach(() => {
            store = createStore(() => {});

            if (ExecutionEnvironment.canUseDOM) {
                div = document.createElement('div');
            }
        });

        it('renders anchor with simple path', function() {
            if (!ExecutionEnvironment.canUseDOM) {
                this.skip();
            }

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

        it('renders anchor with href and query string', function() {
            if (!ExecutionEnvironment.canUseDOM) {
                this.skip();
            }

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
});


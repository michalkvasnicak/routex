import jsdom from 'mocha-jsdom';
import BrowserHistory from '../src/BrowserHistory';
import { expect } from 'chai';
import { spy } from 'sinon';

describe('BrowserHistory (HTML5)', () => {
    jsdom();

    let _history;

    beforeEach(() => {
        _history = new BrowserHistory();
    });

    describe('#addPopStateListener()', () => {
        it('throws on non function listener', () => {
            expect(() => _history.addPopStateListener()).to.throw();
        });

        it('registers function', () => {
            _history.addPopStateListener(() => {});
        });
    });

    describe('#pushState()', () => {
        it('pushes new state to history and sets new url if is not the same', () => {
            _history.pushState({ pathname: '/test', query: { search: 'a' }});
            expect(window.location.pathname).to.be.equal('/test');
            expect(window.location.search).to.be.equal('?search=a');
        });
    });

    it('calls pop listeners if we are going to previous state', (done) => {
        const listener = spy(() => {});

        // go forward
        _history.pushState({ pathname: '/' });
        _history.pushState({ pathname: '/test' });
        const unsubscribe = _history.addPopStateListener(listener);

        window.history.back();

        // wait for next loop
        setTimeout(
            () => {
                expect(listener.called).to.be.equal(true);
                unsubscribe();
                done();
            }, 0
        );
    });

    it('calls pop listeners if we are going to next state from previous', (done) => {
        const listener = spy(() => {});

        // go forward
        _history.pushState({ pathname: '/' });
        _history.pushState({ pathname: '/test' });
        const unsubscribe = _history.addPopStateListener(listener);

        window.history.back();
        window.history.forward();

        // wait for next loop
        setTimeout(
            () => {
                expect(listener.calledTwice).to.be.equal(true);
                unsubscribe();
                done();
            }, 0
        );
    });
});

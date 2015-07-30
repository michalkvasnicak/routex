import BrowserHistory from '../src/BrowserHistory';
import { expect } from 'chai';
import { skipIfWindowDoesNotExist } from './utils';

test('BrowserHistory.addPopStateListener() throws on non function listener', skipIfWindowDoesNotExist(() => {
    let _history = new BrowserHistory();

    expect(() => _history.addPopStateListener()).to.throw();
}));

test('BrowserHistory.addPopStateListener() registers function', skipIfWindowDoesNotExist(() => {
    let _history = new BrowserHistory();

    _history.addPopStateListener(() => {});
}));

test('BrowserHistory.pushState() pushes new state to history and sets new url if is not the same', skipIfWindowDoesNotExist(() => {
    let _history = new BrowserHistory();

    _history.pushState({ pathname: '/test', query: { search: 'a' }});
    expect(window.location.pathname).to.be.equal('/test');
    expect(window.location.search).to.be.equal('?search=a');
}));

test('BrowserHistory - calls pop state listeners if we are going between known states', skipIfWindowDoesNotExist((done) => {
    let _history = new BrowserHistory();
    let called = 0;
    let unsubscribe;

    const listener = () => {
        called++;

        switch (called) {
            case 1:
                window.history.forward();
                break;
            case 2:
                unsubscribe();
                done();
                break;
            default:
                done(Error('Pop state listener should not be called more than 2 times'));
        }
    };

    // go forward
    _history.pushState({ pathname: '/' });
    _history.pushState({ pathname: '/test' });
    unsubscribe = _history.addPopStateListener(listener);

    window.history.back();
}));

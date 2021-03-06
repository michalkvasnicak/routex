import { expect } from 'chai';
import { createHref } from '../../src/utils/urlUtils';

describe('utils', () => {

    describe('createHref()', () => {
        it('creates simple href', () => {
            expect(createHref('/', { a: 1 })).to.be.equal('/?a=1');
            expect(createHref('/', { a: [1, 0] })).to.be.equal('/?a%5B%5D=1&a%5B%5D=0');
        });

        it('parses existing query string and merges with new query params', () => {
            expect(createHref('/?b=1', { a: [1, 0] })).to.be.equal('/?b=1&a%5B%5D=1&a%5B%5D=0');
            expect(createHref('/?', { a: 1 })).to.be.equal('/?a=1');
        });

        it('strips question mark if query string of given path is empty', () => {
            expect(createHref('/?')).to.be.equal('/');
        });
    });

});

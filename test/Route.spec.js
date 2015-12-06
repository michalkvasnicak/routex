import { expect } from 'chai';
import Route from '../src/Route';

describe('Route', () => {
    describe('#constructor()', () => {
        it('throws if path is not an string', () => {
            [true, 1, 1.0, null].forEach((path) => {
                const type = typeof path;

                expect(() => new Route(path)).to.throw(
                    `Route path should be string, ${type} given.`
                );
            });
        });

        it('throws if path is not an string', () => {
            [true, 1, 1.0, null].forEach((path) => {
                const type = typeof path;

                expect(() => new Route(path)).to.throw(
                    `Route path should be string, ${type} given.`
                );
            });
        });

        it('throws if base path is not an string', () => {
            [true, 1, 1.0, null].forEach((path) => {
                const type = typeof path;

                expect(() => new Route('/', path)).to.throw(
                    `Route base path should be string, ${type} given.`
                );
            });
        });

        it('throws if route children is not an array or function', () => {
            [true, 1].forEach((children) => {
                const type = typeof children;

                expect(() => new Route('/', '', children)).to.throw(
                    `Route children should be an array or function, ${type} given.`
                );
            });
        });

        it('throws if route onEnter handler is not an function', () => {
            expect(() => new Route('/', '', [], 'a')).to.throw(
                `Route handler \`onEnter\` should be a function, string given.`
            );
        });

        it('throws if route onLeave handler is not an function', () => {
            expect(() => new Route('/', '', [], () => {}, 'a')).to.throw(
                `Route handler \`onLeave\` should be a function, string given.`
            );
        });
    });

    describe('#match()', () => {
        it('rejects if async route definition does not return Promise or array', (done) => {
            const steps = [true, 1, 'a', null];

            const stepper = (step, doneFn) => {
                if (step === steps.length) {
                    return doneFn();
                }

                const asyncRoutes = () => steps[step];
                const route = new Route('/', '', asyncRoutes, () => {}, () => {});

                route.match('/test').then(
                    doneFn.bind(this, Error('Route should reject for value of type ' + typeof steps[step])),
                    () => stepper(step + 1, doneFn)
                );
            };

            stepper(0, done);
        });

        it('rejects if route contains multiple variables of the same name', () => {
            const asyncRoutes = () => {
                return Promise.resolve([
                    {
                        path: '/:variable',
                        component: 'b'
                    }
                ]);
            };
            const route = new Route('/:variable', '', asyncRoutes, () => {}, () => {}, 'a');

            return route.match('/test/test').catch((err) => {
                expect(err).to.be.eql(Error('Route parameter `variable` is already defined.'));
            });
        });

        it('resolves simple route without children', () => {
            const onEnter = () => {};
            const onLeave = () => {};
            const eagerlyMatchedRoute = new Route('/', '', [], onEnter, onLeave, 'a');

            return eagerlyMatchedRoute.match('/').then(
                (match) => {
                    expect(match).be.an('object');
                    expect(match)
                        .to.have.property('vars')
                        .and.to.be.deep.equal({});
                    expect(match)
                        .to.have.property('onEnter')
                        .and.to.be.an('array')
                        .and.to.be.deep.equal([onEnter]);
                    expect(match)
                        .to.have.property('onLeave')
                        .and.to.be.an('array')
                        .and.to.be.deep.equal([onLeave]);
                    expect(match)
                        .to.have.property('components')
                        .and.to.be.an('array')
                        .and.to.be.deep.equal(['a']);
                }
            );
        });

        it('resolves complex route with multiple variables', () => {
            const onEnter = () => {};
            const onLeave = () => {};
            const eagerlyMatchedRoute = new Route('/:from-:to', '', [], onEnter, onLeave, 'a');

            return eagerlyMatchedRoute.match('/10-11').then(
                (match) => {
                    expect(match).be.an('object');
                    expect(match)
                        .to.have.property('vars')
                        .and.to.be.deep.equal({
                            from: '10',
                            to: '11'
                        });
                    expect(match)
                        .to.have.property('onEnter')
                        .and.to.be.an('array')
                        .and.to.be.deep.equal([onEnter]);
                    expect(match)
                        .to.have.property('onLeave')
                        .and.to.be.an('array')
                        .and.to.be.deep.equal([onLeave]);
                    expect(match)
                        .to.have.property('components')
                        .and.to.be.an('array')
                        .and.to.be.deep.equal(['a']);
                }
            );
        });

        it('resolves complex route with multiple variables (patterns)', () => {
            const onEnter = () => {};
            const onLeave = () => {};
            const eagerlyMatchedRoute = new Route('/:from{[0-9]+}-:to{[a-z]+}', '', [], onEnter, onLeave, 'a');

            return eagerlyMatchedRoute.match('/10-a').then(
                (match) => {
                    expect(match).be.an('object');
                    expect(match)
                        .to.have.property('vars')
                        .and.to.be.deep.equal({
                            from: '10',
                            to: 'a'
                        });
                    expect(match)
                        .to.have.property('onEnter')
                        .and.to.be.an('array')
                        .and.to.be.deep.equal([onEnter]);
                    expect(match)
                        .to.have.property('onLeave')
                        .and.to.be.an('array')
                        .and.to.be.deep.equal([onLeave]);
                    expect(match)
                        .to.have.property('components')
                        .and.to.be.an('array')
                        .and.to.be.deep.equal(['a']);
                }
            );
        });

        it('resolves complex route with complex children', () => {
            const onEnter = () => {};
            const onLeave = () => {};
            const children = [
                {
                    path: '/detail/:id{[a-zA-Z0-9]+}-:slug',
                    component: 'b',
                    onEnter,
                    onLeave
                }
            ];
            const eagerlyMatchedRoute = new Route('/:lang{(en|de)}', '', children, onEnter, onLeave, 'a');

            return eagerlyMatchedRoute.match('/en/detail/565ee0d31709ae7b174eb8a1-test').then(
                (match) => {
                    expect(match).be.an('object');
                    expect(match)
                        .to.have.property('vars')
                        .and.to.be.deep.equal({
                            lang: 'en',
                            id: '565ee0d31709ae7b174eb8a1',
                            slug: 'test'
                        });
                    expect(match)
                        .to.have.property('onEnter')
                        .and.to.be.an('array')
                        .and.to.be.deep.equal([onEnter, onEnter]);
                    expect(match)
                        .to.have.property('onLeave')
                        .and.to.be.an('array')
                        .and.to.be.deep.equal([onLeave, onLeave]);
                    expect(match)
                        .to.have.property('components')
                        .and.to.be.an('array')
                        .and.to.be.deep.equal(['a', 'b']);
                }
            );
        });

        it('resolves route with async children', () => {
            const asyncRoutes = () => {
                return Promise.resolve([
                    {
                        path: '/',
                        component: 'b'
                    }
                ]);
            };
            const route = new Route('/', '', asyncRoutes, () => {}, () => {}, 'a');

            return route.match('/').then(
                (match) => {
                    expect(match).be.an('object');
                    expect(match)
                        .to.have.property('vars')
                        .and.to.be.deep.equal({});
                    expect(match)
                        .to.have.property('onEnter')
                        .and.to.be.an('array')
                        .and.have.length(2);
                    expect(match)
                        .to.have.property('onLeave')
                        .and.to.be.an('array')
                        .and.have.length(2);
                    expect(match)
                        .to.have.property('components')
                        .and.to.be.an('array')
                        .and.to.be.deep.equal(['a', 'b']);
                }
            );
        });

        it('resolves route with sync children', () => {
            const routes = [
                {
                    path: '/',
                    component: 'b'
                }
            ];
            const route = new Route('/', '', routes, () => {}, () => {}, 'a');

            return route.match('/').then(
                (match) => {
                    expect(match).be.an('object');
                    expect(match)
                        .to.have.property('vars')
                        .and.to.be.deep.equal({});
                    expect(match)
                        .to.have.property('onEnter')
                        .and.to.be.an('array')
                        .and.have.length(2);
                    expect(match)
                        .to.have.property('onLeave')
                        .and.to.be.an('array')
                        .and.have.length(2);
                    expect(match)
                        .to.have.property('components')
                        .and.to.be.an('array')
                        .and.to.be.deep.equal(['a', 'b']);
                }
            );
        });

        it('asynchronously tries to match a route and rejects with an error if not found', (done) => {
            const asyncRoutes = () => {
                return Promise.resolve([
                    {
                        path: '/',
                        component: 'b'
                    }
                ]);
            };
            const route = new Route('/', '', asyncRoutes, () => {}, () => {}, 'a');

            route.match('/test').then(
                () => done(Error('Should not found')),
                () => done()
            );
        });
    });
});

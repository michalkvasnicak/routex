# Change log

All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](http://semver.org/).

## [1.0.0-alpha.16] - 2015/12/16
* add `fullPath` to resolved route

## [1.0.0-alpha.15] - 2015/12/15
* run route `onEnter` and `onLeave` handlers in order (not parallel)

## [1.0.0-alpha.14] - 2015/12/06
* fix regex groups in route patterns

## [1.0.0-alpha.13] - 2015/12/06
* fix link blinking in TRANSITIONING state

## [1.0.0-alpha.9] - 2015/12/05
* fixed bug when multiple regex patterns are in route pattern

## [1.0.0-alpha.8] - 2015/10/27
* fixed bug in matching active routes if href length is equal 1

## [1.0.0-alpha.7] - 2015/10/27
* fixed bug in matching active routes if `Link` href is longer than matching path

## [1.0.0-alpha.6] - 2015/10/27
* fixed active props for nested routes

## [1.0.0-alpha.5] - 2015/09/30
* fixed matching of active routes

## [1.0.0-alpha.4] - 2015/09/30
* fixed `Link` component `propTypes`

## [1.0.0-alpha.3] - 2015/09/30
* added active and inactive props to `Link` component

## [1.0.0-alpha.2] - 2015/09/26
* fixed bug in subroute base path

## [0.4.0] - 2015/08/16
* added `createHref` to Router API
* `Link` component is using `createHref` from a router instance

## [0.3.0] - 2015/07/31
* replaced histories with rackt-history (BC breaking change)
* added prever testing for node/browser environment

## [0.1.0] - 2015/07/18
* Initial public release (dev, use on your own risk)

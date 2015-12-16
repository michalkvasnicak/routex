# Routex

[![Circle CI](https://circleci.com/gh/michalkvasnicak/routex.svg?style=svg)](https://circleci.com/gh/michalkvasnicak/routex)

Simple router for [Redux](https://github.com/gaearon/redux) universal applications. Can be used with [React](https://github.com/facebook/react) too.

**This library is experimental and it not tested in production!! Use at your own risk! Pull requests are welcome**

## Installation

`npm install routex`

**Routex requires history^1.0.0 package to be installed**

## Usage

### Creating routex (without react)

```js
import { createRoutex, actions } from 'routex';
import { compose, createStore, combineReducers } from 'redux';
import { createHistory } from 'history';

const routes = [
    {
        path: '/',
        children: [
            {
                path: 'about',
                children: [/* ... */]
            }
        ]
    }/* ... */
];

// this will return object with high order store and reducer
const routex = createRoutex(routes, createHistory(), () => console.log('Transition finished') );

const newCreateStore = compose(routex.store, createStore);
const routexReducer = routex.reducer;
const reducers = combineReducers({ ...routexReducer /* your reducers */ });

const store = newCreateStore(reducers);

store.dispatch(actions.transitionTo('/about')); // transitions to about

store.generateLink('about'); // generates link object (see api)
```

### Creating routex using in React app (React >= 0.14)

```js
import { createRoutex } from 'routex';
import { compose, createStore, combineReducers } from 'redux';
import React, { Component } from 'react';
import { View, Link } from 'routex/lib/react';
import { createHistory } from 'history';

class App extends Component {
    render() {
        //this props children contains nested route
        // so everywhere when you can render nested routes you need to do this
        return (
            <div>
                <Link route={'about'} params={{}} />
                {this.props.children}
            </div>
        );
    }
}

const routes = [
    {
        path: '/',
        component: App, // you need components in all routes because <View /> needs to render them
        children: [
            {
                path: 'about',
                component: () => Promise.resolve(About),
                children: () => Promise.resolve([{ path: '/', component: Child }])
            }
        ]
    }/* ... */
];

// this will return object with high order store and reducer
const routex = createRoutex(routes, createHistory(), () => console.log('Transition finished') );

const newCreateStore = compose(routex.store, createStore);
const routexReducer = routex.reducer;
const reducers = combineReducers({ ...routexReducer /* your reducers */ });

const store = newCreateStore(reducers);

React.render(
    <Provider store={store}>
        <View />
    </Provider>
    , document.getElementById('App')
);

```

### Use router as standalone (without redux / react)

```js
import { Router } from 'routex';
import { createHistory } from 'history';

const router = new Router([/* routes */], createHistory() /*, optional onTransition hook */);

router.listen(); // start listening to pop state events (immediately will start transition for current location)

// if you want to transition to another location you have to run this
// if you won't then router will lose track of current location and will pretend
// that location didn't change
router.run('/where-you-want-to-go', { /* query params object */});
```

### API

- `Router`:
    - `constructor(routes: array, history: Object, onTransition(error, resolvedRoute):Function)`
        - history is result of calling `createMemoryHistory(), createHashHistory() or createBrowserHistory()` from `history` 
    - `wrapOnEnterHandler(wrapper:Function)`:
        - wraps route onEnter handler with function
        - it will be called with original handler bound to default arguments (see routeObject) as a first argument
        - wrapper signature: `function(originalHandler): result from original handler`
    - `wrapOnLeaveHandler(wrapper:Function)`:
        - wraps route onLeave handler with function
        - it will be called with original handler bound to default arguments (see routeObject) as a first argument
        - wrapper signature: `function(originalHandler): result from original handler`
    - `createHref(pathname: String, query: Object.<String, *>):String`
    - `currentRoute():null|routeObject`
    - `addChangeStartListener(listener:Function):Function` - returns unsubscribe function
    - `addChangeSuccessListener(listener:Function):Function` - returns unsubscribe function
    - `addChangeFailListener(listener:Function):Function` - returns unsubscribe function
    - `addNotFoundListener(listener:Function):Function` - returns unsubscribe function
    - `run(path: string, query: object):Promise`
    - `listen()` - starts listening to history pop events (and will fire POPstate event immediately after `listen()` call

- `createRoutex(routes: array, history: History, onTransition(error, resolvedRoute): Function):{{ store: Function, reducer: { router: Function } }}`
    - `routes`: array of routeObject (see below)
    - `history` instance of History subclass
    - `onTransition: function` called everytime routex resolves/rejects route
    - returns
        - `store: Function` - high order store function
        - `reducer: { router: Function }`
        -   - object used in combineReducers  
- `<View /> component`: use it where you want to render routes (needs `store` in context)
- `<Link to="path" query={{}} stateProps={{}} /> component`: use it where you want `<a>` to route (needs `store` in context)
    - `to: string` - path
    - `query: object` - query string params
    - `stateProps: object`
        - `active: object` - properties assigned to `<a>` if `href` is active (matched)
        - `inactive: object` - properties assigned to `<a>` if `href` is inactive (not matched)
- `actions.transitionTo(path: string, query: object)`
    - creates action which will routex try to transition to
    - `path: string` - path without query string
    - `query: Object.<string, *>` - query string parameters

- `routeObject: object`:
    - `path: string (required)` - route path (regexp will be created from it)
        - `/path:variable`
        - `/path/:variable`
        - `/path/:variable{\\d+}` - variable should be number
    - `component: ReactElement (optional)|Function:Promise` 
        - this is required only for <View /> / React
        - can be async, have to be a function returning a Promise
    - `children: array of routeObject (optional) or function returning Promise (which resolves to array)`
    - `onEnter: function (optional)` 
        - function used to determine if router can transition to this route (can be used as guard, or to load data needed for view to store)
        - **this function is called only on `transitionTo action` and not on popState event**
        - function signature is `function (currentRoute, nextRoute, router):Promise` **if is used outside of createRoutex**
        - function signature is `function (currentRoute, nextRoute, router, dispatch, getState):Promise` **if is used by createRoutex**
            - `currentRoute: routeObject|null` - current state of routex
            - `nextRoute: routeObject` - route we are transitioning to
            - `router: Router` - instance of router
            - **returns Promise**
                - if promise is resolved, transition will finish and changes the state of the router reducer
                - if promise is rejected, transition will finish but it won't change the state of the router reducer
    - `onLeave: function (optional)`
        - signature is same as in the onEnter
        - function used to determine if router can transition from this route (can be used as guard, ...) to a new route
        - **this function is called only on `transitionTo action` and not on popState event**

# Routex

[![Circle CI](https://circleci.com/gh/michalkvasnicak/routex.svg?style=svg)](https://circleci.com/gh/michalkvasnicak/routex)

Simple router for [Redux](https://github.com/rackt/redux) universal applications. Can be used with [React](https://github.com/facebook/react) too.

## Installation

`npm install routex`

## Requirements

**Routex needs some abstraction over browser history, we recommend to use [rackt/history^1.0.0](https://github.com/rackt/history)**

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

- **`Router`**:
    - **`constructor(routes, history, onTransition, resolveOnLoad)`**:
        - **`routes`** (`RouteObject[]`) array of route objects (see below)
        - **`history`** (`HistoryObject`) history object (see below)
        - **`onTransition`** (`Function(error: ?Error, resolvedRoute: ?Object`) optional function called every time router resolves/rejects route
        - **`resolveOnLoad`** (`Boolean`) optional, should route onEnter handlers be called on initial load? (useful if page is rendered in node, so we don't want to run onEnter again)
    - **`wrapOnEnterHandler(wrapper)`**:
        - **`wrapper`** (`Function(Function)`):
            - wrapper is function receiving route onEnter handler and returning its result
            - can be used to decorate onEnter handler (e.g. passing some variables, etc)
            - it will be called with original handler bound to default arguments (see routeObject) as a first argument
            - `router.wrapOnEnterHandler((onEnter) => onEnter(someVar)` will append someVar to default onEnter argument list
    - **`wrapOnLeaveHandler(wrapper)`**:
        - **`wrapper`** (`Function(Function)`):
            - wrapper is function receiving route onLeave handler and returning its result
            - can be used to decorate onLeave handler (e.g. passing some variables, etc)
            - it will be called with original handler bound to default arguments (see routeObject) as a first argument
            - `router.wrapOnLeaveHandler((onLeave) => onLeave(someVar)` will append someVar to default onLeave argument list
    - **`createHref(pathname, query):String`**
        - **`pathname`** (`String`) - url pathname
        - **`query`** (`?Object.<String, *>`) - optional query parameters
        - creates link
    - **`currentRoute():null|RouteObject`** returns current route
    - **`addChangeStartListener(listener:Function):Function`** - returns unsubscribe function
    - **`addChangeSuccessListener(listener:Function):Function`** - returns unsubscribe function
    - **`addChangeFailListener(listener:Function):Function`** - returns unsubscribe function
    - **`addNotFoundListener(listener:Function):Function`** - returns unsubscribe function
    - **`run(path, query):Promise`**:
        - **`path`** (`String`) - url pathname
        - **`query`** (`?Object.<String, *>`) - optional query parameters
        - resolves route for given pathname
    - **`listen()`** - starts listening to history pop events (and will fire POPstate event immediately after `listen()` call

- **`createRoutex(routes: array, history: History, onTransition(error, resolvedRoute): Function, resolveOnLoad: Boolean):{{ store: Function, reducer: { router: Function } }}`**
    - **`routes`** (`RouteObject[]`) array of RouteObject (see below)
    - **`history`** (`HistoryObject`) history object (see below)
    - **`onTransition`** (`Function(error: ?Error, resolvedRoute: ?Object`) optional function called every time router resolves/rejects route
    - **`resolveOnLoad`** (`Boolean`) optional, should route onEnter handlers be called on initial load? (useful if page is rendered in node, so we don't want to run onEnter again)
    - returns (`Object`)
        - **`store`** (`Function`) - high order store function
        - **`reducer`** (`{ router: Function }`) - object usable in `combineReducers` of `redux`

- **`actions.transitionTo(pathname, query)`**
    - creates action, that routex store will try to transition to
    - **`path`** (`String`) - path without query string of new route
    - **`query`** (`Object.<String, *>`) - optional, parsed query string parameters to object

- **`RouteObject:`** (`Object`):
    - **`path`** (`String`) - route path (regexp will be created from it)
        - `/path:variable`
        - `/path/:variable`
        - `/path/:variable{\\d+}` - variable should be number
    - **`component`** (`Function|ReactElement`) ReactElement (optional)|Function:Promise` 
        - returns ReactElement or `Function` returning `Promise` resolving to ReactElement
        - ReactElement is required only in case that you are using `<View />` with React otherwise component can be anything you want
        - can be async, have to be a function returning a Promise otherwise it is sync
    - **`?children`** (`RouteObject[]`)
        - optional array of RouteObjects or function returning Promise (which resolves to array of RouteObjects)
    - **`?onEnter`** (`Function`) 
        - optional route onEnter handler function
        - function used to determine if router can transition to this route (can be used as guard, or to load data needed for view to store)
        - **this function is called only on `transitionTo action` and not on popState event (back and forward browser buttons)**
        - function signature is `function (currentRoute, nextRoute, router):Promise` **if is used outside of createRoutex**
        - function signature is `function (currentRoute, nextRoute, router, dispatch, getState):Promise` **if is used by createRoutex, because it is wrapped**
            - **`currentRoute`** (`RouteObject|null`)` - current state of routex
            - **`nextRoute`** (`RouteObject`) - route we are transitioning to
            - **`router`**: (`Router`) - instance of router
            - returns **`Promise`**
                - if promise is resolved, transition will finish and changes the state of the router reducer
                - if promise is rejected, transition will finish but it won't change the state of the router reducer
    - **`?onLeave`** (`Function`)
        - optional route onLeave handler function
        - signature is same as in the `onEnter`
        - function used to determine if router can transition from this route (can be used as guard, ...) to a new route
        - **this function is called only on `transitionTo action` and not on popState event (back and forward browser buttons)**
        
- **`HistoryObject:`** (`Object`):
    - abstraction over browser history
    - **`listen`** (`Function(Function(LocationObject))`) -
        - method used to register history change events listeners (pop and push)
    - **`pushState`** (`Function(state, path)`)
        - pushes state for given path
        - **`state`** (`?Object`) - state stored for given path
        - **`path`** (`String)` - full path with query parameters
    - **`replaceState`** (`Function(state, path)`)
        - replaces current state with given state and path
        - **`state`** (`?Object`) - state stored for given path
        - **`path`** (`String)` - full path with query parameters
        
- **`LocationObject:`** (`Object`):
    - abstraction over current location
    - **`action`** (`String`) - `POP` or `PUSH`
    - **`state`** (`?Object`) - current state of location
    - **`pathname`** (`String`) - pathname without query parameters
    - **`search`** (`String`) - search part of path (query parameters as string)

### React components

#### `<View>` Component

Use this component whenever you want to render routes. This component needs `store` to be accessible in context.
`<View />` components can be nested, so you can use them in your own components (in case of nested routes)

```
<View /> // will render current route component (if route component renders <View /> too, it will render component of nested route
```

#### `<Link>` Component

Use this component whenever you want an `<a>` element to go to route. This component need `store` to be accessible in context.
Internally this component is dispatching action `transitionTo()`

**Props**:
    - **`to`** (`String`) - url pathname to go to
    - **`query`** (`?Object.<String, *>`) - optional, query parameters (will be add to `href` attribute)
    - **`stateProps`** (`?Object.<String, Object.<String, *>>`) - properties for `active`, `inactive` state of `<Link/>`
        - **`active`** (`?Object.<String, *>`) - optional props to be assigned if `<Link/>` `href` is active (matching current route)
        - **`inactive`** (`?Object.<String, *>`) - optional props to be assigned if `<Link/>` `href` is inactive (not matching current route)

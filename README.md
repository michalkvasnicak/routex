# Routex

[![Build Status](https://travis-ci.org/michalkvasnicak/routex.svg?branch=master)](https://travis-ci.org/michalkvasnicak/routex)

Simple router for [Redux](https://github.com/gaearon/redux) universal applications. Can be used with [React](https://github.com/facebook/react) too.

**This library is experimental and it not tested in production!! Use at your own risk! Pull requests are welcome**

## Installation

`npm install routex`


## Usage

### Creating routex (without react)

```js
import { createRoutex, BrowserHistory, actions } from 'routex';
import { compose, createStore, combineReducers } from 'redux';

const routes = [
    {
        name: 'index',
        path: '/',
        children: [
            {
                name: 'about',
                path: 'about',
                children: [/* ... */]
            }
        ]
    }/* ... */
];

// this will return object with high order store and reducer
const routex = createRoutex(routes, new BrowserHistory(), () => console.log('Transition finished') );

const newCreateStore = compose(routex.store(), createStore);
const routexReducer = routex.reducer;
const reducers = combineReducers({ ...routexReducer /* your reducers */ });

const store = newCreateStore(reducers);

store.dispatch(actions.transitionTo('/about')); // transitions to about

store.generateLink('about'); // generates link object (see api)
```

### Creating routex using in React app (React >= 0.13)

```js
import { createRoutex, BrowserHistory } from 'routex';
import { compose, createStore, combineReducers } from 'redux';
import React, { Component } from 'react';
import { View, Link } from 'routex/lib/react';

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
        name: 'index',
        path: '/',
        component: App, // you need components in all routes because <View /> needs to render them
        children: [
            {
                name: 'about',
                path: 'about',
                children: [/* ... */]
            }
        ]
    }/* ... */
];

// this will return object with high order store and reducer
const routex = createRoutex(routes, new BrowserHistory(), () => console.log('Transition finished') );

const newCreateStore = compose(routex.store(), createStore);
const routexReducer = routex.reducer;
const reducers = combineReducers({ ...routexReducer /* your reducers */ });

const store = newCreateStore(reducers);

React.render(
    <Provider store={store}>
        {() => <View />}
    </Provider>
    , document.getElementById('App')
);

```

Available histories:

- BrowserHistory (HTML5)
- MemoryHistory (stupid implementation mainly for server side when we don't need history at all)

### API

- `createRoutex(routes: array, history: History, onTransition(error, resolvedRoute): Function):{{ store: Function, reducer: { router: Function } }}`
    - `routes`: array of routeObject (see below)
    - `history` instance of History subclass
    - `onTransition: function` called everytime routex resolves/rejects route
    - returns
        - `store: Function` 
            - function which creates routex high order store
            - adds `generateLink(route: string, params: Object):generateLinkObject` to store interface
        - `reducer: { router: Function }`
        -   - object used in combineReducers  
- `<View /> component`: use it where you want to render routes (needs `store` in context)
- `<Link route="name" params={{}} /> component`: use it where you want `<a>` to route (needs `store` in context)
    - `route: string` - name of route (have to be defined in routes)
    - `params: object` - route params (what is not as route variable, will be added to query string)
- `actions.transitionTo(path: string, query: object)`
    - creates action which will routex try to transition to
    - `path: string` - path without query string
    - `query: Object.<string, *>` - query string parameters

- `generateLinkObject: object`:
    - `path: string`: path part of href
    - `query: Object.<string, *>`: query params of link
    - `href: string`: path + stringified query that can be used in `<a href=>`

- `routeObject: object`:
    - `name: string (required)` - unique route name
    - `path: string (required)` - route path (regexp will be created from it)
        - `/path:variable`
        - `/path/:variable`
        - `/path/:variable{\\d+}` - variable should be number
    - `component: ReactElement (optional)` - this is required only for <View /> / React
    - `children: array of routeObject (optional)`
    - `onEnter: function (optional)` 
        - function used to determine if router can transition to this route (can be used as guard, or to load data needed for view to store)
        - **this function is called only on `transitionTo action` and not on popState event**
        - function signature is `function (currentRoute, nextRoute, dispatch, getState():Promise`
            - `currentRoute: routeObject|null` - current state of routex
            - `nextRoute: routeObject` - route we are transitioning to
            - `dispatch: Function` - redux dispatch function
            - `getState: Function` - redux getState function
            - **returns Promise**
                - if promise is resolved, transition will finish and changes the state of the router reducer
                - if promise is rejected, transition will finish but it won't change the state of the router reducer
    - `onLeave: function (optional)`
        - function used to determine if router can transition from this route (can be used as guard, ...) to a new route
        - **this function is called only on `transitionTo action` and not on popState event**


## TODO

- document lifecycle
- HashHistory

import React from 'react';
import { connect } from 'react-redux';
import createLink from './Link';
import createView from './View';

export default {
    Link: createLink(React, connect),
    View: createView(React, connect)
};

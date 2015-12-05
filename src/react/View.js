export default function createView(React, connect) {
    const { Component, PropTypes, isValidElement } = React;

    class View extends Component {
        render() {
            const { state, route, ...props } = this.props;

            if (state === 'INITIAL' || !route || !route.components) {
                return null;
            }

            return route.components.reduceRight((component, parent) => {
                if (component === null) {
                    return React.createElement(parent, props);
                }

                const child = isValidElement(component) ? component : React.createElement(component, props);

                return React.createElement(parent, props, child);
            }, null);
        }
    }

    View.propTypes = {
        state: PropTypes.oneOf(['INITIAL', 'TRANSITIONING', 'TRANSITIONED']).isRequired,
        route: PropTypes.shape({
            pathname: PropTypes.string.isRequired,
            query: PropTypes.object.isRequired,
            vars: PropTypes.object.isRequired,
            components: PropTypes.array.isRequired
        })
    };

    View.contextTypes = {
        store: PropTypes.object.isRequired
    };

    return connect((state) => state.router)(View);
}

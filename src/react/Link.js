import { transitionTo } from '../actions';

export default function createLink(React) {
    const { Component, PropTypes } = React;

    return class Link extends Component {
        static contextTypes = {
            store: PropTypes.shape({
                dispatch: PropTypes.func.isRequired,
                generateLink: PropTypes.func.isRequired
            }).isRequired
        };

        static propTypes = {
            route: PropTypes.string.isRequired,
            params: PropTypes.object
        };

        handleClick(path, query, e) {
            e.preventDefault();

            this.context.store.dispatch(
                transitionTo(
                    path,
                    query
                )
            );
        }

        render() {
            const props = this.props;
            const link = this.context.store.generateLink(props.route, props.params);

            return (
                <a
                    href={link.href}
                    {...props}
                    onClick={this.handleClick.bind(this, link.path, link.query)}>
                    {this.props.children}
                </a>
            );
        }
    };
}

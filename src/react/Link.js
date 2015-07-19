import { transitionTo } from '../actions';
import qs from 'qs';

export default function createLink(React) {
    const { Component, PropTypes } = React;

    return class Link extends Component {
        static contextTypes = {
            store: PropTypes.shape({
                dispatch: PropTypes.func.isRequired
            }).isRequired
        };

        static propTypes = {
            to: PropTypes.string.isRequired,
            query: PropTypes.object
        };

        handleClick(e) {
            e.preventDefault();

            this.context.store.dispatch(
                transitionTo(
                    this.props.to,
                    this.props.query
                )
            );
        }

        render() {
            const { to, query, ...props } = this.props;
            const stringQuery = qs.stringify(query, { arrayFormat: 'brackets' });
            const href = to + (stringQuery.length ? '?' + stringQuery : '');

            return (
                <a
                    href={href}
                    {...props}
                    onClick={this.handleClick.bind(this)}>
                    {this.props.children}
                </a>
            );
        }
    };
}

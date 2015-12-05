import { transitionTo } from '../actions';
import Router from '../Router';

export default function createLink(React, connect) {
    const { Component, PropTypes } = React;

    class Link extends Component {
        static propTypes = {
            to: PropTypes.string.isRequired,
            query: PropTypes.object,
            children: PropTypes.oneOfType([PropTypes.element, PropTypes.array]),
            stateProps: PropTypes.shape({
                active: PropTypes.object,
                inactive: PropTypes.object
            }),
            router: PropTypes.object.isRequired
        };

        static contextTypes = {
            store: PropTypes.shape({
                dispatch: PropTypes.func.isRequired,
                router: PropTypes.instanceOf(Router).isRequired
            }).isRequired
        };

        constructor() {
            super();

            this.state = {
                active: false
            };

            //this.isActive = this.isActive.bind(this);
        }

        componentWillMount() {
            this.isActive();
        }

        componentWillReceiveProps() {
            this.isActive();
        }

        render() {
            const { to, query } = this.props;
            let { stateProps: stateProps = {}, ...props } = this.props;
            const href = this.context.store.router.createHref(to, query);

            stateProps = stateProps[this.state.active ? 'active' : 'inactive'] || {};

            props = {
                ...props,
                ...stateProps
            };

            return (
                <a
                    href={href}
                    {...props}
                    onClick={this.handleClick.bind(this)}>
                    {this.props.children}
                </a>
            );
        }

        isActive() {
            const { router, stateProps, to, query } = this.props;
            const { state, route } = router;
            const href = this.context.store.router.createHref(to, query);

            if (state === 'TRANSITIONED' && stateProps && route) {
                const matches = href === route.pathname;

                if (!matches) {
                    if (href === '/') {
                        this.setState({ active: true });
                    } else if (href.length < route.pathname.length) {
                        this.setState({ active: (new RegExp(`^(${href}|${href}/.*)$`)).test(route.pathname) });
                    }
                } else {
                    this.setState({ active: true });
                }
            }
        }

        handleClick(e) {
            e.preventDefault();

            this.context.store.dispatch(
                transitionTo(
                    this.props.to,
                    this.props.query
                )
            );
        }
    }

    return connect(
        (state) => {
            return {
                router: state.router
            };
        }
    )(Link);
}

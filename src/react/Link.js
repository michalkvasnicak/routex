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
                active: PropTypes.object.isRequired,
                inactive: PropTypes.object.isRequired
            }),
            router: PropTypes.object.isRequired
        };

        static contextTypes = {
            store: PropTypes.shape({
                dispatch: PropTypes.func.isRequired,
                router: PropTypes.instanceOf(Router).isRequired
            }).isRequired
        };

        render() {
            const { to, query, router } = this.props;
            let { stateProps, ...props } = this.props;
            const href = this.context.store.router.createHref(to, query);
            const { state, route } = router;

            if (state === 'TRANSITIONED' && stateProps && route) {
                let matches = href === route.pathname;

                if (!matches) {
                    if (href.length > route.pathname.length) {
                        matches = (new RegExp(`^${route.pathname}(/.*)?$`)).test(href);
                    } else if (href === '/') {
                        matches = true;
                    }
                }

                stateProps = stateProps[
                    matches ? 'active' : 'inactive'
                ];

                props = {
                    ...props,
                    ...stateProps
                };
            }

            return (
                <a
                    href={href}
                    {...props}
                    onClick={this.handleClick.bind(this)}>
                    {this.props.children}
                </a>
            );
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

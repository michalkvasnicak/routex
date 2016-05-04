import { transitionTo } from '../actions';
import { createHref } from '../utils/urlUtils';
import Router from '../Router';

export default function createLink(React, connect) {
    const { Component, PropTypes } = React;

    class Link extends Component {
        shouldComponentUpdate(nextProps) {
            return nextProps.router.state === 'TRANSITIONED';
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

        render() {
            const { to, query, router, stateProps, ...props } = this.props;
            const href = createHref(to, query);
            const { state, route } = router;
            let newProps = props;

            if (state === 'TRANSITIONED' && stateProps && route) {
                let matches = href === route.pathname;

                if (!matches) {
                    if (href === '/') {
                        matches = true;
                    } else if (href.length < route.pathname.length) {
                        matches = (new RegExp(`^(${href}|${href}/.*)$`)).test(route.pathname);
                    }
                }

                newProps = {
                    ...props,
                    ...(stateProps[matches ? 'active' : 'inactive'] || {})
                };
            }

            return (
                <a
                    href={href}
                    {...newProps}
                    onClick={this.handleClick.bind(this)}>
                    {this.props.children}
                </a>
            );
        }
    }

    Link.propTypes = {
        to: PropTypes.string.isRequired,
        query: PropTypes.object,
        children: PropTypes.oneOfType([PropTypes.element, PropTypes.array]),
        stateProps: PropTypes.shape({
            active: PropTypes.object,
            inactive: PropTypes.object
        }),
        router: PropTypes.object.isRequired
    };

    Link.contextTypes = {
        store: PropTypes.shape({
            dispatch: PropTypes.func.isRequired,
            router: PropTypes.instanceOf(Router).isRequired
        }).isRequired
    };

    return connect(
        (state) => {
            return {
                router: state.router
            };
        }
    )(Link);
}

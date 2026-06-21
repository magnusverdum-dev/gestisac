import { component$ } from '@builder.io/qwik';
import { App } from '../../app';

/**
 * Global catch-all for any routes not yet explicitly defined under /hq/, /worker/, or /client/.
 * This includes legacy URL patterns or direct path access.
 *
 * The App component handles its own routing via useLocation() and the parseRouteContext logic.
 */
export default component$(() => {
  return <App />;
});

import { component$ } from '@builder.io/qwik';
import { App } from '../../../app';

/**
 * Catch-all for HQ routes not yet migrated to individual Qwik City pages.
 * The App component (currently the SPA) will parse the URL and render
 * the appropriate page using its internal router.
 *
 * As each page is migrated, this catch-all will no longer match those paths
 * because new individual route files take precedence.
 */
export default component$(() => {
  return <App />;
});

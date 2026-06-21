import { component$ } from '@builder.io/qwik';
import { App } from '../../../app';

/**
 * Catch-all for Worker routes not yet migrated to individual Qwik City pages.
 */
export default component$(() => {
  return <App />;
});

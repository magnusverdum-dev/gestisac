import { component$ } from '@builder.io/qwik';
import { App } from '../app';

/**
 * Entry point — renders the app selection screen (AppEntryPage).
 * The App component reads the URL and decides whether to show the entry page or login/workspace.
 */
export default component$(() => {
  return <App />;
});

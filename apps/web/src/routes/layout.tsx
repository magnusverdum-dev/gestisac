import { component$, Slot } from '@builder.io/qwik';

/**
 * Root layout — currently minimal.
 * In future phases this will host:
 *  - Session bootstrap (routeLoader$ for auth check)
 *  - Global context providers (condominium, permissions)
 *  - Error boundaries
 */
export default component$(() => {
  return <Slot />;
});

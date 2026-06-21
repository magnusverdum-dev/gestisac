import { component$, Slot } from '@builder.io/qwik';

/**
 * HQ layout — placeholder for future context-specific layout.
 * Will eventually render AppShell with HQ-themed Sidebar + Topbar.
 */
export default component$(() => {
  return <Slot />;
});

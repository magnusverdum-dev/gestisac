import { describe, expect, it } from 'vitest';
import { buildGlobalSearchResults } from './search';
import { buildPages, buildWorkspaceSnapshots, emptyResources, fallbackDashboard } from './pages';

describe('workspace snapshot builders', () => {
  it('reuses the same page snapshot for identical workspace input', () => {
    const first = buildPages(emptyResources, fallbackDashboard);
    const second = buildPages(emptyResources, fallbackDashboard);

    expect(first).toBe(second);
    expect(first).toEqual(second);
  });

  it('reuses the same search snapshot for identical workspace input', () => {
    const first = buildGlobalSearchResults(emptyResources);
    const second = buildGlobalSearchResults(emptyResources);

    expect(first).toBe(second);
    expect(first).toEqual(second);
  });

  it('builds page and search snapshots in one pass for the same workspace input', () => {
    const first = buildWorkspaceSnapshots(emptyResources, fallbackDashboard);
    const second = buildWorkspaceSnapshots(emptyResources, fallbackDashboard);

    expect(first.pages).toBe(second.pages);
    expect(first.searchResults).toBe(second.searchResults);
    expect(first.pages).toEqual(second.pages);
    expect(first.searchResults).toEqual(second.searchResults);
  });

  it('does not reuse snapshots for a new workspace object with the same content', () => {
    const clonedResources = structuredClone(emptyResources);
    const first = buildWorkspaceSnapshots(emptyResources, fallbackDashboard);
    const second = buildWorkspaceSnapshots(clonedResources, fallbackDashboard);

    expect(first.pages).not.toBe(second.pages);
    expect(first.searchResults).not.toBe(second.searchResults);
    expect(first.pages).toEqual(second.pages);
    expect(first.searchResults).toEqual(second.searchResults);
  });
});

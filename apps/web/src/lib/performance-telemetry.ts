type PerfDetail = Record<string, string | number | boolean | null>;

type LayoutShiftMetric = PerformanceEntry & {
  hadRecentInput?: boolean;
  value?: number;
};

type EventTimingMetric = PerformanceEventTiming & {
  interactionId?: number;
};

type PerfSample = {
  id: string;
  at: string;
  kind: 'navigation' | 'paint' | 'lcp' | 'cls' | 'inp' | 'route' | 'span';
  route: string;
  name?: string;
  valueMs?: number;
  value?: number;
  detail?: PerfDetail;
};

type BrowserPerformanceTelemetry = {
  enabled: boolean;
  samples: PerfSample[];
  install: () => () => void;
  recordRouteCommit: (route: string, startedAt: number) => void;
  recordSpan: (name: string, startedAt: number, detail?: Record<string, unknown>) => void;
};

declare global {
  interface Window {
    __gestisacPerfTelemetry?: BrowserPerformanceTelemetry;
  }
}

const PERF_FLAG_KEY = 'gestisac:perf-telemetry';

const state = {
  installed: false,
  enabled: false,
  samples: [] as PerfSample[],
  emittedReasons: new Set<string>(),
  firstPaintMs: null as number | null,
  firstContentfulPaintMs: null as number | null,
  largestContentfulPaint: null as PerformanceEntry | null,
  cumulativeLayoutShift: 0,
  interactionCandidate: null as EventTimingMetric | null,
  initialRoute: '/'
};

export function installBrowserPerformanceTelemetry() {
  if (state.installed || typeof window === 'undefined') {
    return () => undefined;
  }

  state.installed = true;
  state.enabled = shouldEnableTelemetry();
  state.initialRoute = getCurrentRoute();
  window.__gestisacPerfTelemetry = getTelemetryApi();

  const cleanup: Array<() => void> = [];
  const addCleanup = (fn: () => void) => {
    cleanup.push(fn);
  };

  const onPageHide = () => flushSnapshot('pagehide');
  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      flushSnapshot('hidden');
    }
  };

  window.addEventListener('pagehide', onPageHide);
  document.addEventListener('visibilitychange', onVisibilityChange);
  addCleanup(() => window.removeEventListener('pagehide', onPageHide));
  addCleanup(() => document.removeEventListener('visibilitychange', onVisibilityChange));

  if (supportsEntryType('paint')) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-paint' && state.firstPaintMs === null) {
          state.firstPaintMs = entry.startTime;
        }
        if (entry.name === 'first-contentful-paint' && state.firstContentfulPaintMs === null) {
          state.firstContentfulPaintMs = entry.startTime;
        }
      }
    });
    observer.observe({ type: 'paint', buffered: true });
    addCleanup(() => observer.disconnect());
  }

  if (supportsEntryType('largest-contentful-paint')) {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const latest = entries[entries.length - 1];
      if (latest) {
        state.largestContentfulPaint = latest;
      }
    });
    observer.observe({ type: 'largest-contentful-paint', buffered: true });
    addCleanup(() => observer.disconnect());
  }

  if (supportsEntryType('layout-shift')) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as LayoutShiftMetric[]) {
        if (!entry.hadRecentInput) {
          state.cumulativeLayoutShift += entry.value ?? 0;
        }
      }
    });
    observer.observe({ type: 'layout-shift', buffered: true });
    addCleanup(() => observer.disconnect());
  }

  if (supportsEntryType('event')) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as EventTimingMetric[]) {
        if (entry.duration <= 0) {
          continue;
        }
        if (!state.interactionCandidate || entry.duration > state.interactionCandidate.duration) {
          state.interactionCandidate = entry;
        }
      }
    });
    observer.observe({ type: 'event', buffered: true });
    addCleanup(() => observer.disconnect());
  }

  if (document.readyState === 'complete') {
    window.setTimeout(() => flushSnapshot('load', state.initialRoute), 2_500);
  } else {
    const onLoad = () => window.setTimeout(() => flushSnapshot('load', state.initialRoute), 2_500);
    window.addEventListener('load', onLoad, { once: true });
    addCleanup(() => window.removeEventListener('load', onLoad));
  }

  return () => {
    for (const fn of cleanup.reverse()) {
      fn();
    }
  };
}

export function recordBrowserPerformanceRouteCommit(route: string, startedAt: number) {
  if (!startedAt || startedAt <= 0) {
    return;
  }

  const finish = () => {
    pushSample({
      kind: 'route',
      route,
      name: 'commit',
      valueMs: round(performance.now() - startedAt),
      detail: {
        phase: 'double-raf'
      }
    });
  };

  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => {
      requestAnimationFrame(finish);
    });
    return;
  }

  setTimeout(finish, 0);
}

export function recordBrowserPerformanceSpan(
  name: string,
  startedAt: number,
  detail?: Record<string, unknown>
) {
  if (!startedAt || startedAt <= 0) {
    return;
  }

  pushSample({
    kind: 'span',
    route: getCurrentRoute(),
    name,
    valueMs: round(performance.now() - startedAt),
    detail: normalizeDetail(detail)
  });
}

function pushSample(sample: Omit<PerfSample, 'id' | 'at'>) {
  const entry: PerfSample = {
    ...sample,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    at: new Date().toISOString()
  };

  state.samples.push(entry);
  if (state.samples.length > 200) {
    state.samples.splice(0, state.samples.length - 200);
  }

  if (state.enabled) {
    console.info('[gestisac:perf]', entry);
  }
}

function flushSnapshot(reason: string, route = getCurrentRoute()) {
  const signature = `${reason}:${route}:${state.firstPaintMs ?? ''}:${state.firstContentfulPaintMs ?? ''}:${state.cumulativeLayoutShift}:${state.interactionCandidate?.duration ?? ''}:${state.largestContentfulPaint?.startTime ?? ''}`;
  if (state.emittedReasons.has(signature)) {
    return;
  }
  state.emittedReasons.add(signature);

  const navigation = getNavigationTiming();
  if (navigation) {
    pushSample({
      kind: 'navigation',
      route,
      name: reason,
      valueMs: round(navigation.loadEventEnd),
      detail: {
        responseStart: round(navigation.responseStart),
        domContentLoadedEventEnd: round(navigation.domContentLoadedEventEnd),
        loadEventEnd: round(navigation.loadEventEnd),
        duration: round(navigation.duration),
        transferSize: Math.round(navigation.transferSize),
        encodedBodySize: Math.round(navigation.encodedBodySize)
      }
    });
  }

  if (state.firstPaintMs !== null) {
    pushSample({
      kind: 'paint',
      route,
      name: 'first-paint',
      valueMs: round(state.firstPaintMs)
    });
  }

  if (state.firstContentfulPaintMs !== null) {
    pushSample({
      kind: 'paint',
      route,
      name: 'first-contentful-paint',
      valueMs: round(state.firstContentfulPaintMs)
    });
  }

  if (state.largestContentfulPaint) {
    pushSample({
      kind: 'lcp',
      route,
      valueMs: round(getLcpValueMs(state.largestContentfulPaint)),
      detail: {
        size: Math.round((state.largestContentfulPaint as LargestContentfulPaint).size || 0),
        startTime: round(state.largestContentfulPaint.startTime),
        element: String((state.largestContentfulPaint as LargestContentfulPaint).element?.tagName ?? ''),
        url: String((state.largestContentfulPaint as LargestContentfulPaint).url ?? '')
      }
    });
  }

  if (state.cumulativeLayoutShift > 0) {
    pushSample({
      kind: 'cls',
      route,
      value: Number(state.cumulativeLayoutShift.toFixed(3))
    });
  }

  if (state.interactionCandidate) {
    pushSample({
      kind: 'inp',
      route,
      name: state.interactionCandidate.name,
      valueMs: round(state.interactionCandidate.duration),
      detail: {
        interactionId: Math.round(state.interactionCandidate.interactionId ?? 0),
        processingStart: round(state.interactionCandidate.processingStart)
      }
    });
  }
}

function shouldEnableTelemetry() {
  if (import.meta.env.DEV) {
    return true;
  }

  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('perf') === '1') {
      return true;
    }

    return window.localStorage.getItem(PERF_FLAG_KEY) === '1';
  } catch {
    return false;
  }
}

function normalizeDetail(detail?: Record<string, unknown>): PerfDetail | undefined {
  if (!detail) {
    return undefined;
  }

  const normalized: PerfDetail = {};
  for (const [key, value] of Object.entries(detail)) {
    normalized[key] = normalizeValue(value);
  }

  return normalized;
}

function normalizeValue(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  return String(value);
}

function getNavigationTiming(): PerformanceNavigationTiming | null {
  if (typeof performance === 'undefined') {
    return null;
  }

  const navigation = performance.getEntriesByType('navigation')[0];
  return navigation instanceof PerformanceNavigationTiming ? navigation : null;
}

function getCurrentRoute() {
  if (typeof window === 'undefined') {
    return '/';
  }

  return `${window.location.pathname}${window.location.search}` || '/';
}

function getLcpValueMs(entry: PerformanceEntry): number {
  const candidate = entry as LargestContentfulPaint;
  return candidate.renderTime || candidate.loadTime || candidate.startTime;
}

function supportsEntryType(type: string) {
  const supported = PerformanceObserver.supportedEntryTypes || [];
  return supported.includes(type as (typeof supported)[number]);
}

function round(value: number) {
  return Math.round(value);
}

function getTelemetryApi(): BrowserPerformanceTelemetry {
  return {
    enabled: state.enabled,
    samples: state.samples,
    install: installBrowserPerformanceTelemetry,
    recordRouteCommit: recordBrowserPerformanceRouteCommit,
    recordSpan: recordBrowserPerformanceSpan
  };
}

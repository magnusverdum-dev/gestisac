import { component$, Slot, type PropFunction } from '@builder.io/qwik';
import { SearchIcon } from 'lucide-qwik';

export type MetricStripItem = {
  id: string;
  label: string;
  value: string | number;
  detail?: string;
  tone?: 'neutral' | 'info' | 'warning' | 'success' | 'danger';
};

type OperationalPageLayoutProps = {
  eyebrow: string;
  title: string;
  description: string;
};

type MetricStripProps = {
  items: MetricStripItem[];
  activeId?: string;
  onSelect$?: PropFunction<(id: string) => void>;
};

type OperationalToolbarProps = {
  eyebrow?: string;
  title: string;
  searchValue?: string;
  searchPlaceholder?: string;
  onSearch$?: PropFunction<(value: string) => void>;
};

type ContextPanelProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  status?: string;
};

type RelationChipRowProps = {
  items: Array<{ label: string; tone?: string }>;
};

type SelectionHeaderProps = {
  title: string;
  subtitle?: string;
  status?: string;
};

export const OperationalPageLayout = component$((props: OperationalPageLayoutProps) => (
  <section class="cc-page">
    <header class="cc-page-header">
      <div class="cc-page-copy">
        <span class="cc-eyebrow">{props.eyebrow}</span>
        <h1>{props.title}</h1>
        <p>{props.description}</p>
      </div>
      <div class="cc-page-actions">
        <Slot name="header-actions" />
      </div>
    </header>

    <Slot name="metrics" />

    <div class="cc-page-grid">
      <div class="cc-main-column">
        <Slot />
      </div>
      <aside class="cc-side-column">
        <Slot name="panel" />
      </aside>
    </div>
  </section>
));

export const MetricStrip = component$((props: MetricStripProps) => (
  <div class="cc-metric-strip">
    {props.items.map((item) => {
      const isActive = props.activeId === item.id;
      const Tag = props.onSelect$ ? 'button' : 'div';
      return (
        <Tag
          key={item.id}
          type={props.onSelect$ ? 'button' : undefined}
          class={`cc-metric-card ${item.tone ?? 'neutral'}${isActive ? ' active' : ''}`}
          onClick$={props.onSelect$ ? () => props.onSelect$?.(item.id) : undefined}
        >
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          <small>{item.detail ?? ''}</small>
        </Tag>
      );
    })}
  </div>
));

export const OperationalToolbar = component$((props: OperationalToolbarProps) => (
  <section class="cc-toolbar">
    <div class="cc-toolbar-copy">
      {props.eyebrow ? <span class="cc-eyebrow">{props.eyebrow}</span> : null}
      <h2>{props.title}</h2>
    </div>
    <div class="cc-toolbar-actions">
      {props.onSearch$ ? (
        <label class="cc-search">
          <SearchIcon size={16} />
          <input
            value={props.searchValue ?? ''}
            placeholder={props.searchPlaceholder ?? 'Pesquisar'}
            onInput$={(event) => props.onSearch$?.((event.target as HTMLInputElement).value)}
          />
        </label>
      ) : null}
      <Slot />
    </div>
  </section>
));

export const OperationalList = component$(() => (
  <div class="cc-list">
    <Slot />
  </div>
));

export const ContextPanel = component$((props: ContextPanelProps) => (
  <section class="cc-panel">
    <header class="cc-panel-header">
      <div>
        {props.eyebrow ? <span class="cc-eyebrow">{props.eyebrow}</span> : null}
        <h2>{props.title}</h2>
        {props.subtitle ? <p>{props.subtitle}</p> : null}
      </div>
      {props.status ? <span class="cc-inline-status">{props.status}</span> : null}
    </header>
    <Slot />
  </section>
));

export const SelectionHeader = component$((props: SelectionHeaderProps) => (
  <div class="cc-selection-header">
    <div>
      <h3>{props.title}</h3>
      {props.subtitle ? <p>{props.subtitle}</p> : null}
    </div>
    {props.status ? <span class="cc-inline-status">{props.status}</span> : null}
  </div>
));

export const RelationChipRow = component$((props: RelationChipRowProps) => (
  <div class="cc-chip-row">
    {props.items.map((item, index) => (
      <span key={`${item.label}-${index}`} class={`cc-chip ${item.tone ?? 'neutral'}`}>
        {item.label}
      </span>
    ))}
  </div>
));

export const PrimaryActionBar = component$(() => (
  <div class="cc-primary-actions">
    <Slot />
  </div>
));

export const EmptyOperationalState = component$(() => (
  <div class="cc-empty-state">
    <Slot />
  </div>
));

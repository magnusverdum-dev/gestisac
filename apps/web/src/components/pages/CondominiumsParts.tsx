import { component$, type PropFunction } from '@builder.io/qwik';
import type { CompletenessReport, Condominium } from '../../lib/api';

export type FieldKind = 'text' | 'number' | 'textarea' | 'checkbox';

export type FieldConfig = {
  name: string;
  label: string;
  kind?: FieldKind;
  placeholder?: string;
};

export type SubresourceName =
  | 'blocks'
  | 'floors'
  | 'zones'
  | 'equipment'
  | 'contacts'
  | 'documents'
  | 'media'
  | 'notes';

type SectionEditorProps = {
  title: string;
  fields: FieldConfig[];
  values?: Record<string, unknown>;
  isSaving: boolean;
  onSubmit$: PropFunction<(form: HTMLFormElement) => void>;
};

export const SectionEditor = component$((props: SectionEditorProps) => (
  <form
    class="condo-editor"
    preventdefault:submit
    onSubmit$={async (event) => props.onSubmit$(event.target as HTMLFormElement)}
  >
    <header>
      <strong>{props.title}</strong>
      <span>Alteracoes criam historico automatico.</span>
    </header>
    <div class="condo-form-grid">
      {props.fields.map((field) => (
        <Field
          key={field.name}
          name={field.name}
          label={field.label}
          kind={field.kind}
          placeholder={field.placeholder}
          value={valueFor(props.values, field.name)}
        />
      ))}
    </div>
    <button class="primary-action" type="submit" disabled={props.isSaving}>
      Guardar seccao
    </button>
  </form>
));

type SubresourcePanelProps = {
  title: string;
  resource: SubresourceName;
  fields: FieldConfig[];
  rows: Array<Record<string, unknown>>;
  isSaving: boolean;
  onSubmit$: PropFunction<(form: HTMLFormElement, resource: SubresourceName, fields: FieldConfig[]) => void>;
};

export const SubresourcePanel = component$((props: SubresourcePanelProps) => (
  <section class="condo-subresource">
    <form
      class="condo-editor"
      preventdefault:submit
      onSubmit$={async (event) => props.onSubmit$(event.target as HTMLFormElement, props.resource, props.fields)}
    >
      <header>
        <strong>Adicionar {props.title.toLowerCase()}</strong>
        <span>Fica associado a este condominio e entra no historico.</span>
      </header>
      <div class="condo-form-grid">
        {props.fields.map((field) => (
          <Field key={field.name} name={field.name} label={field.label} kind={field.kind} placeholder={field.placeholder} />
        ))}
      </div>
      <button class="primary-action" type="submit" disabled={props.isSaving}>Adicionar</button>
    </form>
    <div class="condo-resource-list">
      {props.rows.length ? props.rows.map((row) => (
        <article key={String(row.id)}>
          <strong>{String(row.name ?? row.title ?? row.contactType ?? 'Registo')}</strong>
          <span>{Object.entries(row).filter(([key, value]) => key !== 'id' && value).slice(0, 5).map(([, value]) => String(value)).join(' - ')}</span>
        </article>
      )) : (
        <article class="condo-empty-state">
          <strong>Ainda nao existem registos</strong>
          <span>Usa o formulario acima para completar esta parte da ficha.</span>
        </article>
      )}
    </div>
  </section>
));

export const Field = component$((props: FieldConfig & { value?: string }) => (
  <label class={props.kind === 'textarea' ? 'wide' : ''}>
    <span>{props.label}</span>
    {props.kind === 'textarea' ? (
      <textarea name={props.name} placeholder={props.placeholder} value={props.value} />
    ) : props.kind === 'checkbox' ? (
      <input name={props.name} type="checkbox" value="true" checked={props.value === 'true'} />
    ) : (
      <input name={props.name} type={props.kind === 'number' ? 'number' : 'text'} placeholder={props.placeholder} value={props.value} />
    )}
  </label>
));

export const Kpi = component$((props: { label: string; value: string | number; detail: string }) => (
  <article class="condo-kpi glass-panel">
    <span>{props.label}</span>
    <strong>{props.value}</strong>
    <small>{props.detail}</small>
  </article>
));

export const Overview = component$((props: { selected: Condominium; completeness: CompletenessReport }) => (
  <section class="condo-overview-grid">
    <article>
      <strong>Ficha do condominio</strong>
      <span>{props.completeness.percentage}% completo</span>
      <progress value={props.completeness.percentage} max="100" />
      {props.completeness.missingItems.slice(0, 8).map((item) => <small key={item}>{item}</small>)}
    </article>
    <article>
      <strong>Resumo operacional</strong>
      <span>{props.selected.operationalStatus?.summary || props.selected.notice}</span>
      <small>Ultima atualizacao: {props.selected.operationalStatus?.updatedAt || props.selected.updatedAt || 'por definir'}</small>
    </article>
    <article>
      <strong>Localizacao</strong>
      <span>{shortAddress(props.selected)}</span>
      <small>{props.selected.address?.accessNotes || 'Sem notas de acesso'}</small>
    </article>
  </section>
));

export const History = component$((props: { events: Array<Record<string, unknown>> }) => (
  <section class="condo-timeline">
    {props.events.length ? props.events.map((event) => (
      <article key={String(event.id)}>
        <strong>{String(event.description || event.eventType)}</strong>
        <span>{String(event.userName || 'Sistema')} - {String(event.timestamp || '')}</span>
        <small>{String(event.entity || event.source || '')}</small>
      </article>
    )) : (
      <article class="condo-empty-state">
        <strong>Historico ainda vazio</strong>
        <span>As proximas alteracoes aparecem aqui automaticamente.</span>
      </article>
    )}
  </section>
));

export const FuturePanel = component$((props: { selected: Condominium }) => (
  <section class="condo-future-panel">
    <article>
      <strong>Mapa</strong>
      <span>{props.selected.address?.latitude ?? 'lat por definir'}, {props.selected.address?.longitude ?? 'lng por definir'}</span>
      <a href={props.selected.address?.googleMapsUrl || '#'} target="_blank" rel="noreferrer">Abrir mapa</a>
    </article>
    <article>
      <strong>QR por zona</strong>
      <span>{props.selected.zones?.filter((zone) => zone.publicQrUrl).length ?? 0} zonas preparadas</span>
    </article>
    <article>
      <strong>Planta 2D / 3D futuro</strong>
      <span>Campos e associacoes preparados; visualizador avancado fica para fase futura.</span>
    </article>
  </section>
));

function valueFor(values: Record<string, unknown> | undefined, name: string): string {
  const value = values?.[name];
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  return value === undefined || value === null ? '' : String(value);
}

function shortAddress(item: Condominium): string {
  const address = item.address;
  return [address?.street, address?.number, address?.postalCode, address?.locality]
    .filter(Boolean)
    .join(', ') || item.location || 'Morada por completar';
}

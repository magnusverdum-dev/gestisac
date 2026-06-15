import { component$, type PropFunction } from '@builder.io/qwik';
import type { CompletenessReport, Condominium, CondominiumAlert, CondominiumPlanMarker } from '../../lib/api';

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
  | 'plan-markers'
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
    onSubmit$={async (event) => props.onSubmit$(event.currentTarget as HTMLFormElement)}
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
  orderMode?: string;
  isSaving: boolean;
  onOrderChange$?: PropFunction<(value: string) => void>;
  onDownload$?: PropFunction<(resource: 'documents' | 'media', id: string) => void>;
  onSubmit$: PropFunction<(form: HTMLFormElement, resource: SubresourceName, fields: FieldConfig[]) => void>;
};

export const SubresourcePanel = component$((props: SubresourcePanelProps) => (
  <section class="condo-subresource">
    <form
      class="condo-editor"
      preventdefault:submit
      onSubmit$={async (event) => props.onSubmit$(event.currentTarget as HTMLFormElement, props.resource, props.fields)}
    >
      <header>
        <strong>Adicionar {props.title.toLowerCase()}</strong>
        <span>Fica associado a este condominio e entra no historico.</span>
      </header>
      {props.resource === 'blocks' && props.onOrderChange$ ? (
        <label class="condo-inline-field">
          <span>Ordenar visualmente</span>
          <select value={props.orderMode || 'name'} onChange$={(event) => props.onOrderChange$?.((event.target as HTMLSelectElement).value)}>
            <option value="name">Nome</option>
            <option value="code">Codigo</option>
            <option value="status">Estado</option>
          </select>
        </label>
      ) : null}
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
          {(props.resource === 'documents' || props.resource === 'media') && props.onDownload$ ? (
            <button type="button" onClick$={() => props.onDownload$?.(props.resource as 'documents' | 'media', String(row.id))}>
              Download
            </button>
          ) : null}
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

export const AlertsPanel = component$((props: { alerts: CondominiumAlert[] }) => (
  <section class="condo-alert-grid">
    {props.alerts.length ? props.alerts.map((alert) => (
      <article class={`condo-alert-card ${alert.severity}`} key={alert.id}>
        <span>{alert.category}</span>
        <strong>{alert.title}</strong>
        <small>{alert.detail}{alert.dueDate ? ` - ${alert.dueDate}` : ''}</small>
      </article>
    )) : (
      <article class="condo-empty-state">
        <strong>Sem alertas automaticos</strong>
        <span>Documentos, zonas, equipamentos e manutencoes estao sem sinais criticos.</span>
      </article>
    )}
  </section>
));

export const History = component$((props: { events: Array<Record<string, unknown>>; query?: string; source?: string }) => (
  <section class="condo-timeline">
    {filteredHistory(props.events, props.query, props.source).length ? filteredHistory(props.events, props.query, props.source).map((event) => (
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

export const AssetUploadPanel = component$((props: {
  kind: 'documents' | 'media';
  isSaving: boolean;
  onUpload$: PropFunction<(form: HTMLFormElement, kind: 'documents' | 'media') => void>;
}) => (
  <form
    class="condo-upload-panel"
    preventdefault:submit
    onSubmit$={(event) => props.onUpload$(event.currentTarget as HTMLFormElement, props.kind)}
  >
    <strong>{props.kind === 'documents' ? 'Upload de documento' : 'Upload de imagem/planta'}</strong>
    <div class="condo-form-grid compact">
      <Field name="title" label="Titulo" />
      <Field name={props.kind === 'documents' ? 'documentType' : 'mediaType'} label="Tipo" />
      <Field name="description" label="Descricao" kind="textarea" />
      {props.kind === 'documents' ? <Field name="expiryDate" label="Validade" /> : null}
      {props.kind === 'media' ? <Field name="isPrimary" label="Imagem principal" kind="checkbox" /> : null}
    </div>
    <label class="wide">
      <span>Ficheiro</span>
      <input name="file" type="file" />
    </label>
    <button class="primary-action" type="submit" disabled={props.isSaving}>Carregar</button>
  </form>
));

export const FuturePanel = component$((props: {
  selected: Condominium;
  markers: CondominiumPlanMarker[];
  onAddMarker$: PropFunction<(form: HTMLFormElement) => void>;
}) => {
  const plan = props.selected.media?.find((media) => media.mediaType.toLowerCase().includes('planta')) ?? props.selected.media?.[0];
  const mapUrl = mapEmbedUrl(props.selected);
  const model = props.selected.media?.find((media) => /\.(glb|gltf)$/i.test(media.fileUrl || media.fileName));
  const modelUrl = model?.fileUrl || model?.downloadUrl || '';
  const viewerUrl = modelUrl ? buildThreeViewerUrl(modelUrl, props.selected.name) : '';

  return (
    <section class="condo-future-panel">
      <article class="condo-future-readiness">
        <strong>Estado da preparacao Mapa/QR/Planta/3D</strong>
        <div class="condo-qr-grid">
          <span>{mapUrl ? 'Mapa: ativo (coordenadas encontradas)' : 'Mapa: pendente (falta latitude/longitude)'}</span>
          <span>{(props.selected.zones ?? []).length ? `QR: ${(props.selected.zones ?? []).length} zonas prontas` : 'QR: pendente (sem zonas)'}</span>
          <span>{plan ? 'Planta 2D: ativa' : 'Planta 2D: pendente (sem imagem/planta)'}</span>
          <span>{model ? '3D: ativo (.glb/.gltf associado)' : '3D: pendente (sem modelo)'}</span>
        </div>
        <small>Esta vista e uma preparacao visual para operacao: mostra o que ja esta pronto e o que falta para ativar cada capacidade.</small>
      </article>
      <article class="condo-map-panel">
        <strong>Mapa operacional</strong>
        {mapUrl ? <iframe src={mapUrl} title={`Mapa de ${props.selected.name}`} loading="lazy" /> : <span>Coordenadas por definir</span>}
        <a href={props.selected.address?.googleMapsUrl || mapUrl || '#'} target="_blank" rel="noreferrer">Abrir mapa</a>
      </article>
      <article>
        <strong>QR por zona</strong>
        <div class="condo-qr-grid">
          {(props.selected.zones ?? []).slice(0, 6).map((zone) => (
            <a key={zone.id} href={`/api/condominiums/${props.selected.id}/zones/${zone.id}/qr.svg`} target="_blank" rel="noreferrer">
              <img src={`/api/condominiums/${props.selected.id}/zones/${zone.id}/qr.svg`} alt={`QR ${zone.name}`} />
              <span>{zone.name}</span>
            </a>
          ))}
        </div>
        <small>Os QR ligam diretamente as zonas para inspeccao, manutencao e historico operativo.</small>
      </article>
      <article class="condo-plan-panel">
        <strong>Planta 2D</strong>
        {plan ? (
          <div class="condo-plan-canvas">
            <img src={plan.fileUrl || plan.downloadUrl} alt={plan.title} />
            {props.markers.map((marker) => (
              <button
                key={marker.id}
                class="condo-plan-marker"
                type="button"
                style={`left:${marker.xPercent}%;top:${marker.yPercent}%`}
                title={marker.notes || marker.label}
              >
                {marker.label.slice(0, 2).toUpperCase()}
              </button>
            ))}
          </div>
        ) : <span>Carrega uma planta na aba Imagens e plantas para ativar a vista 2D.</span>}
        <form class="condo-marker-form" preventdefault:submit onSubmit$={(event) => props.onAddMarker$(event.currentTarget as HTMLFormElement)}>
          <Field name="label" label="Marcador" />
          <Field name="xPercent" label="X %" kind="number" value="50" />
          <Field name="yPercent" label="Y %" kind="number" value="50" />
          <button type="submit">Adicionar marcador</button>
        </form>
      </article>
      <article class="condo-three-panel">
        <strong>Visualizador 3D</strong>
        {model ? (
          <>
            <span>O viewer abre fora do bundle principal para manter a app leve no arranque.</span>
            <a class="secondary-action" href={viewerUrl} target="_blank" rel="noreferrer">
              Abrir vista 3D
            </a>
          </>
        ) : (
          <span>Associa um ficheiro .glb ou .gltf para ativar o modelo 3D.</span>
        )}
      </article>
    </section>
  );
});

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

function filteredHistory(events: Array<Record<string, unknown>>, query = '', source = '') {
  const needle = query.trim().toLowerCase();
  return events.filter((event) => {
    const matchesQuery = !needle || JSON.stringify(event).toLowerCase().includes(needle);
    const matchesSource = !source || String(event.source || event.entity || '').toLowerCase().includes(source.toLowerCase());
    return matchesQuery && matchesSource;
  });
}

function mapEmbedUrl(item: Condominium): string {
  const lat = item.address?.latitude;
  const lon = item.address?.longitude;
  if (typeof lat === 'number' && typeof lon === 'number') {
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.002}%2C${lat - 0.002}%2C${lon + 0.002}%2C${lat + 0.002}&layer=mapnik&marker=${lat}%2C${lon}`;
  }
  return '';
}

function buildThreeViewerUrl(modelUrl: string, title: string): string {
  const searchParams = new URLSearchParams({
    model: modelUrl,
    title,
  });
  return `/viewer-3d/index.html?${searchParams.toString()}`;
}

function shortAddress(item: Condominium): string {
  const address = item.address;
  return [address?.street, address?.number, address?.postalCode, address?.locality]
    .filter(Boolean)
    .join(', ') || item.location || 'Morada por completar';
}

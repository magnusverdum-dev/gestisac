import { component$, Slot, type PropFunction } from '@builder.io/qwik';
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  HomeIcon,
  LinkIcon,
  UserIcon,
  WrenchIcon
} from 'lucide-qwik';
import type { ResourceState } from '../../lib/api';
import {
  condominiumPath,
  entityPath,
  personPath,
  slugify,
  supplierPath,
  type EntityRouteMatch
} from '../../lib/entity-navigation';
import { EntityAction } from '../common/EntityAction';

type DetailRoute = Extract<EntityRouteMatch, { kind: 'detail' }>;

type EntityDetailPageProps = {
  route: DetailRoute;
  resources: ResourceState;
  navigate$: PropFunction<(path: string) => void>;
};

export const EntityDetailPage = component$((props: EntityDetailPageProps) => {
  const route = props.route;

  if (route.entityType === 'ticket') {
    const ticket = props.resources.tickets.find((item) => item.id === route.id);
    const linkedMaintenance = ticket
      ? props.resources.maintenance.find((item) => item.id === ticket.linkedMaintenanceId || item.ticketId === ticket.id)
      : undefined;
    const linkedEvent = ticket
      ? props.resources.calendarEvents.find((item) => item.id === ticket.linkedCalendarEventId || item.linkedEntityId === ticket.id)
      : undefined;

    return ticket ? (
      <DetailFrame
        eyebrow="GESTISAC - Ticket"
        title={ticket.title}
        subtitle={`${ticket.condominium} - ${ticket.priority} - ${ticket.status}`}
        backPath="/tickets"
        navigate$={props.navigate$}
      >
        <section class="entity-detail-grid">
          <InfoCard label="Estado" value={ticket.status} detail={ticket.updatedAt || ticket.createdAt || 'Sem data'} />
          <InfoCard label="Prioridade" value={ticket.priority} detail={ticket.category || ticket.type || 'Operacional'} />
          <InfoCard label="Canal" value={ticket.channel || 'Portal'} detail={ticket.dueAt || 'Sem prazo'} />
          <InfoCard label="Tags" value={ticket.tags?.join(', ') || 'Sem tags'} detail="Classificacao CMT" />
        </section>
        <section class="entity-story glass-panel">
          <p>{ticket.detail}</p>
        </section>
        <section class="entity-link-grid">
          <EntityCard icon="user" label="Requerente" title={ticket.requesterName || 'Por definir'} detail={ticket.requesterEmail || 'Sem contacto'} path={ticket.requesterName || ticket.requesterEmail ? personPath(props.resources, ticket.requesterName, ticket.requesterEmail) : ''} navigate$={props.navigate$} />
          <EntityCard icon="user" label="Responsavel" title={ticket.assignee || 'Por atribuir'} detail="Perfil operacional" path={ticket.assignee ? personPath(props.resources, ticket.assignee) : ''} navigate$={props.navigate$} />
          <EntityCard icon="home" label="Condominio" title={ticket.condominium || 'Geral'} detail="Ficha do condominio" path={condominiumPath(props.resources, ticket.condominium)} navigate$={props.navigate$} />
          <EntityCard icon="wrench" label="Manutencao ligada" title={linkedMaintenance?.title || ticket.linkedMaintenanceId || 'Ligacao nao encontrada'} detail={linkedMaintenance?.status || 'Sem manutencao resolvida'} path={linkedMaintenance ? entityPath('maintenance', linkedMaintenance.id) : ''} navigate$={props.navigate$} />
          <EntityCard icon="calendar" label="Evento ligado" title={linkedEvent?.title || ticket.linkedCalendarEventId || 'Ligacao nao encontrada'} detail={linkedEvent?.startAt || 'Sem evento resolvido'} path={linkedEvent ? entityPath('calendarEvent', linkedEvent.id) : ''} navigate$={props.navigate$} />
        </section>
      </DetailFrame>
    ) : <MissingEntity route={route} navigate$={props.navigate$} />;
  }

  if (route.entityType === 'maintenance') {
    const item = props.resources.maintenance.find((entry) => entry.id === route.id);
    const linkedTicket = item
      ? props.resources.tickets.find((ticket) => ticket.id === item.ticketId || ticket.linkedMaintenanceId === item.id)
      : undefined;
    const linkedEvent = item
      ? props.resources.calendarEvents.find((event) => event.id === item.calendarEventId || event.linkedEntityId === item.id)
      : undefined;

    return item ? (
      <DetailFrame
        eyebrow="GESTISAC - Manutencao"
        title={item.title}
        subtitle={`${item.condominium || 'Geral'} - ${item.status}`}
        backPath="/manutencao"
        navigate$={props.navigate$}
      >
        <section class="entity-detail-grid">
          <InfoCard label="Tipo" value={item.type || 'Preventiva'} detail={item.priority || 'Normal'} />
          <InfoCard label="Agenda" value={item.scheduledStart || item.date} detail={item.scheduledEnd || 'Fim por definir'} />
          <InfoCard label="Equipamento" value={item.equipmentId || 'Por definir'} detail={item.zoneId || 'Zona por definir'} />
          <InfoCard label="Custo" value={item.costEstimate ? `${item.costEstimate} EUR` : 'Sem estimativa'} detail={item.completedAt || 'Nao concluida'} />
        </section>
        <section class="entity-story glass-panel"><p>{item.notes || 'Sem notas operacionais.'}</p></section>
        <section class="entity-link-grid">
          <EntityCard icon="home" label="Condominio" title={item.condominium || 'Geral'} detail="Ficha do condominio" path={condominiumPath(props.resources, item.condominium)} navigate$={props.navigate$} />
          <EntityCard icon="wrench" label="Fornecedor" title={item.supplier || 'Por definir'} detail="Perfil do fornecedor" path={item.supplier ? supplierPath(props.resources, item.supplier) : ''} navigate$={props.navigate$} />
          <EntityCard icon="link" label="Ticket ligado" title={linkedTicket?.title || item.ticketId || 'Ligacao nao encontrada'} detail={linkedTicket?.status || 'Sem ticket resolvido'} path={linkedTicket ? entityPath('ticket', linkedTicket.id) : ''} navigate$={props.navigate$} />
          <EntityCard icon="calendar" label="Evento ligado" title={linkedEvent?.title || item.calendarEventId || 'Ligacao nao encontrada'} detail={linkedEvent?.startAt || 'Sem evento resolvido'} path={linkedEvent ? entityPath('calendarEvent', linkedEvent.id) : ''} navigate$={props.navigate$} />
        </section>
      </DetailFrame>
    ) : <MissingEntity route={route} navigate$={props.navigate$} />;
  }

  if (route.entityType === 'inspection') {
    const inspection = props.resources.inspections.find((item) => item.id === route.id);
    const linkedEvent = inspection
      ? props.resources.calendarEvents.find((event) => event.id === inspection.calendarEventId || event.linkedEntityId === inspection.id)
      : undefined;

    return inspection ? (
      <DetailFrame
        eyebrow="GESTISAC - Vistoria"
        title={inspection.title}
        subtitle={`${inspection.condominium || 'Geral'} - ${inspection.status}`}
        backPath="/vistorias"
        navigate$={props.navigate$}
      >
        <section class="entity-detail-grid">
          <InfoCard label="Data prevista" value={inspection.requiredDate || 'Por definir'} detail={inspection.location || 'Local por definir'} />
          <InfoCard label="Resultado" value={inspection.result || 'Sem resultado'} detail={inspection.submittedAt || 'Sem submissao'} />
          <InfoCard label="Checklist" value={String(inspection.checklist.length)} detail={inspection.checklist.join(', ') || 'Sem itens'} />
          <InfoCard label="Validacao HQ" value={inspection.confirmedBy || 'Por confirmar'} detail={inspection.confirmedAt || 'Sem confirmacao'} />
        </section>
        <section class="entity-story glass-panel">
          <p>{inspection.workerNotes || 'Sem notas do trabalhador.'}</p>
          <small>{inspection.hqNotes || 'Sem notas HQ.'}</small>
        </section>
        <section class="entity-link-grid">
          <EntityCard icon="home" label="Condominio" title={inspection.condominium || 'Geral'} detail="Ficha do condominio" path={condominiumPath(props.resources, inspection.condominium)} navigate$={props.navigate$} />
          <EntityCard icon="calendar" label="Evento ligado" title={linkedEvent?.title || inspection.calendarEventId || 'Ligacao nao encontrada'} detail={linkedEvent?.startAt || 'Sem evento resolvido'} path={linkedEvent ? entityPath('calendarEvent', linkedEvent.id) : ''} navigate$={props.navigate$} />
        </section>
      </DetailFrame>
    ) : <MissingEntity route={route} navigate$={props.navigate$} />;
  }

  if (route.entityType === 'calendarEvent') {
    const event = props.resources.calendarEvents.find((item) => item.id === route.id);
    const linkedPath = event ? linkedEntityPath(props.resources, event.linkedEntityType, event.linkedEntityId) : '';

    return event ? (
      <DetailFrame
        eyebrow="GESTISAC - Calendario"
        title={event.title}
        subtitle={`${event.condominium || 'Geral'} - ${event.eventType} - ${event.status}`}
        backPath="/calendario"
        navigate$={props.navigate$}
      >
        <section class="entity-detail-grid">
          <InfoCard label="Inicio" value={event.startAt} detail="Data/hora de inicio" />
          <InfoCard label="Fim" value={event.endAt} detail="Data/hora de fim" />
          <InfoCard label="Local" value={event.location || 'Por definir'} detail={event.status} />
          <InfoCard label="Participantes" value={String(event.attendees.length)} detail={event.attendees.join(', ') || 'Sem participantes'} />
        </section>
        <section class="entity-story glass-panel">
          <p>{event.description || 'Sem descricao.'}</p>
          {event.eventType === 'Email' ? <small>Email planeado/registado. Nao existe envio real nesta fase.</small> : null}
        </section>
        <section class="entity-link-grid">
          <EntityCard icon="home" label="Condominio" title={event.condominium || 'Geral'} detail="Ficha do condominio" path={condominiumPath(props.resources, event.condominium)} navigate$={props.navigate$} />
          <EntityCard icon="link" label="Ligacao" title={event.linkedEntityType || 'Sem ligacao'} detail={event.linkedEntityId || 'Nenhuma entidade associada'} path={linkedPath} navigate$={props.navigate$} />
        </section>
      </DetailFrame>
    ) : <MissingEntity route={route} navigate$={props.navigate$} />;
  }

  if (route.entityType === 'condominium') {
    const condominium = props.resources.condominiums.find((item) => item.id === route.id);
    const relatedTickets = condominium ? props.resources.tickets.filter((ticket) => ticket.condominium === condominium.name) : [];
    const relatedMaintenance = condominium ? props.resources.maintenance.filter((item) => item.condominium === condominium.name) : [];
    const relatedEvents = condominium ? props.resources.calendarEvents.filter((event) => event.condominium === condominium.name) : [];
    const relatedResidents = condominium ? props.resources.residents.filter((resident) => resident.condominium === condominium.name) : [];

    return condominium ? (
      <DetailFrame
        eyebrow="GESTISAC - Condominio"
        title={condominium.name}
        subtitle={`${condominium.location || condominium.address?.locality || 'Localidade por definir'} - ${condominium.status}`}
        backPath="/condominios"
        navigate$={props.navigate$}
      >
        <section class="entity-detail-grid">
          <InfoCard label="Fracoes" value={String(condominium.structure?.totalFractions || condominium.fractions)} detail="Total registado" />
          <InfoCard label="Blocos" value={String(condominium.structure?.blocksCount || condominium.buildings)} detail="Estrutura fisica" />
          <InfoCard label="Moradores" value={String(relatedResidents.length)} detail="Perfis ligados" />
          <InfoCard label="Eventos" value={String(relatedEvents.length)} detail="Timeline operacional" />
        </section>
        <section class="entity-link-grid">
          <EntityCard icon="link" label="Tickets" title={`${relatedTickets.length} tickets`} detail="Abrir CMT filtrado" path="/tickets/estado/abertos" navigate$={props.navigate$} />
          <EntityCard icon="wrench" label="Manutencao" title={`${relatedMaintenance.length} intervencoes`} detail="Plano tecnico" path="/manutencao" navigate$={props.navigate$} />
          <EntityCard icon="calendar" label="Calendario" title={`${relatedEvents.length} eventos`} detail="Agenda e timeline" path="/calendario" navigate$={props.navigate$} />
          <EntityCard icon="user" label="Moradores" title={`${relatedResidents.length} perfis`} detail="Utilizadores e fracoes" path="/condominios?area=support" navigate$={props.navigate$} />
        </section>
        <RelatedList title="Ultimas relacoes" items={[
          ...relatedTickets.slice(0, 4).map((ticket) => ({ id: ticket.id, title: ticket.title, detail: `${ticket.priority} - ${ticket.status}`, path: entityPath('ticket', ticket.id) })),
          ...relatedMaintenance.slice(0, 4).map((item) => ({ id: item.id, title: item.title, detail: `${item.type || 'Manutencao'} - ${item.status}`, path: entityPath('maintenance', item.id) }))
        ]} navigate$={props.navigate$} />
      </DetailFrame>
    ) : <MissingEntity route={route} navigate$={props.navigate$} />;
  }

  if (route.entityType === 'resident') {
    const profile = profileForRoute(props.resources, route.id);

    return profile ? (
      <DetailFrame
        eyebrow={profile.kind === 'resident' ? 'GESTISAC - Morador' : 'GESTISAC - Perfil operacional'}
        title={profile.name}
        subtitle={profile.subtitle}
        backPath="/condominios"
        navigate$={props.navigate$}
      >
        <section class="entity-detail-grid">
          <InfoCard label="Email" value={profile.email || 'Sem email'} detail="Contacto principal" />
          <InfoCard label="Telefone" value={profile.phone || 'Sem telefone'} detail="Contacto alternativo" />
          <InfoCard label="Condominio" value={profile.condominium || 'Geral'} detail={profile.fraction ? `Fracao ${profile.fraction}` : 'Perfil transversal'} />
          <InfoCard label="Registos" value={String(profile.related.length)} detail="Tickets/manutencao relacionados" />
        </section>
        <RelatedList title="Historico associado" items={profile.related} navigate$={props.navigate$} />
      </DetailFrame>
    ) : <MissingEntity route={route} navigate$={props.navigate$} />;
  }

  if (route.entityType === 'supplier') {
    const supplier = props.resources.suppliers.find((item) => item.id === route.id) ?? supplierFromFallback(props.resources, route.id);
    const relatedMaintenance = supplier ? props.resources.maintenance.filter((item) => item.supplier === supplier.name) : [];
    const relatedExpenses = supplier ? props.resources.accounting.expenses.filter((item) => item.supplier === supplier.name) : [];

    return supplier ? (
      <DetailFrame eyebrow="GESTISAC - Fornecedor" title={supplier.name} subtitle={`${supplier.category} - ${supplier.status}`} backPath="/fornecedores" navigate$={props.navigate$}>
        <section class="entity-detail-grid">
          <InfoCard label="Categoria" value={supplier.category} detail="Area de servico" />
          <InfoCard label="Contacto" value={supplier.contact} detail="Contacto operacional" />
          <InfoCard label="Manutencoes" value={String(relatedMaintenance.length)} detail="Intervencoes ligadas" />
          <InfoCard label="Despesas" value={String(relatedExpenses.length)} detail="Movimentos financeiros" />
        </section>
        <RelatedList title="Intervencoes e movimentos" items={[
          ...relatedMaintenance.map((item) => ({ id: item.id, title: item.title, detail: `${item.status} - ${item.date}`, path: entityPath('maintenance', item.id) })),
          ...relatedExpenses.map((item) => ({ id: item.id, title: item.category, detail: `${item.amount} EUR - ${item.status}`, path: entityPath('accounting', item.id, 'despesas') }))
        ]} navigate$={props.navigate$} />
      </DetailFrame>
    ) : <MissingEntity route={route} navigate$={props.navigate$} />;
  }

  if (route.entityType === 'document') {
    const document = props.resources.documents.find((item) => item.id === route.id);
    return document ? (
      <DetailFrame eyebrow="GESTISAC - Documento" title={document.title} subtitle={`${document.type} - ${document.status}`} backPath="/documentos" navigate$={props.navigate$}>
        <section class="entity-detail-grid">
          <InfoCard label="Condominio" value={document.condominium || 'Geral'} detail="Contexto documental" />
          <InfoCard label="Ficheiro" value={document.fileName || 'Sem ficheiro'} detail={document.mimeType || 'Tipo por definir'} />
          <InfoCard label="Tamanho" value={formatBytes(document.sizeBytes)} detail="Arquivo local" />
          <InfoCard label="Upload" value={document.uploadedAt || 'Sem data'} detail="Data de entrada" />
        </section>
        <section class="entity-link-grid">
          <EntityCard icon="home" label="Condominio" title={document.condominium || 'Geral'} detail="Ficha do condominio" path={condominiumPath(props.resources, document.condominium)} navigate$={props.navigate$} />
        </section>
      </DetailFrame>
    ) : <MissingEntity route={route} navigate$={props.navigate$} />;
  }

  if (route.entityType === 'report') {
    const report = props.resources.reports.find((item) => item.id === route.id);
    return report ? (
      <DetailFrame eyebrow="GESTISAC - Relatorio" title={report.title} subtitle={`${report.period} - ${report.status}`} backPath="/relatorios" navigate$={props.navigate$}>
        <section class="entity-detail-grid">
          <InfoCard label="Periodo" value={report.period} detail="Janela de analise" />
          <InfoCard label="Estado" value={report.status} detail="Disponibilidade" />
        </section>
      </DetailFrame>
    ) : <MissingEntity route={route} navigate$={props.navigate$} />;
  }

  if (route.entityType === 'accounting') {
    const movement = accountingMovement(props.resources, route.subtype || '', route.id);
    return movement ? (
      <DetailFrame eyebrow="GESTISAC - Contabilidade" title={movement.title} subtitle={movement.subtitle} backPath="/contabilidade" navigate$={props.navigate$}>
        <section class="entity-detail-grid">
          {movement.fields.map((field) => <InfoCard key={field.label} label={field.label} value={field.value} detail={field.detail} />)}
        </section>
      </DetailFrame>
    ) : <MissingEntity route={route} navigate$={props.navigate$} />;
  }

  return <MissingEntity route={route} navigate$={props.navigate$} />;
});

const DetailFrame = component$((props: {
  eyebrow: string;
  title: string;
  subtitle: string;
  backPath: string;
  navigate$: PropFunction<(path: string) => void>;
}) => (
  <section class="page-view entity-detail-page">
    <header class="entity-hero glass-panel">
      <div>
        <span class="page-eyebrow">{props.eyebrow}</span>
        <h1>{props.title}</h1>
        <p>{props.subtitle}</p>
      </div>
      <EntityAction class="secondary-action action-with-icon" path={props.backPath} navigate$={props.navigate$} ariaLabel="Voltar ao modulo">
        <ArrowLeftIcon size={16} />
        Voltar
      </EntityAction>
    </header>
    <Slot />
  </section>
));

const InfoCard = component$((props: { label: string; value: string; detail: string }) => (
  <article class="entity-info-card glass-panel">
    <span>{props.label}</span>
    <strong>{props.value || 'Por definir'}</strong>
    <small>{props.detail}</small>
  </article>
));

const EntityCard = component$((props: {
  icon: 'calendar' | 'home' | 'link' | 'user' | 'wrench';
  label: string;
  title: string;
  detail: string;
  path: string;
  navigate$: PropFunction<(path: string) => void>;
}) => (
  <EntityAction class="entity-relation-card glass-panel" path={props.path} navigate$={props.navigate$} disabled={!props.path} ariaLabel={`Abrir ${props.title}`}>
    <span class="relation-icon">{iconFor(props.icon)}</span>
    <small>{props.label}</small>
    <strong>{props.title}</strong>
    <em>{props.path ? props.detail : 'Ligacao nao encontrada'}</em>
  </EntityAction>
));

const RelatedList = component$((props: {
  title: string;
  items: Array<{ id: string; title: string; detail: string; path: string }>;
  navigate$: PropFunction<(path: string) => void>;
}) => (
  <section class="entity-related-list glass-panel">
    <strong>{props.title}</strong>
    {props.items.length ? props.items.map((item) => (
      <EntityAction class="entity-related-row" key={`${item.path}-${item.id}`} path={item.path} navigate$={props.navigate$}>
        <span>{item.title}</span>
        <small>{item.detail}</small>
      </EntityAction>
    )) : <span class="empty-relation">Sem relacoes registadas.</span>}
  </section>
));

const MissingEntity = component$((props: { route: DetailRoute; navigate$: PropFunction<(path: string) => void> }) => (
  <section class="page-view entity-detail-page">
    <header class="entity-hero glass-panel">
      <div>
        <span class="page-eyebrow">Ligacao nao encontrada</span>
        <h1>Registo indisponivel</h1>
        <p>Nao foi possivel resolver {props.route.entityType} com ID {props.route.id}. A ligacao existe, mas os dados ainda nao estao carregados ou foram removidos.</p>
      </div>
      <EntityAction class="secondary-action" path={props.route.basePath} navigate$={props.navigate$}>Voltar</EntityAction>
    </header>
  </section>
));

function iconFor(icon: 'calendar' | 'home' | 'link' | 'user' | 'wrench') {
  if (icon === 'calendar') return <CalendarDaysIcon size={18} />;
  if (icon === 'home') return <HomeIcon size={18} />;
  if (icon === 'user') return <UserIcon size={18} />;
  if (icon === 'wrench') return <WrenchIcon size={18} />;
  return <LinkIcon size={18} />;
}

function linkedEntityPath(resources: ResourceState, type: string, id: string): string {
  const normalized = type.toLowerCase();
  if (!id) return '';
  if (normalized.includes('ticket')) return entityPath('ticket', id);
  if (normalized.includes('maintenance') || normalized.includes('manutencao')) return entityPath('maintenance', id);
  if (normalized.includes('inspection') || normalized.includes('vistoria')) return entityPath('inspection', id);
  if (normalized.includes('document')) return entityPath('document', id);
  if (normalized.includes('condominium') || normalized.includes('condominio')) return entityPath('condominium', id);
  const ticket = resources.tickets.find((item) => item.id === id);
  if (ticket) return entityPath('ticket', ticket.id);
  const maintenance = resources.maintenance.find((item) => item.id === id);
  if (maintenance) return entityPath('maintenance', maintenance.id);
  const inspection = resources.inspections.find((item) => item.id === id);
  if (inspection) return entityPath('inspection', inspection.id);
  return '';
}

function profileForRoute(resources: ResourceState, id: string) {
  const resident = resources.residents.find((item) => item.id === id);
  if (resident) {
    const relatedTickets = resources.tickets
      .filter((ticket) => ticket.requesterEmail === resident.email || ticket.requesterName === resident.name || ticket.condominium === resident.condominium)
      .slice(0, 8)
      .map((ticket) => ({ id: ticket.id, title: ticket.title, detail: `${ticket.priority} - ${ticket.status}`, path: entityPath('ticket', ticket.id) }));

    return {
      kind: 'resident',
      name: resident.name,
      email: resident.email,
      phone: resident.phone,
      condominium: resident.condominium,
      fraction: resident.fraction,
      subtitle: `${resident.condominium} - fracao ${resident.fraction} - ${resident.status}`,
      related: relatedTickets
    };
  }

  const lookup = id.replace(/^perfil-/, '');
  const matchingTickets = resources.tickets.filter((ticket) => {
    const requesterSlug = slugify(ticket.requesterName || ticket.requesterEmail || '');
    const assigneeSlug = slugify(ticket.assignee || '');
    return requesterSlug === lookup || assigneeSlug === lookup;
  });
  const matchingMaintenance = resources.maintenance.filter((item) => slugify(item.supplier || '') === lookup);
  const firstTicket = matchingTickets[0];
  const name = firstTicket?.requesterName || firstTicket?.assignee || matchingMaintenance[0]?.supplier || lookup.replace(/-/g, ' ');

  if (!matchingTickets.length && !matchingMaintenance.length && !name) {
    return null;
  }

  return {
    kind: 'profile',
    name,
    email: firstTicket?.requesterEmail || '',
    phone: '',
    condominium: firstTicket?.condominium || matchingMaintenance[0]?.condominium || 'Geral',
    fraction: '',
    subtitle: 'Perfil operacional derivado de tickets e manutencoes',
    related: [
      ...matchingTickets.map((ticket) => ({ id: ticket.id, title: ticket.title, detail: `${ticket.priority} - ${ticket.status}`, path: entityPath('ticket', ticket.id) })),
      ...matchingMaintenance.map((item) => ({ id: item.id, title: item.title, detail: `${item.type || 'Manutencao'} - ${item.status}`, path: entityPath('maintenance', item.id) }))
    ]
  };
}

function supplierFromFallback(resources: ResourceState, id: string) {
  const lookup = id.replace(/^fornecedor-/, '');
  const maintenance = resources.maintenance.find((item) => slugify(item.supplier || '') === lookup);
  if (!maintenance?.supplier) {
    return undefined;
  }

  return {
    id,
    name: maintenance.supplier,
    category: maintenance.type || 'Operacional',
    status: 'Derivado de manutencao',
    contact: 'Contacto por completar'
  };
}

function accountingMovement(resources: ResourceState, subtype: string, id: string) {
  const collections = [
    { subtype: 'dividas', records: resources.accounting.debts, title: 'Divida' },
    { subtype: 'despesas', records: resources.accounting.expenses, title: 'Despesa' },
    { subtype: 'quotas', records: resources.accounting.quotas, title: 'Quota' },
    { subtype: 'pagamentos', records: resources.accounting.payments, title: 'Pagamento' },
    { subtype: 'recibos', records: resources.accounting.receipts, title: 'Recibo' }
  ];
  const collection = collections.find((item) => item.subtype === subtype) ?? collections.find((item) => item.records.some((record) => record.id === id));
  const record = collection?.records.find((item) => item.id === id);

  if (!record || !collection) {
    return null;
  }

  const values = record as Record<string, unknown>;
  const title = String(values.title || values.category || values.resident || collection.title);
  const amount = typeof values.amount === 'number' ? `${values.amount.toLocaleString('pt-PT')} EUR` : String(values.amount || 'Sem valor');

  return {
    title,
    subtitle: `${collection.title} - ${String(values.status || 'Sem estado')}`,
    fields: [
      { label: 'Valor', value: amount, detail: 'Montante registado' },
      { label: 'Condominio', value: String(values.condominium || 'Geral'), detail: 'Contexto financeiro' },
      { label: 'Estado', value: String(values.status || 'Sem estado'), detail: String(values.dueDate || values.paidAt || values.issuedAt || 'Sem data') },
      { label: 'Referencia', value: id, detail: collection.title }
    ]
  };
}

function formatBytes(value: number): string {
  if (!value) return '0 KB';
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

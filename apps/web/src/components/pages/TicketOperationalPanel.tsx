import { component$, type PropFunction } from '@builder.io/qwik';
import type {
  TicketAssignPayload,
  TicketChecklistPayload,
  TicketMessagePayload,
  TicketReopenPayload,
  TicketResolutionPayload,
  TicketTransitionPayload
} from '../../lib/api';
import type { DemoPage } from '../../data/pages';

type TicketRecord = DemoPage['records'][number];

const TECHNICIAN_STATUS_FLOW = [
  'Atribuida',
  'Em deslocacao',
  'No local',
  'Em reparacao',
  'Aguardando material',
  'Resolvida'
];

const MAX_UPLOAD_IMAGE_EDGE = 1600;

type TicketOperationalPanelProps = {
  record: TicketRecord;
  pagePath: string;
  pageNavLabel: string;
  isSaving: boolean;
  onTicketTransition$: PropFunction<(id: string, payload: TicketTransitionPayload) => void>;
  onTicketAssign$: PropFunction<(id: string, payload: TicketAssignPayload) => void>;
  onTicketMessage$: PropFunction<(id: string, payload: TicketMessagePayload) => void>;
  onTicketAttachmentUpload$: PropFunction<(id: string, payload: FormData) => void>;
  onTicketChecklist$: PropFunction<(id: string, payload: TicketChecklistPayload) => void>;
  onTicketConfirmResolution$: PropFunction<(id: string, payload: TicketResolutionPayload) => void>;
  onTicketReopen$: PropFunction<(id: string, payload: TicketReopenPayload) => void>;
};

export const TicketOperationalPanel = component$((props: TicketOperationalPanelProps) => {
  const record = props.record;
  const operational = record.operational;
  if (!operational) {
    return null;
  }

  const isTechnicianView = props.pagePath === '/tecnico/avarias';
  const isResidentView = props.pagePath === '/condomino/avarias';

  return (
    <div class={isTechnicianView ? 'ticket-operational-detail technician-focus' : isResidentView ? 'ticket-operational-detail resident-focus' : 'ticket-operational-detail'}>
      <div class="ticket-operational-grid">
        <article class={operational.isEmergency ? 'danger' : ''}>
          <small>Prioridade</small>
          <strong>{operational.priority}</strong>
          <span>{operational.isEmergency ? 'Modo emergencia' : operational.category}</span>
        </article>
        <article>
          <small>SLA</small>
          <strong>{operational.slaState}</strong>
          <span>{operational.slaDueAt}</span>
        </article>
        <article>
          <small>Responsavel</small>
          <strong>{operational.assignedTechnician}</strong>
          <span>{operational.location}</span>
        </article>
        <article>
          <small>Condomino</small>
          <strong>{operational.resident}</strong>
          <span>Reportado por {operational.reporterName}</span>
        </article>
      </div>

      {record.id ? (
        <div class="ticket-action-lab">
          <div class="tech-command-grid" aria-label="Fluxo do tecnico">
            {TECHNICIAN_STATUS_FLOW.map((status) => (
              <button
                class={status === 'Resolvida' ? 'success' : ''}
                key={status}
                type="button"
                disabled={props.isSaving || operational.status === status}
                onClick$={async () => {
                  await props.onTicketTransition$(record.id!, {
                    status,
                    note: `Atualizado na vista ${props.pageNavLabel}`
                  });
                }}
              >
                {status}
              </button>
            ))}
            <button
              class="warning"
              type="button"
              disabled={props.isSaving}
              onClick$={async () => {
                const reason = window.prompt('Motivo para reabrir a avaria?')?.trim();
                if (reason) {
                  await props.onTicketReopen$(record.id!, { reason });
                }
              }}
            >
              Reabrir
            </button>
          </div>

          <div class="ticket-form-grid">
            {!isResidentView ? (
              <form
                class="ticket-inline-form"
                preventdefault:submit
                onSubmit$={async (event) => {
                  const form = event.target as HTMLFormElement;
                  const formData = new FormData(form);
                  const technician = String(formData.get('technician') ?? '').trim();
                  if (!technician) {
                    return;
                  }

                  await props.onTicketAssign$(record.id!, {
                    technician,
                    note: String(formData.get('note') ?? '').trim()
                  });
                  form.reset();
                }}
              >
                <strong>Atribuir tecnico</strong>
                <input name="technician" placeholder="Nome do tecnico / fornecedor" required />
                <input name="note" placeholder="Nota de atribuicao" />
                <button type="submit" disabled={props.isSaving}>
                  Atribuir
                </button>
              </form>
            ) : null}

            <form
              class="ticket-inline-form"
              preventdefault:submit
              onSubmit$={async (event) => {
                const form = event.target as HTMLFormElement;
                const formData = new FormData(form);
                const message = String(formData.get('message') ?? '').trim();
                if (!message) {
                  return;
                }

                await props.onTicketMessage$(record.id!, {
                  message,
                  role: isResidentView ? 'Condomino' : 'Operacao'
                });
                form.reset();
              }}
            >
              <strong>Chat operacional</strong>
              <textarea name="message" placeholder="Mensagem para tecnico, admin ou morador" required />
              <button type="submit" disabled={props.isSaving}>
                Enviar mensagem
              </button>
            </form>

            <form
              class="ticket-inline-form"
              preventdefault:submit
              onSubmit$={async (event) => {
                const form = event.target as HTMLFormElement;
                const formData = new FormData(form);
                const file = formData.get('file');
                if (file instanceof File) {
                  const compressed = await compressTicketImage(file);
                  formData.set('file', compressed, compressed.name);
                }

                await props.onTicketAttachmentUpload$(record.id!, formData);
                form.reset();
              }}
            >
              <strong>Fotos / videos</strong>
              <select name="kind">
                <option value="Foto antes">Foto antes</option>
                <option value="Foto depois">Foto depois</option>
                <option value="Video">Video</option>
                <option value="Documento">Documento</option>
              </select>
              <input name="caption" placeholder="Legenda curta" />
              <input name="file" type="file" accept="image/*,video/*,.pdf" required />
              <button type="submit" disabled={props.isSaving}>
                Carregar anexo
              </button>
            </form>

            <form
              class="ticket-inline-form resident-confirmation"
              preventdefault:submit
              onSubmit$={async (event) => {
                const form = event.target as HTMLFormElement;
                const submitter = (event as SubmitEvent).submitter as HTMLButtonElement | null;
                const formData = new FormData(form);
                const confirmed = submitter?.value !== 'reject';
                const comment = String(formData.get('comment') ?? '').trim();

                await props.onTicketConfirmResolution$(record.id!, {
                  confirmed,
                  comment: comment || (confirmed ? 'Confirmado na PWA' : 'Resolucao rejeitada na PWA'),
                  signature: operational.resident || operational.reporterName
                });
                form.reset();
              }}
            >
              <strong>Confirmacao do morador</strong>
              <textarea name="comment" placeholder="Comentario ou assinatura digital simples" />
              <div class="ticket-resolution-buttons">
                <button type="submit" value="confirm" disabled={props.isSaving}>
                  Confirmar resolucao
                </button>
                <button class="warning" type="submit" value="reject" disabled={props.isSaving}>
                  Rejeitar / reabrir
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <div class="ticket-detail-columns">
        <article>
          <h4>Timeline</h4>
          {operational.timeline.length ? (
            operational.timeline.slice(0, isTechnicianView || isResidentView ? 8 : 5).map((event) => (
              <div class="timeline-row" key={event.id}>
                <strong>{event.label}</strong>
                <span>{event.detail}</span>
                <small>{event.actor} - {event.createdAt}</small>
              </div>
            ))
          ) : (
            <span>Sem eventos registados.</span>
          )}
        </article>
        <article>
          <h4>Checklist</h4>
          {operational.checklist.length ? (
            operational.checklist.map((item) => (
              <div class={item.completed ? 'check-row done' : 'check-row'} key={item.id}>
                <span>{item.completed ? '[x]' : '[ ]'}</span>
                <strong>{item.label}</strong>
                <small>{item.required ? 'Obrigatorio' : 'Opcional'}</small>
                {record.id ? (
                  <button
                    type="button"
                    disabled={props.isSaving}
                    onClick$={async () => {
                      await props.onTicketChecklist$(record.id!, {
                        checklistItemId: item.id,
                        completed: !item.completed
                      });
                    }}
                  >
                    {item.completed ? 'Reabrir etapa' : 'Concluir'}
                  </button>
                ) : null}
              </div>
            ))
          ) : (
            <span>Checklist por tipo de avaria ainda por definir.</span>
          )}
        </article>
        <article>
          <h4>Before / after</h4>
          {operational.attachments.length ? (
            operational.attachments.slice(0, 6).map((attachment) => (
              <div class="media-row" key={attachment.id}>
                <strong>{attachment.kind}</strong>
                <span>{attachment.fileName}</span>
                <small>{attachment.caption || attachment.uploadedBy}</small>
              </div>
            ))
          ) : (
            <span>Sem fotografias ou videos associados.</span>
          )}
        </article>
        <article>
          <h4>Chat</h4>
          {operational.messages.length ? (
            operational.messages.slice(0, isResidentView ? 5 : 3).map((message) => (
              <div class="message-row" key={message.id}>
                <strong>{message.author}</strong>
                <span>{message.message}</span>
                <small>{message.role} - {message.createdAt}</small>
              </div>
            ))
          ) : (
            <span>Sem mensagens neste ticket.</span>
          )}
        </article>
      </div>
    </div>
  );
});

async function compressTicketImage(file: File): Promise<File> {
  if (
    !file.type.startsWith('image/') ||
    file.type === 'image/gif' ||
    file.size < 700_000 ||
    typeof document === 'undefined' ||
    typeof createImageBitmap === 'undefined'
  ) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_UPLOAD_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
    if (scale >= 1) {
      bitmap.close();
      return file;
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext('2d');
    if (!context) {
      bitmap.close();
      return file;
    }

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
    if (!blob || blob.size >= file.size) {
      return file;
    }

    const compressedName = file.name.replace(/\.[^.]+$/, '') || 'avaria';
    return new File([blob], `${compressedName}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now()
    });
  } catch {
    return file;
  }
}

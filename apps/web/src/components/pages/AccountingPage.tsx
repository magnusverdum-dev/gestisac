import { $, component$, Slot, useSignal, type PropFunction } from '@builder.io/qwik';
import { BanknoteIcon, FileTextIcon, MoreHorizontalIcon, SearchIcon } from 'lucide-qwik';
import type {
  AccountingPayment,
  BankTransaction,
  CashMovement,
  Debt,
  Expense,
  PaymentAgreement,
  Quota,
  Receipt,
  ResourceEndpoint,
  ResourceState
} from '../../lib/api';

type AccountingPageProps = {
  resources: ResourceState;
  isSaving: boolean;
  onCreate$: PropFunction<(resource: ResourceEndpoint, payload: Record<string, unknown>) => void>;
};

type ContextMode = 'general' | 'condominium' | 'resident' | 'supplier' | 'bank';
type DetailTab = 'summary' | 'quotas' | 'debts' | 'payments' | 'expenses' | 'bank' | 'receipts' | 'agreements';

export const AccountingPage = component$((props: AccountingPageProps) => {
  const mode = useSignal<ContextMode>('general');
  const selectedCondominium = useSignal(props.resources.condominiums[0]?.name ?? '');
  const selectedResident = useSignal(props.resources.residents[0]?.id ?? '');
  const selectedSupplier = useSignal(props.resources.suppliers[0]?.name ?? '');
  const tab = useSignal<DetailTab>('summary');
  const search = useSignal('');

  const resident = props.resources.residents.find((item) => item.id === selectedResident.value);
  const contextCondominium = mode.value === 'resident'
    ? resident?.condominium ?? selectedCondominium.value
    : selectedCondominium.value;
  const contextFraction = resident?.fraction ?? '';
  const accounting = props.resources.accounting;
  const condoData = financialForCondominium(props.resources, contextCondominium);
  const residentData = resident
    ? financialForResident(props.resources, resident.condominium, resident.fraction, resident.name)
    : emptyFinancialContext();
  const supplierData = financialForSupplier(props.resources, selectedSupplier.value);
  const activeData = mode.value === 'resident' ? residentData : mode.value === 'supplier' ? supplierData : condoData;
  const statement = mode.value === 'resident' && resident
    ? statementEntries(residentData.quotas, residentData.payments)
    : [];
  const records = rowsForTab(tab.value, activeData, search.value);
  const unreconciled = accounting.bankTransactions.filter((item) => item.reconciliationStatus.toLowerCase() !== 'reconciliado');
  const reconciliationTargets = [
    ...accounting.payments.map((item) => ({ id: item.id, label: `Pagamento ${item.resident} ${formatCurrency(item.amount)}`, type: 'payment' })),
    ...accounting.expenses.map((item) => ({ id: item.id, label: `Despesa ${item.category} ${formatCurrency(item.amount)}`, type: 'expense' })),
    ...accounting.debts.map((item) => ({ id: item.id, label: `Divida ${item.resident} ${formatCurrency(item.amount)}`, type: 'debt' }))
  ];

  const switchMode$ = $((next: ContextMode) => {
    mode.value = next;
    tab.value = next === 'supplier' ? 'expenses' : next === 'bank' ? 'bank' : 'summary';
    search.value = '';
  });

  const submitForm$ = $(async (event: SubmitEvent, resource: ResourceEndpoint) => {
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const payload: Record<string, unknown> = {};
    data.forEach((value, key) => {
      const raw = String(value).trim();
      payload[key] = ['amount', 'totalAmount', 'installmentCount'].includes(key) ? Number(raw || 0) : raw;
    });
    await props.onCreate$(resource, payload);
    form.reset();
  });

  return (
    <section class="accounting-workspace simple-workspace">
      <header class="page-header compact-page-header">
        <div>
          <span class="page-eyebrow">GESTISAC - Contabilidade</span>
          <h1>Contabilidade</h1>
          <p>Painel geral sem valores individuais. Escolhe um contexto para abrir saldos, extratos e movimentos.</p>
        </div>
      </header>

      <section class="summary-grid accounting-overview-grid" aria-label="Avisos gerais de contabilidade">
        <AccountingMetric icon="quota" label="Quotas por validar" value={accounting.overview.quotasToValidate} detail="Registos pendentes" />
        <AccountingMetric icon="bank" label="Movimentos por reconciliar" value={accounting.overview.unreconciledMovements} detail={ageDetail(accounting.overview.oldestUnreconciledAgeDays)} />
        <AccountingMetric icon="receipt" label="Recibos por emitir" value={accounting.overview.receiptsToIssue} detail="Pagamentos sem recibo ligado" />
        <AccountingMetric icon="debt" label="Dividas em acompanhamento" value={accounting.overview.debtsInFollowUp} detail={accounting.overview.overdueDebtSeverity} />
        <AccountingMetric icon="agreement" label="Acordos ativos" value={accounting.overview.activePaymentAgreements} detail={`${accounting.overview.brokenPaymentAgreements} em incumprimento`} />
        <AccountingMetric icon="reserve" label="Fundo de reserva" value={accounting.overview.reserveFundStatus} detail="Estado agregado" />
      </section>

      <section class="accounting-context-bar">
        {(['general', 'condominium', 'resident', 'supplier', 'bank'] as ContextMode[]).map((item) => (
          <button class={mode.value === item ? 'active' : ''} type="button" key={item} onClick$={() => switchMode$(item)}>
            {contextLabel(item)}
          </button>
        ))}
      </section>

      {mode.value === 'general' ? (
        <section class="accounting-safe-panel">
          <strong>Centro de controlo</strong>
          <span>Sem nomes de clientes, fornecedores, fracoes ou valores linha a linha neste nivel.</span>
          <div class="accounting-action-grid">
            <button type="button" onClick$={() => switchMode$('condominium')}>Abrir por condominio</button>
            <button type="button" onClick$={() => switchMode$('resident')}>Extrato de cliente</button>
            <button type="button" onClick$={() => switchMode$('bank')}>Reconciliacao bancaria</button>
          </div>
        </section>
      ) : (
        <section class="simple-detail-panel accounting-context-panel">
          <ContextPicker
            mode={mode.value}
            resources={props.resources}
            selectedCondominium={selectedCondominium.value}
            selectedResident={selectedResident.value}
            selectedSupplier={selectedSupplier.value}
            onCondominium$={(value) => (selectedCondominium.value = value)}
            onResident$={(value) => (selectedResident.value = value)}
            onSupplier$={(value) => (selectedSupplier.value = value)}
          />

          <div class="accounting-tab-row">
            {tabsForMode(mode.value).map((item) => (
              <button class={tab.value === item ? 'active' : ''} type="button" key={item} onClick$={() => (tab.value = item)}>
                {tabLabel(item)}
              </button>
            ))}
          </div>

          {mode.value === 'resident' && resident ? (
            <section class="accounting-statement-strip">
              <strong>{resident.name}</strong>
              <span>{resident.condominium} - fracao {resident.fraction} - saldo {formatCurrency(statement.at(-1)?.balance ?? 0)}</span>
            </section>
          ) : null}

          {tab.value === 'summary' ? <ContextSummary data={activeData} /> : null}
          {tab.value === 'agreements' ? (
            <AccountingCreatePanel title="Criar acordo de pagamento">
              <form preventdefault:submit onSubmit$={(event) => submitForm$(event, 'accounting/payment-agreements')}>
                <AccountingHidden name="condominium" value={contextCondominium} />
                <AccountingHidden name="fraction" value={contextFraction} />
                <label><span>Condomino</span><input name="resident" value={resident?.name ?? ''} required /></label>
                <label><span>Divida</span><input name="debtId" placeholder="ID da divida" /></label>
                <label><span>Valor total</span><input name="totalAmount" type="number" required /></label>
                <label><span>Prestacoes</span><input name="installmentCount" type="number" value="2" required /></label>
                <label><span>Proximo vencimento</span><input name="nextDueDate" placeholder="2026-06-08" required /></label>
                <label><span>Notas</span><input name="notes" placeholder="Resumo interno" /></label>
                <button class="primary-action" type="submit" disabled={props.isSaving}>Guardar acordo</button>
              </form>
            </AccountingCreatePanel>
          ) : null}
          {tab.value === 'payments' ? (
            <AccountingCreatePanel title="Registar recebimento em caixa">
              <form preventdefault:submit onSubmit$={(event) => submitForm$(event, 'accounting/cash-movements')}>
                <AccountingHidden name="condominium" value={contextCondominium} />
                <AccountingHidden name="movementType" value="entrada" />
                <AccountingHidden name="accountType" value="caixa" />
                <label><span>Origem</span><input name="source" placeholder="Quota / divida / acordo" required /></label>
                <label><span>Valor</span><input name="amount" type="number" required /></label>
                <label><span>Data</span><input name="occurredAt" placeholder="2026-05-30" required /></label>
                <label><span>Metodo</span><input name="method" placeholder="Transferencia / numerario" /></label>
                <label><span>Referencia</span><input name="reference" placeholder="Comprovativo" /></label>
                <button class="primary-action" type="submit" disabled={props.isSaving}>Registar recebimento</button>
              </form>
            </AccountingCreatePanel>
          ) : null}
          {tab.value === 'bank' ? (
            <AccountingCreatePanel title="Movimento bancario / reconciliacao">
              <form preventdefault:submit onSubmit$={(event) => submitForm$(event, 'accounting/bank-transactions')}>
                <AccountingHidden name="condominium" value={contextCondominium} />
                <label><span>Data</span><input name="occurredAt" placeholder="2026-05-30" required /></label>
                <label><span>Descricao</span><input name="description" placeholder="TRF fracao A-1" required /></label>
                <label><span>Valor</span><input name="amount" type="number" required /></label>
                <label><span>Direcao</span><input name="direction" value="entrada" required /></label>
                <label><span>Referencia</span><input name="reference" /></label>
                <button class="primary-action" type="submit" disabled={props.isSaving}>Adicionar movimento</button>
              </form>
              <form preventdefault:submit onSubmit$={(event) => submitForm$(event, 'accounting/reconciliations')}>
                <label><span>Movimento</span><select name="bankTransactionId">{unreconciled.map((item) => <option key={item.id} value={item.id}>{item.description}</option>)}</select></label>
                <label><span>Destino</span><select name="targetId">{reconciliationTargets.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
                <label><span>Tipo</span><select name="targetType">{reconciliationTargets.map((item) => <option key={`${item.type}-${item.id}`} value={item.type}>{item.type}</option>)}</select></label>
                <label><span>Notas</span><input name="notes" /></label>
                <button class="secondary-action" type="submit" disabled={props.isSaving || !unreconciled.length}>Reconciliar</button>
              </form>
            </AccountingCreatePanel>
          ) : null}

          <label class="ops-search accounting-search">
            <SearchIcon size={16} />
            <input value={search.value} placeholder="Filtrar no contexto selecionado" onInput$={(event) => (search.value = (event.target as HTMLInputElement).value)} />
          </label>
          <AccountingRecords records={tab.value === 'summary' ? [] : records} />
        </section>
      )}
    </section>
  );
});

const AccountingMetric = component$((props: { icon: string; label: string; value: string | number; detail: string }) => (
  <article class="summary-card accounting-summary-card">
    <span>{iconFor(props.icon)}</span>
    <small>{props.label}</small>
    <strong>{props.value}</strong>
    <span>{props.detail}</span>
  </article>
));

const ContextPicker = component$((props: {
  mode: ContextMode;
  resources: ResourceState;
  selectedCondominium: string;
  selectedResident: string;
  selectedSupplier: string;
  onCondominium$: PropFunction<(value: string) => void>;
  onResident$: PropFunction<(value: string) => void>;
  onSupplier$: PropFunction<(value: string) => void>;
}) => (
  <div class="accounting-context-picker">
    {props.mode === 'condominium' || props.mode === 'bank' ? (
      <label><span>Condominio</span><select value={props.selectedCondominium} onChange$={(event) => props.onCondominium$((event.target as HTMLSelectElement).value)}>
        {props.resources.condominiums.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
      </select></label>
    ) : null}
    {props.mode === 'resident' ? (
      <label><span>Condomino / fracao</span><select value={props.selectedResident} onChange$={(event) => props.onResident$((event.target as HTMLSelectElement).value)}>
        {props.resources.residents.map((item) => <option key={item.id} value={item.id}>{`${item.name} - ${item.fraction}`}</option>)}
      </select></label>
    ) : null}
    {props.mode === 'supplier' ? (
      <label><span>Fornecedor</span><select value={props.selectedSupplier} onChange$={(event) => props.onSupplier$((event.target as HTMLSelectElement).value)}>
        {props.resources.suppliers.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
      </select></label>
    ) : null}
  </div>
));

const ContextSummary = component$((props: { data: FinancialContext }) => (
  <section class="summary-grid">
    <AccountingMetric icon="quota" label="Quotas" value={props.data.quotas.length} detail={`${props.data.quotas.filter((item) => item.status !== 'Paga').length} pendentes`} />
    <AccountingMetric icon="bank" label="Recebimentos" value={formatCurrency(sum(props.data.payments))} detail={`${props.data.cashMovements.length} movimentos em caixa`} />
    <AccountingMetric icon="debt" label="Dividas" value={formatCurrency(sum(props.data.debts))} detail={`${props.data.paymentAgreements.length} acordos`} />
    <AccountingMetric icon="reserve" label="Despesas" value={formatCurrency(sum(props.data.expenses))} detail={`${props.data.bankTransactions.filter((item) => item.reconciliationStatus !== 'reconciliado').length} por reconciliar`} />
  </section>
));

const AccountingCreatePanel = component$((props: { title: string }) => (
  <section class="accounting-create-panel">
    <strong>{props.title}</strong>
    <Slot />
  </section>
));

const AccountingHidden = component$((props: { name: string; value: string }) => (
  <input name={props.name} type="hidden" value={props.value} />
));

const AccountingRecords = component$((props: { records: AccountingRecord[] }) => (
  <div class="accounting-record-list">
    {props.records.length ? props.records.map((record) => (
      <article key={record.id}>
        <strong>{record.title}</strong>
        <span>{record.meta}</span>
        <small>{record.status}</small>
      </article>
    )) : (
      <article>
        <strong>Sem registos neste filtro</strong>
        <span>Escolhe outro separador ou contexto.</span>
      </article>
    )}
  </div>
));

type FinancialContext = {
  quotas: Quota[];
  payments: AccountingPayment[];
  debts: Debt[];
  receipts: Receipt[];
  expenses: Expense[];
  paymentAgreements: PaymentAgreement[];
  cashMovements: CashMovement[];
  bankTransactions: BankTransaction[];
};

type AccountingRecord = { id: string; title: string; meta: string; status: string };

function emptyFinancialContext(): FinancialContext {
  return { quotas: [], payments: [], debts: [], receipts: [], expenses: [], paymentAgreements: [], cashMovements: [], bankTransactions: [] };
}

function financialForCondominium(resources: ResourceState, condominium: string): FinancialContext {
  const byCondo = <T extends { condominium: string }>(items: T[]) => items.filter((item) => item.condominium === condominium);
  return {
    quotas: byCondo(resources.accounting.quotas),
    payments: byCondo(resources.accounting.payments),
    debts: byCondo(resources.accounting.debts),
    receipts: byCondo(resources.accounting.receipts),
    expenses: byCondo(resources.accounting.expenses),
    paymentAgreements: byCondo(resources.accounting.paymentAgreements),
    cashMovements: byCondo(resources.accounting.cashMovements),
    bankTransactions: byCondo(resources.accounting.bankTransactions)
  };
}

function financialForResident(resources: ResourceState, condominium: string, fraction: string, resident: string): FinancialContext {
  const data = financialForCondominium(resources, condominium);
  return {
    ...data,
    quotas: data.quotas.filter((item) => item.fraction === fraction || item.resident === resident),
    payments: data.payments.filter((item) => item.fraction === fraction || item.resident === resident),
    debts: data.debts.filter((item) => item.fraction === fraction || item.resident === resident),
    receipts: data.receipts.filter((item) => item.resident === resident),
    paymentAgreements: data.paymentAgreements.filter((item) => item.fraction === fraction || item.resident === resident)
  };
}

function financialForSupplier(resources: ResourceState, supplier: string): FinancialContext {
  return { ...emptyFinancialContext(), expenses: resources.accounting.expenses.filter((item) => item.supplier === supplier) };
}

function rowsForTab(tab: DetailTab, data: FinancialContext, query: string): AccountingRecord[] {
  const rows = tab === 'quotas' ? data.quotas.map((item) => ({ id: item.id, title: item.period, meta: `${item.fraction} - ${formatCurrency(item.amount)}`, status: item.status }))
    : tab === 'debts' ? data.debts.map((item) => ({ id: item.id, title: item.resident, meta: `${item.fraction} - ${formatCurrency(item.amount)} - ${item.daysOverdue} dias`, status: item.status }))
    : tab === 'payments' ? [...data.payments.map((item) => ({ id: item.id, title: item.resident, meta: `${item.method} - ${formatCurrency(item.amount)}`, status: item.status })), ...data.cashMovements.map((item) => ({ id: item.id, title: item.source, meta: `${item.method} - ${formatCurrency(item.amount)}`, status: item.status }))]
    : tab === 'expenses' ? data.expenses.map((item) => ({ id: item.id, title: item.category, meta: `${item.supplier} - ${formatCurrency(item.amount)}`, status: item.status }))
    : tab === 'bank' ? data.bankTransactions.map((item) => ({ id: item.id, title: item.description, meta: `${item.direction} - ${formatCurrency(item.amount)}`, status: item.reconciliationStatus }))
    : tab === 'receipts' ? data.receipts.map((item) => ({ id: item.id, title: item.number, meta: `${item.resident} - ${formatCurrency(item.amount)}`, status: item.status }))
    : tab === 'agreements' ? data.paymentAgreements.map((item) => ({ id: item.id, title: item.resident, meta: `${item.installmentCount} prestacoes - ${formatCurrency(item.totalAmount)}`, status: item.status }))
    : [];
  const needle = query.trim().toLowerCase();
  return needle ? rows.filter((row) => JSON.stringify(row).toLowerCase().includes(needle)) : rows;
}

function statementEntries(quotas: Quota[], payments: AccountingPayment[]) {
  let balance = 0;
  return [
    ...quotas.map((item) => ({ date: item.dueDate, label: item.period, debit: item.amount, credit: 0 })),
    ...payments.map((item) => ({ date: item.paidAt, label: item.method, debit: 0, credit: item.amount }))
  ].sort((a, b) => a.date.localeCompare(b.date)).map((item) => {
    balance += item.debit - item.credit;
    return { ...item, balance };
  });
}

function tabsForMode(mode: ContextMode): DetailTab[] {
  if (mode === 'supplier') return ['expenses', 'payments'];
  if (mode === 'bank') return ['bank', 'payments', 'expenses'];
  if (mode === 'resident') return ['summary', 'quotas', 'payments', 'debts', 'agreements', 'receipts'];
  return ['summary', 'quotas', 'debts', 'payments', 'expenses', 'bank', 'receipts'];
}

function contextLabel(mode: ContextMode): string {
  return ({ general: 'Geral', condominium: 'Condominio', resident: 'Condomino/Fracao', supplier: 'Fornecedor', bank: 'Banco/Caixa' })[mode];
}

function tabLabel(tab: DetailTab): string {
  return ({ summary: 'Resumo', quotas: 'Quotas', debts: 'Dividas', payments: 'Recebimentos', expenses: 'Despesas', bank: 'Banco', receipts: 'Recibos', agreements: 'Acordos' })[tab];
}

function iconFor(icon: string) {
  const size = 18;
  if (icon === 'bank') return <BanknoteIcon size={size} />;
  if (icon === 'receipt' || icon === 'agreement') return <MoreHorizontalIcon size={size} />;
  return <FileTextIcon size={size} />;
}

function sum(items: Array<{ amount: number }>): number {
  return items.reduce((total, item) => total + Number(item.amount || 0), 0);
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
}

function ageDetail(days?: number): string {
  return days === undefined ? 'Sem idade critica' : `${days} dias desde o mais antigo`;
}

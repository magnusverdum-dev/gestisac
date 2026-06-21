import { apiRequest } from './http';
import { loadInBatches } from './batch';
import { getResourcePage } from './pagination';
import type {
  AccountingPayment,
  AccountingOverview,
  AccountingState,
  AccountingSummary,
  BankReconciliation,
  BankTransaction,
  CashMovement,
  Debt,
  Expense,
  PaymentAgreement,
  Quota,
  Receipt,
  ReserveFund
} from './types';

const emptySummary: AccountingSummary = {
  currentBalance: 0,
  paidQuotaPercentage: 0,
  overdueAmount: 0,
  overdueCount: 0,
  monthlyExpenses: 0,
  reserveFund: 0,
  currency: 'EUR'
};

const emptyOverview: AccountingOverview = {
  quotasToValidate: 0,
  unreconciledMovements: 0,
  receiptsToIssue: 0,
  debtsInFollowUp: 0,
  overdueDebtSeverity: 'normal',
  activePaymentAgreements: 0,
  brokenPaymentAgreements: 0,
  reserveFundStatus: 'sem dados'
};
const INITIAL_ACCOUNTING_TIMEOUT_MS = 6_000;

async function loadOrFallback<T>(load: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await load();
  } catch {
    return fallback;
  }
}

export async function getAccounting(token: string): Promise<AccountingState> {
  return loadInBatches({
    summary: () =>
      loadOrFallback(
        () => apiRequest<AccountingSummary>('/api/accounting/summary', { token }),
        emptySummary
      ),
    overview: () =>
      loadOrFallback(
        () => apiRequest<AccountingOverview>('/api/accounting/overview', { token }),
        emptyOverview
      ),
    quotas: () => loadOrFallback(() => getResourcePage<Quota>(token, '/api/accounting/quotas', 1, 50, '', INITIAL_ACCOUNTING_TIMEOUT_MS), []),
    payments: () =>
      loadOrFallback(
        () => getResourcePage<AccountingPayment>(token, '/api/accounting/payments', 1, 50, '', INITIAL_ACCOUNTING_TIMEOUT_MS),
        []
      ),
    debts: () => loadOrFallback(() => getResourcePage<Debt>(token, '/api/accounting/debts', 1, 50, '', INITIAL_ACCOUNTING_TIMEOUT_MS), []),
    receipts: () => loadOrFallback(() => getResourcePage<Receipt>(token, '/api/accounting/receipts', 1, 50, '', INITIAL_ACCOUNTING_TIMEOUT_MS), []),
    expenses: () => loadOrFallback(() => getResourcePage<Expense>(token, '/api/accounting/expenses', 1, 50, '', INITIAL_ACCOUNTING_TIMEOUT_MS), []),
    reserveFunds: () =>
      loadOrFallback(
        () => getResourcePage<ReserveFund>(token, '/api/accounting/reserve-funds', 1, 50, '', INITIAL_ACCOUNTING_TIMEOUT_MS),
        []
      ),
    paymentAgreements: () =>
      loadOrFallback(
        () => getResourcePage<PaymentAgreement>(token, '/api/accounting/payment-agreements', 1, 50, '', INITIAL_ACCOUNTING_TIMEOUT_MS),
        []
      ),
    cashMovements: () =>
      loadOrFallback(
        () => getResourcePage<CashMovement>(token, '/api/accounting/cash-movements', 1, 50, '', INITIAL_ACCOUNTING_TIMEOUT_MS),
        []
      ),
    bankTransactions: () =>
      loadOrFallback(
        () => getResourcePage<BankTransaction>(token, '/api/accounting/bank-transactions', 1, 50, '', INITIAL_ACCOUNTING_TIMEOUT_MS),
        []
      ),
    bankReconciliations: () =>
      loadOrFallback(
        () => apiRequest<BankReconciliation[]>('/api/accounting/reconciliations', { token }),
        []
      )
  });
}

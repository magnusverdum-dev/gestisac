import { apiRequest } from './http';
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

async function loadOrFallback<T>(load: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await load();
  } catch {
    return fallback;
  }
}

export async function getAccounting(token: string): Promise<AccountingState> {
  const summary = await loadOrFallback(
    () => apiRequest<AccountingSummary>('/api/accounting/summary', { token }),
    emptySummary
  );
  const overview = await loadOrFallback(
    () => apiRequest<AccountingOverview>('/api/accounting/overview', { token }),
    emptyOverview
  );
  const quotas = await loadOrFallback(() => getResourcePage<Quota>(token, '/api/accounting/quotas'), []);
  const payments = await loadOrFallback(
    () => getResourcePage<AccountingPayment>(token, '/api/accounting/payments'),
    []
  );
  const debts = await loadOrFallback(() => getResourcePage<Debt>(token, '/api/accounting/debts'), []);
  const receipts = await loadOrFallback(() => getResourcePage<Receipt>(token, '/api/accounting/receipts'), []);
  const expenses = await loadOrFallback(() => getResourcePage<Expense>(token, '/api/accounting/expenses'), []);
  const reserveFunds = await loadOrFallback(
    () => getResourcePage<ReserveFund>(token, '/api/accounting/reserve-funds'),
    []
  );
  const paymentAgreements = await loadOrFallback(
    () => getResourcePage<PaymentAgreement>(token, '/api/accounting/payment-agreements'),
    []
  );
  const cashMovements = await loadOrFallback(
    () => getResourcePage<CashMovement>(token, '/api/accounting/cash-movements'),
    []
  );
  const bankTransactions = await loadOrFallback(
    () => getResourcePage<BankTransaction>(token, '/api/accounting/bank-transactions'),
    []
  );
  const bankReconciliations = await loadOrFallback(
    () => apiRequest<BankReconciliation[]>('/api/accounting/reconciliations', { token }),
    []
  );

  return {
    summary,
    overview,
    quotas,
    payments,
    debts,
    receipts,
    expenses,
    reserveFunds,
    paymentAgreements,
    cashMovements,
    bankTransactions,
    bankReconciliations
  };
}

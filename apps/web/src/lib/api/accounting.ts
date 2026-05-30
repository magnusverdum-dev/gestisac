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

export async function getAccounting(token: string): Promise<AccountingState> {
  const [
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
  ] = await Promise.all([
    apiRequest<AccountingSummary>('/api/accounting/summary', { token }),
    apiRequest<AccountingOverview>('/api/accounting/overview', { token }),
    getResourcePage<Quota>(token, '/api/accounting/quotas'),
    getResourcePage<AccountingPayment>(token, '/api/accounting/payments'),
    getResourcePage<Debt>(token, '/api/accounting/debts'),
    getResourcePage<Receipt>(token, '/api/accounting/receipts'),
    getResourcePage<Expense>(token, '/api/accounting/expenses'),
    getResourcePage<ReserveFund>(token, '/api/accounting/reserve-funds'),
    getResourcePage<PaymentAgreement>(token, '/api/accounting/payment-agreements'),
    getResourcePage<CashMovement>(token, '/api/accounting/cash-movements'),
    getResourcePage<BankTransaction>(token, '/api/accounting/bank-transactions'),
    apiRequest<BankReconciliation[]>('/api/accounting/reconciliations', { token }).catch(() => [])
  ]);

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

import { apiRequest } from './http';
import { getResourcePage } from './pagination';
import type {
  AccountingPayment,
  AccountingState,
  AccountingSummary,
  Debt,
  Expense,
  Quota,
  Receipt,
  ReserveFund
} from './types';

export async function getAccounting(token: string): Promise<AccountingState> {
  const [summary, quotas, payments, debts, receipts, expenses, reserveFunds] = await Promise.all([
    apiRequest<AccountingSummary>('/api/accounting/summary', { token }),
    getResourcePage<Quota>(token, '/api/accounting/quotas'),
    getResourcePage<AccountingPayment>(token, '/api/accounting/payments'),
    getResourcePage<Debt>(token, '/api/accounting/debts'),
    getResourcePage<Receipt>(token, '/api/accounting/receipts'),
    getResourcePage<Expense>(token, '/api/accounting/expenses'),
    getResourcePage<ReserveFund>(token, '/api/accounting/reserve-funds')
  ]);

  return {
    summary,
    quotas,
    payments,
    debts,
    receipts,
    expenses,
    reserveFunds
  };
}

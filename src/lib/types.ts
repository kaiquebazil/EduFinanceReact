// EduFinance — tipos TypeScript

export interface Category {
  name: string;
  icon: string;
  hidden?: boolean;
  suggestions?: string[];
}

export interface Categories {
  expense: Category[];
  income: Category[];
}

export interface Account {
  id: string;
  name: string;
  icon: string;
  initialBalance: number;
  kind: 'cash' | 'bank' | 'credit';
  limit?: number;
  brand?: string;
  closingDay?: number;
  dueDay?: number;
}

export interface Installment {
  current: number;
  total: number;
  purchaseDate: string;
  totalAmount: number;
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense' | 'transfer' | 'invoice_payment';
  amount: number;
  date: string;
  category: string;
  icon: string;
  note?: string;
  accountId?: string;
  fromAccountId?: string;
  toAccountId?: string;
  cardId?: string;
  groupId?: string;
  recurringId?: string;
  invoiceMonth?: string;
  installment?: Installment;
  borrowedTo?: string;
}

export interface RecurringTransaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  icon: string;
  accountId: string;
  amount: number;
  day: number;
  note?: string;
  startMonth: string;
  lastGenerated?: string;
  active: boolean;
}

export interface PinLock {
  enabled: boolean;
  salt: string;
  hash: string;
}

export type ThemeId = 'default' | 'orange' | 'blue' | 'green' | 'pink' | 'purple';
export type ColorMode = 'light' | 'dark' | 'system';
export type HomeBalanceMode = 'month' | 'remaining';

export interface AppState {
  version: number;
  theme: ThemeId;
  colorMode: ColorMode;
  fontScale: number;
  hideAmounts: boolean;
  hideHomeCards: boolean;
  homeBalanceMode: HomeBalanceMode;
  soundEnabled: boolean;
  pinLock: PinLock | null;
  selectedMonth: string;
  budget: number;
  categoryBudgets: Record<string, number>;
  incomeCategoryBudgets: Record<string, number>;
  categories: Categories;
  accounts: Account[];
  transactions: Transaction[];
  recurring: RecurringTransaction[];
}

export interface ThemeOption {
  id: ThemeId;
  label: string;
}

export interface InstallmentPurchase {
  category: string;
  icon: string;
  note: string;
  borrowedTo: string;
  accountId: string;
  purchaseDate: string;
  totalAmount: number;
  total: number;
  paid: number;
  paidAmount: number;
  remaining: number;
  remainingAmount: number;
}

export interface InvoiceReminder {
  card: Account;
  month: string;
  dueDate: string;
  remaining: number;
}

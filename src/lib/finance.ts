// EduFinance — lógica financeira portada fielmente de core.js
import type {
  AppState, Account, Transaction, RecurringTransaction,
  Category, Categories, ThemeId, ThemeOption,
  InstallmentPurchase, InvoiceReminder,
} from './types';

export const STORAGE_KEY = 'meu-controle-v1';

export const themeOptions: ThemeOption[] = [
  { id: 'default', label: 'Padrão' },
  { id: 'orange', label: 'Laranja' },
  { id: 'blue', label: 'Ciano' },
  { id: 'green', label: 'Verde' },
  { id: 'pink', label: 'Rosa' },
  { id: 'purple', label: 'Roxo' },
];

export const fontScaleOptions = [0.88, 1, 1.12, 1.25];
export const fontScaleLabels = ['Pequeno', 'Padrão', 'Grande', 'Muito grande'];

// --- Date helpers ---
export const today = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export const currentMonth = (): string => today().slice(0, 7);

export const makeId = (): string =>
  typeof crypto !== 'undefined' && crypto?.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const monthOf = (date: string): string => date?.slice(0, 7) ?? '';

export const addMonths = (month: string, delta: number): string => {
  const d = new Date(`${month}-01T12:00:00`);
  d.setMonth(d.getMonth() + delta);
  return d.toISOString().slice(0, 7);
};

export const lastDayOfMonth = (month: string): number => {
  const d = new Date(`${month}-01T12:00:00`);
  d.setMonth(d.getMonth() + 1, 0);
  return d.getDate();
};

export const invoiceDueDate = (account: Account, month: string): string =>
  `${month}-${String(Math.min(Number(account?.dueDay || 5), lastDayOfMonth(month))).padStart(2, '0')}`;

export const startOfWeek = (): string => {
  const d = new Date();
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  return d.toISOString().slice(0, 10);
};

// --- Parse de moeda robusto ---
export function parseMoney(raw: string | number | null | undefined): number {
  let s = String(raw ?? '').trim().replace(/[^\d.,]/g, '');
  if (!s) return 0;
  const lc = s.lastIndexOf(',');
  const ld = s.lastIndexOf('.');
  if (lc > -1 && ld > -1) {
    s = lc > ld
      ? s.replace(/\./g, '').replace(',', '.')
      : s.replace(/,/g, '');
  } else if (lc > -1) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (ld > -1) {
    const p = s.split('.');
    if (p.length > 2 || (p[1] && p[1].length === 3)) s = s.replace(/\./g, '');
  }
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

// --- ATM mask ---
export function atmMask(digits: string): string {
  const d = digits.replace(/\D/g, '');
  if (!d) return '';
  return (Number(d) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// --- Formatting ---
export const money = (n: number | null | undefined): string =>
  Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const monthLabel = (m: string): string => {
  try {
    return new Date(`${m}-01T12:00:00`)
      .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      .replace(/^./, (x) => x.toUpperCase());
  } catch {
    return m ?? '';
  }
};

export const dateText = (d: string): string => {
  try {
    return new Date(`${d}T12:00:00`)
      .toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
      .replace('.', '');
  } catch {
    return d ?? '';
  }
};

export const dateFull = (d: string): string => {
  try {
    return new Date(`${d}T12:00:00`)
      .toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return d ?? '';
  }
};

export const dateForSelectedMonth = (state: AppState): string =>
  today().startsWith(state?.selectedMonth ?? '') ? today() : `${state?.selectedMonth ?? currentMonth()}-01`;

export const isCredit = (acc: Account | null | undefined): boolean => acc?.kind === 'credit';

export const accountName = (state: AppState, id: string | undefined): string =>
  state?.accounts?.find((a) => a.id === id)?.name || 'Conta';

export const selectableCategories = (
  state: AppState,
  type: 'expense' | 'income',
  currentName: string = ''
): Category[] =>
  (state?.categories?.[type] ?? []).filter((c) => !c.hidden || c.name === currentName);

export const budgetHeatClass = (percent: number): string =>
  percent >= 100 ? 'heat-4'
    : percent >= 85 ? 'heat-3'
      : percent >= 70 ? 'heat-2'
        : percent >= 50 ? 'heat-1' : 'heat-0';

// --- Cálculos financeiros ---
export function accountBalance(state: AppState, account: Account): number {
  if (isCredit(account)) return 0;
  return (state?.transactions ?? []).reduce((balance, t) => {
    const a = Number(t?.amount || 0);
    if (t?.type === 'income' && t?.accountId === account?.id) return balance + a;
    if (t?.type === 'expense' && t?.accountId === account?.id) return balance - a;
    if (t?.type === 'transfer' && t?.fromAccountId === account?.id) return balance - a;
    if (t?.type === 'transfer' && t?.toAccountId === account?.id) return balance + a;
    if (t?.type === 'invoice_payment' && t?.fromAccountId === account?.id) return balance - a;
    return balance;
  }, Number(account?.initialBalance || 0));
}

export function creditUsed(state: AppState, account: Account): number {
  const expenses = (state?.transactions ?? [])
    .filter((t) => t?.type === 'expense' && t?.accountId === account?.id)
    .reduce((s, t) => s + Number(t?.amount || 0), 0);
  const paid = (state?.transactions ?? [])
    .filter((t) => t?.type === 'invoice_payment' && t?.cardId === account?.id)
    .reduce((s, t) => s + Number(t?.amount || 0), 0);
  return Math.max(expenses - paid, 0);
}

export function creditInvoice(state: AppState, account: Account, month: string): Transaction[] {
  return (state?.transactions ?? []).filter((t) => {
    if (t?.type !== 'expense' || t?.accountId !== account?.id) return false;
    if (t?.invoiceMonth) return t.invoiceMonth === month;
    return monthOf(t?.date ?? '') === month;
  });
}

export function creditInvoiceTotal(state: AppState, account: Account, month: string): number {
  return creditInvoice(state, account, month).reduce((s, t) => s + Number(t?.amount || 0), 0);
}

export function invoicePaidTotal(state: AppState, account: Account, month: string): number {
  return (state?.transactions ?? [])
    .filter((t) => t?.type === 'invoice_payment' && t?.cardId === account?.id && t?.invoiceMonth === month)
    .reduce((s, t) => s + Number(t?.amount || 0), 0);
}

export function invoiceRemaining(state: AppState, account: Account, month: string): number {
  const total = creditInvoiceTotal(state, account, month);
  const paid = invoicePaidTotal(state, account, month);
  return Math.max(Math.round((total - paid) * 100) / 100, 0);
}

export function invoiceMonthFor(account: Account, date: string): string {
  const m = monthOf(date);
  const day = Number(date?.slice(8, 10) ?? 0);
  return day <= (account?.closingDay || 25) ? m : addMonths(m, 1);
}

export function buildInstallments(params: {
  account: Account;
  category: string;
  icon: string;
  note: string;
  total: number;
  date: string;
  installments: number;
  firstDueDate?: string;
  borrowedTo?: string;
}): Transaction[] {
  const { account, category, icon, note, total, date, installments, firstDueDate, borrowedTo } = params;
  const entries: Transaction[] = [];
  const totalCents = Math.round(total * 100);
  const baseCents = Math.floor(totalCents / installments);
  let restCents = totalCents - baseCents * installments;
  const firstInvoice = firstDueDate ? monthOf(firstDueDate) : invoiceMonthFor(account, date);
  const firstDueDay = Number((firstDueDate || '').slice(8, 10)) || Number(account?.dueDay || 5);
  const groupId = `g-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;

  for (let i = 1; i <= installments; i++) {
    const cents = i === installments ? baseCents + restCents : baseCents;
    restCents = 0;
    const amount = cents / 100;
    const invMonth = addMonths(firstInvoice, i - 1);
    const dueDay = Math.min(firstDueDay, lastDayOfMonth(invMonth));
    const dueDate = `${invMonth}-${String(dueDay).padStart(2, '0')}`;

    entries.push({
      id: makeId(),
      type: 'expense',
      category,
      icon,
      accountId: account?.id,
      amount,
      date: dueDate,
      note: note ? `${note} (${i}/${installments})` : `Parcela ${i}/${installments}`,
      installment: { current: i, total: installments, purchaseDate: date, totalAmount: total },
      invoiceMonth: invMonth,
      borrowedTo: borrowedTo || '',
      groupId,
    });
  }
  return entries;
}

// --- Recorrentes ---
export function applyRecurring(state: AppState): { state: AppState; generated: number } {
  const newState = { ...state, recurring: [...(state?.recurring ?? [])], transactions: [...(state?.transactions ?? [])] };
  let generated = 0;
  newState.recurring.forEach((r, idx) => {
    if (!r?.active) return;
    let m = r.lastGenerated ? addMonths(r.lastGenerated, 1) : r.startMonth;
    const cm = currentMonth();
    while (m <= cm) {
      const day = String(Math.min(r.day, lastDayOfMonth(m))).padStart(2, '0');
      const alreadyGenerated = newState.transactions.some(
        (t) => t?.recurringId === r.id && monthOf(t?.date ?? '') === m
      );
      if (!alreadyGenerated) {
        newState.transactions.push({
          id: makeId(),
          type: r.type,
          category: r.category,
          icon: r.icon,
          accountId: r.accountId,
          amount: r.amount,
          date: `${m}-${day}`,
          note: r.note ?? '',
          recurringId: r.id,
        });
        generated++;
      }
      newState.recurring[idx] = { ...newState.recurring[idx], lastGenerated: m };
      m = addMonths(m, 1);
    }
  });
  if (generated && newState.selectedMonth < currentMonth()) {
    newState.selectedMonth = currentMonth();
  }
  return { state: newState, generated };
}

// --- Categorias padrão ---
export const defaultCategories: Categories = {
  expense: [
    { name: 'Alimentação', icon: '🍽️' },
    { name: 'Animais de Estimação', icon: '🐾' },
    { name: 'Acessórios', icon: '👜' },
    { name: 'Cuidados Pessoais', icon: '💇' },
    { name: 'Datas Comemorativas', icon: '🎉' },
    { name: 'Doações', icon: '🤲' },
    { name: 'Empréstimos', icon: '🤝' },
    { name: 'Moradia', icon: '🏠' },
    { name: 'Educação', icon: '🎓' },
    { name: 'Estacionamentos/Pedágios', icon: '🅿️' },
    { name: 'Filhos', icon: '👨‍👩‍👧' },
    { name: 'Lanches', icon: '🍔' },
    { name: 'Lazer', icon: '🎉' },
    { name: 'Presentes', icon: '🎁' },
    { name: 'Roupas', icon: '👕' },
    { name: 'Saúde', icon: '🩺' },
    { name: 'Assinaturas', icon: '🔄' },
    { name: 'Taxas', icon: '💸' },
    { name: 'Trabalho', icon: '💼' },
    { name: 'Transporte', icon: '🚕' },
    { name: 'Viagens', icon: '✈️' },
  ].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })),
  income: [
    { name: 'Outros', icon: '💰' },
    { name: 'Salário', icon: '💼' },
  ].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })),
};

export const categoryDescriptions: Record<string, string> = {
  'Acessórios': 'Bolsas, cintos, óculos, joias, películas e capas para celular.',
  'Alimentação': 'Açougues, mercados, padarias e sacolões.',
  'Animais de Estimação': 'Rações, consultas veterinárias, banhos e tosas, brinquedos e produtos para pets.',
  'Assinaturas': 'Serviços de streaming, aplicativos, jornais, clubes e planos de celular.',
  'Cuidados Pessoais': 'Cabeleireiros, salões, cosméticos, produtos de higiene, maquiagens, manicures.',
  'Datas Comemorativas': 'Festas, decorações, comemorações, vaquinhas e feriados.',
  'Doações': 'Contribuições, doações para instituições, causas sociais e cestas básicas.',
  'Educação': 'Mensalidades, cursos, livros, materiais escolares, consultorias, treinamentos.',
  'Empréstimos': 'Parcelas, empréstimos e financiamentos.',
  'Estacionamentos/Pedágios': 'Estacionamentos, tarifas de zona azul e pedágios.',
  'Filhos': 'Mesadas, atividades, cuidados e itens infantis.',
  'Lanches': 'Cafés, salgados e doces.',
  'Lazer': 'Passeios, parques, atividades recreativas, sessões de cinema, clubes.',
  'Moradia': 'Aluguéis, IPTU, contas de energia, gás, internet, água, condomínios.',
  'Outros': 'Outras receitas.',
  'Presentes': 'Presentes e lembranças.',
  'Roupas': 'Roupas, calçados, ajustes, serviços de lavanderia e costureiras.',
  'Salário': 'Salários, pagamentos e remunerações.',
  'Saúde': 'Consultas, exames, medicamentos, tratamentos, planos de saúde, academias.',
  'Taxas': 'Tarifas bancárias, taxas administrativas, multas, anuidades e juros.',
  'Trabalho': 'Ferramentas, materiais, despesas profissionais e taxas.',
  'Transporte': 'Passagens, corridas de app, combustíveis, IPVA, seguros, manutenções.',
  'Viagens': 'Passagens, hospedagens e refeições.',
};

// --- Seed state ---
export const seedState: AppState = {
  version: 7,
  theme: 'default',
  colorMode: 'light',
  fontScale: 1,
  hideAmounts: false,
  hideHomeCards: false,
  homeBalanceMode: 'month',
  soundEnabled: true,
  pinLock: null,
  selectedMonth: currentMonth(),
  budget: 0,
  categoryBudgets: {},
  incomeCategoryBudgets: {},
  categories: defaultCategories,
  accounts: [
    { id: 'bank', name: 'Conta principal', icon: '🏦', initialBalance: 0, kind: 'bank' },
  ],
  transactions: [],
  recurring: [],
};

// --- Sanitização ---
export function sanitizeState(s: any): AppState {
  const str = (v: any, max = 60) => String(v ?? '').slice(0, max);
  const id = (v: any) => str(v, 64).replace(/[^\w-]/g, '');
  const num = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const dateOk = (d: any) => /^\d{4}-\d{2}-\d{2}$/.test(d || '');
  const cat = (c: any): Category => ({
    name: str(c?.name, 40),
    icon: str(c?.icon, 8),
    hidden: Boolean(c?.hidden),
    suggestions: Array.isArray(c?.suggestions) ? c.suggestions.map((item: any) => str(item, 80)).filter(Boolean).slice(0, 30) : [],
  });

  s.selectedMonth = /^\d{4}-\d{2}$/.test(s?.selectedMonth) ? s.selectedMonth : currentMonth();
  if (s.theme === 'dark') { s.colorMode = 'dark'; s.theme = 'default'; }
  if (s.theme === 'system') { s.colorMode = 'system'; s.theme = 'default'; }
  s.theme = themeOptions.some((t) => t.id === s.theme) ? s.theme : 'default';
  s.colorMode = ['light', 'dark', 'system'].includes(s?.colorMode) ? s.colorMode : 'light';
  s.hideAmounts = Boolean(s?.hideAmounts);
  s.hideHomeCards = Boolean(s?.hideHomeCards);
  s.homeBalanceMode = ['month', 'remaining'].includes(s?.homeBalanceMode) ? s.homeBalanceMode : 'month';
  s.soundEnabled = s?.soundEnabled !== false;
  s.pinLock = s?.pinLock?.enabled && /^[a-f0-9]{32}$/.test(s?.pinLock?.salt || '') && /^[a-f0-9]{64}$/.test(s?.pinLock?.hash || '')
    ? { enabled: true, salt: s.pinLock.salt, hash: s.pinLock.hash }
    : null;
  const fontScale = Number(s?.fontScale ?? 1);
  s.fontScale = Number.isFinite(fontScale) ? Math.max(0, Math.min(fontScaleOptions.length - 1, Math.round(fontScale))) : 1;
  s.budget = num(s?.budget);
  s.categoryBudgets = Object.fromEntries(
    Object.entries(s?.categoryBudgets || {}).map(([k, v]) => [str(k, 40), num(v)])
  );
  s.incomeCategoryBudgets = Object.fromEntries(
    Object.entries(s?.incomeCategoryBudgets || {}).map(([k, v]) => [str(k, 40), num(v)])
  );
  s.categories = {
    expense: (s?.categories?.expense || []).map(cat),
    income: (s?.categories?.income || []).map(cat),
  };
  s.accounts = (s?.accounts || []).map((a: any) => ({
    ...a,
    id: id(a?.id),
    name: str(a?.name, 40),
    icon: str(a?.icon, 8),
    initialBalance: num(a?.initialBalance),
    kind: ['cash', 'bank', 'credit'].includes(a?.kind) ? a.kind : 'bank',
    ...(a?.kind === 'credit'
      ? {
          limit: num(a?.limit),
          brand: ['Mastercard', 'Visa', 'Amex', 'Diners', 'Elo', 'Hipercard', 'Outros'].includes(a?.brand) ? a.brand : 'Outros',
          closingDay: num(a?.closingDay) || 25,
          dueDay: num(a?.dueDay) || 5,
        }
      : {}),
  }));
  s.transactions = (s?.transactions || [])
    .filter((t: any) => dateOk(t?.date))
    .map((t: any) => {
      const o = {
        ...t,
        id: id(t?.id),
        amount: num(t?.amount),
        category: str(t?.category, 40),
        icon: str(t?.icon, 8),
        note: str(t?.note, 200),
      };
      if (o.borrowedTo != null) o.borrowedTo = str(o.borrowedTo, 80);
      ['accountId', 'fromAccountId', 'toAccountId', 'cardId', 'groupId', 'recurringId'].forEach((k) => {
        if (o[k] != null) o[k] = id(o[k]);
      });
      if (o.invoiceMonth && !/^\d{4}-\d{2}$/.test(o.invoiceMonth)) delete o.invoiceMonth;
      return o;
    });
  s.recurring = (s?.recurring || []).map((r: any) => ({
    ...r,
    id: id(r?.id),
    accountId: id(r?.accountId),
    amount: num(r?.amount),
    category: str(r?.category, 40),
    icon: str(r?.icon, 8),
    note: str(r?.note, 200),
    day: Math.min(Math.max(num(r?.day) || 1, 1), 31),
  }));
  return s as AppState;
}

// --- Migração ---
export function migrate(old: any): AppState {
  if (!old) return JSON.parse(JSON.stringify(seedState));
  const savedBudgets = { ...(old?.categoryBudgets || {}) };
  const presetBudgets: Record<string, number> = { Alimentação: 400, Casa: 1000, Saúde: 200, Transporte: 300 };
  Object.entries(presetBudgets).forEach(([name, amount]) => {
    if (Number(savedBudgets[name]) === amount) delete savedBudgets[name];
  });
  const savedCategories = old?.categories || {};
  const foodSubcategories = new Set(['açougue', 'mercado', 'padaria', 'sacolão']);
  const mergedCategories: Categories = {
    expense: [],
    income: [],
  };
  (['expense', 'income'] as const).forEach((type) => {
    const saved = (Array.isArray(savedCategories[type]) ? savedCategories[type] : [])
      .filter((category: any) => !(type === 'expense' && foodSubcategories.has(String(category?.name || '').trim().toLocaleLowerCase('pt-BR'))));
    const names = new Set(saved.map((c: any) => String(c?.name || '').trim().toLocaleLowerCase()));
    mergedCategories[type] = [
      ...saved,
      ...defaultCategories[type].filter((c) => !names.has(c.name.toLocaleLowerCase())),
    ].sort((a: any, b: any) => String(a?.name || '').localeCompare(String(b?.name || ''), 'pt-BR', { sensitivity: 'base' }));
  });
  const base = {
    ...seedState,
    ...old,
    version: 7,
    selectedMonth: old?.selectedMonth || currentMonth(),
    budget: 0,
    categoryBudgets: old?.version < 7 && !Object.values(savedBudgets).some((amount: any) => Number(amount) > 0)
      ? seedState.categoryBudgets
      : (old?.categoryBudgets == null ? seedState.categoryBudgets : savedBudgets),
    accounts: old?.accounts?.length ? old.accounts : seedState.accounts,
    categories: mergedCategories,
    recurring: Array.isArray(old?.recurring) ? old.recurring : [],
  };
  const sampleTransactionIds = new Set(['income-seed', 'market-seed', 'ride-seed']);
  base.transactions = (old?.transactions || []).filter((t: any) => !sampleTransactionIds.has(String(t?.id))).map((t: any) => ({
    ...t,
    id: String(t?.id || makeId()),
    accountId: t?.accountId || 'bank',
  }));
  const validGoalNames = new Set(base.categories.expense.map((c: any) => c.name));
  const goals = Object.entries(base.categoryBudgets)
    .filter(([name, amount]: [string, any]) => validGoalNames.has(name) && Number(amount) >= 0)
    .map(([name, amount]: [string, any]) => {
      const spent = base.transactions.reduce((sum: number, tx: any) =>
        tx?.type === 'expense' && tx?.category === name && tx?.date?.startsWith(base.selectedMonth)
          ? sum + Number(tx?.amount || 0) : sum, 0);
      return { name, amount: Number(amount), progress: spent / Number(amount) };
    })
    .sort((a, b) => b.progress - a.progress);
  base.categoryBudgets = Object.fromEntries(goals.map((g) => [g.name, g.amount]));
  const validIncomeGoalNames = new Set(base.categories.income.map((c: any) => c.name));
  base.incomeCategoryBudgets = Object.fromEntries(
    Object.entries(base.incomeCategoryBudgets || {})
      .filter(([name, amount]: [string, any]) => validIncomeGoalNames.has(name) && Number(amount) >= 0)
      .map(([name, amount]: [string, any]) => [name, Number(amount)])
  );
  return sanitizeState(base);
}

// --- Totais do mês ---
export function inMonth(state: AppState): Transaction[] {
  return (state?.transactions ?? []).filter((t) => t?.date?.startsWith(state?.selectedMonth ?? ''));
}

export function totals(list: Transaction[]): { income: number; expense: number } {
  return (list ?? []).reduce(
    (a, t) => {
      if (t?.type === 'income') a.income += Number(t?.amount ?? 0);
      if (t?.type === 'expense') a.expense += Number(t?.amount ?? 0);
      return a;
    },
    { income: 0, expense: 0 }
  );
}

// --- Invoice reminders ---
export function invoiceReminders(state: AppState): InvoiceReminder[] {
  const td = today();
  const tomorrow = new Date(`${td}T12:00:00`);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDate = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
  return (state?.accounts ?? []).filter(isCredit).flatMap((card) => {
    const months = [...new Set((state?.transactions ?? [])
      .filter((tx) => tx?.type === 'expense' && tx?.accountId === card?.id)
      .map((tx) => tx?.invoiceMonth || monthOf(tx?.date ?? '')))];
    return months.map((month) => ({
      card,
      month,
      dueDate: invoiceDueDate(card, month),
      remaining: invoiceRemaining(state, card, month),
    }));
  }).filter((inv) => inv.remaining > 0 && inv.dueDate <= tomorrowDate)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

// --- Installment purchases ---
export function getInstallmentPurchases(state: AppState): InstallmentPurchase[] {
  const purchasesMap: Record<string, InstallmentPurchase> = {};
  const cm = currentMonth();
  (state?.transactions ?? [])
    .filter((t) => t?.installment)
    .forEach((t) => {
      const key = t?.groupId || `${t?.installment?.purchaseDate}|${t?.installment?.totalAmount}|${t?.category}|${t?.accountId}`;
      if (!purchasesMap[key]) {
        purchasesMap[key] = {
          category: t?.category ?? '',
          icon: t?.icon ?? '',
          note: (t?.note || '').replace(/\s\(\d+\/\d+\)$/, ''),
          borrowedTo: t?.borrowedTo || '',
          accountId: t?.accountId ?? '',
          purchaseDate: t?.installment?.purchaseDate ?? '',
          totalAmount: t?.installment?.totalAmount ?? 0,
          total: t?.installment?.total ?? 0,
          paid: 0,
          paidAmount: 0,
          remaining: 0,
          remainingAmount: 0,
        };
      }
      const p = purchasesMap[key];
      const month = t?.invoiceMonth || monthOf(t?.date ?? '');
      if (month <= cm) {
        p.paid++;
        p.paidAmount += Number(t?.amount || 0);
      } else {
        p.remaining++;
        p.remainingAmount += Number(t?.amount || 0);
      }
    });
  return Object.values(purchasesMap).sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate));
}

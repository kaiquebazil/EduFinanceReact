import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef, useState } from 'react';
import { AppState as RNAppState, useColorScheme } from 'react-native';
import type { AppState, Transaction, RecurringTransaction, Account, Category, ThemeId, ColorMode, HomeBalanceMode } from '../lib/types';
import { seedState, makeId, currentMonth, applyRecurring, sanitizeState, migrate } from '../lib/finance';
import { loadState, saveState } from '../lib/storage';
import { getTheme, type AppTheme } from '../theme';

type Action =
  | { type: 'SET_STATE'; payload: AppState }
  | { type: 'SET_MONTH'; payload: string }
  | { type: 'TOGGLE_HIDE_AMOUNTS' }
  | { type: 'SET_THEME'; payload: ThemeId }
  | { type: 'SET_COLOR_MODE'; payload: ColorMode }
  | { type: 'SET_FONT_SCALE'; payload: number }
  | { type: 'SET_HOME_BALANCE_MODE'; payload: HomeBalanceMode }
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'ADD_TRANSACTIONS'; payload: Transaction[] }
  | { type: 'UPDATE_TRANSACTION'; payload: Transaction }
  | { type: 'DELETE_TRANSACTIONS'; payload: string[] }
  | { type: 'ADD_RECURRING'; payload: RecurringTransaction }
  | { type: 'REMOVE_RECURRING'; payload: string }
  | { type: 'ADD_ACCOUNT'; payload: Account }
  | { type: 'UPDATE_ACCOUNT'; payload: Account }
  | { type: 'DELETE_ACCOUNT'; payload: string }
  | { type: 'SET_CATEGORIES'; payload: { expense: Category[]; income: Category[] } }
  | { type: 'SET_CATEGORY_BUDGET'; payload: { name: string; amount: number; budgetType: 'expense' | 'income' } }
  | { type: 'REMOVE_CATEGORY_BUDGET'; payload: { name: string; budgetType: 'expense' | 'income' } }
  | { type: 'SET_PIN'; payload: { salt: string; hash: string } | null }
  | { type: 'CLEAR_ALL' }
  | { type: 'IMPORT_STATE'; payload: AppState };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_STATE':
      return action.payload;
    case 'SET_MONTH':
      return { ...state, selectedMonth: action.payload };
    case 'TOGGLE_HIDE_AMOUNTS':
      return { ...state, hideAmounts: !state.hideAmounts };
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'SET_COLOR_MODE':
      return { ...state, colorMode: action.payload };
    case 'SET_FONT_SCALE':
      return { ...state, fontScale: action.payload };
    case 'SET_HOME_BALANCE_MODE':
      return { ...state, homeBalanceMode: action.payload };
    case 'ADD_TRANSACTION':
      return { ...state, transactions: [...state.transactions, action.payload] };
    case 'ADD_TRANSACTIONS':
      return { ...state, transactions: [...state.transactions, ...action.payload] };
    case 'UPDATE_TRANSACTION':
      return {
        ...state,
        transactions: state.transactions.map((t) =>
          t.id === action.payload.id ? action.payload : t
        ),
      };
    case 'DELETE_TRANSACTIONS':
      return {
        ...state,
        transactions: state.transactions.filter((t) => !action.payload.includes(t.id)),
      };
    case 'ADD_RECURRING':
      return { ...state, recurring: [...state.recurring, action.payload] };
    case 'REMOVE_RECURRING':
      return { ...state, recurring: state.recurring.filter((r) => r.id !== action.payload) };
    case 'ADD_ACCOUNT':
      return { ...state, accounts: [...state.accounts, action.payload] };
    case 'UPDATE_ACCOUNT':
      return {
        ...state,
        accounts: state.accounts.map((a) =>
          a.id === action.payload.id ? action.payload : a
        ),
      };
    case 'DELETE_ACCOUNT':
      return { ...state, accounts: state.accounts.filter((a) => a.id !== action.payload) };
    case 'SET_CATEGORIES':
      return { ...state, categories: action.payload };
    case 'SET_CATEGORY_BUDGET': {
      const { name, amount, budgetType } = action.payload;
      const key = budgetType === 'income' ? 'incomeCategoryBudgets' : 'categoryBudgets';
      return { ...state, [key]: { ...state[key], [name]: amount } };
    }
    case 'REMOVE_CATEGORY_BUDGET': {
      const { name, budgetType } = action.payload;
      const key = budgetType === 'income' ? 'incomeCategoryBudgets' : 'categoryBudgets';
      const newBudgets = { ...state[key] };
      delete newBudgets[name];
      return { ...state, [key]: newBudgets };
    }
    case 'SET_PIN':
      return {
        ...state,
        pinLock: action.payload
          ? { enabled: true, salt: action.payload.salt, hash: action.payload.hash }
          : null,
      };
    case 'CLEAR_ALL': {
      const fresh = JSON.parse(JSON.stringify(seedState));
      fresh.transactions = [];
      fresh.selectedMonth = currentMonth();
      return fresh;
    }
    case 'IMPORT_STATE':
      return action.payload;
    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  theme: AppTheme;
  isLoading: boolean;
  isLocked: boolean;
  setLocked: (v: boolean) => void;
  showToast: (msg: string, undoAction?: (() => void) | null) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, seedState);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocked, setLocked] = useState(false);
  const [toast, setToast] = useState<{ msg: string; undo?: (() => void) | null } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const systemScheme = useColorScheme();
  const prevStateRef = useRef<string>('');

  // Load state on mount
  useEffect(() => {
    (async () => {
      try {
        const loaded = await loadState();
        const { state: withRecurring } = applyRecurring(loaded);
        dispatch({ type: 'SET_STATE', payload: withRecurring });
        if (withRecurring?.pinLock?.enabled) setLocked(true);
      } catch {
        dispatch({ type: 'SET_STATE', payload: seedState });
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Persist on state changes
  useEffect(() => {
    if (isLoading) return;
    const serialized = JSON.stringify(state);
    if (serialized !== prevStateRef.current) {
      prevStateRef.current = serialized;
      saveState(state);
    }
  }, [state, isLoading]);

  // Lock on app background
  useEffect(() => {
    const sub = RNAppState.addEventListener('change', (next) => {
      if (next === 'background' && state?.pinLock?.enabled) {
        setLocked(true);
      }
    });
    return () => sub?.remove?.();
  }, [state?.pinLock?.enabled]);

  const theme = getTheme(
    state?.theme ?? 'default',
    state?.colorMode ?? 'light',
    systemScheme
  );

  const showToast = useCallback((msg: string, undoAction?: (() => void) | null) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ msg, undo: undoAction });
    toastTimerRef.current = setTimeout(() => setToast(null), 5000);
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch, theme, isLoading, isLocked, setLocked, showToast }}>
      {children}
      {toast ? (
        <ToastView msg={toast.msg} undo={toast.undo} onDismiss={() => setToast(null)} />
      ) : null}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}

// Toast component
import { View, Text, Pressable, StyleSheet, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function ToastView({ msg, undo, onDismiss }: { msg: string; undo?: (() => void) | null; onDismiss: () => void }) {
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View
      style={[
        toastStyles.container,
        { bottom: 90 + (insets?.bottom ?? 0), opacity },
      ]}
    >
      <Text style={toastStyles.text}>{msg}</Text>
      {undo ? (
        <Pressable
          onPress={() => {
            undo();
            onDismiss();
          }}
        >
          <Text style={toastStyles.undoText}>Desfazer</Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const toastStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignSelf: 'center',
    maxWidth: 480,
    backgroundColor: '#0f172a',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 999,
    ...(Platform.OS === 'web' ? { position: 'fixed' as any } : {}),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  text: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  undoText: {
    color: '#93c5fd',
    fontSize: 13,
    fontWeight: '700',
  },
});

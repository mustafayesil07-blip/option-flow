import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
} from 'react';
import * as Notifications from 'expo-notifications';
import { format } from 'date-fns';
import { Transaction, Budget, Goal } from '../types';
import {
  loadTransactions, saveTransactions,
  loadBudgets, saveBudgets,
  loadGoals, saveGoals,
} from '../utils/storage';
import { getCategoryById } from '../constants/categories';
import { formatCurrency } from '../utils/currency';

// ─── State & Actions ────────────────────────────────────────────────────────

interface State {
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  isLoading: boolean;
}

type Action =
  | { type: 'HYDRATE'; payload: Pick<State, 'transactions' | 'budgets' | 'goals'> }
  | { type: 'ADD_TX';    payload: Transaction }
  | { type: 'UPDATE_TX'; payload: Transaction }
  | { type: 'DEL_TX';    payload: string }
  | { type: 'SET_BUDGET'; payload: Budget }
  | { type: 'DEL_BUDGET'; payload: { categoryId: string; month: string } }
  | { type: 'ADD_GOAL';    payload: Goal }
  | { type: 'UPDATE_GOAL'; payload: Goal }
  | { type: 'DEL_GOAL';    payload: string }
  | { type: 'CONTRIBUTE';  payload: { id: string; amount: number } };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, ...action.payload, isLoading: false };

    case 'ADD_TX':
      return { ...state, transactions: [action.payload, ...state.transactions] };

    case 'UPDATE_TX':
      return {
        ...state,
        transactions: state.transactions.map(t =>
          t.id === action.payload.id ? action.payload : t,
        ),
      };

    case 'DEL_TX':
      return { ...state, transactions: state.transactions.filter(t => t.id !== action.payload) };

    case 'SET_BUDGET': {
      const idx = state.budgets.findIndex(
        b => b.categoryId === action.payload.categoryId && b.month === action.payload.month,
      );
      const budgets = idx >= 0
        ? state.budgets.map((b, i) => (i === idx ? action.payload : b))
        : [...state.budgets, action.payload];
      return { ...state, budgets };
    }

    case 'DEL_BUDGET':
      return {
        ...state,
        budgets: state.budgets.filter(
          b => !(b.categoryId === action.payload.categoryId && b.month === action.payload.month),
        ),
      };

    case 'ADD_GOAL':
      return { ...state, goals: [...state.goals, action.payload] };

    case 'UPDATE_GOAL':
      return { ...state, goals: state.goals.map(g => (g.id === action.payload.id ? action.payload : g)) };

    case 'DEL_GOAL':
      return { ...state, goals: state.goals.filter(g => g.id !== action.payload) };

    case 'CONTRIBUTE':
      return {
        ...state,
        goals: state.goals.map(g =>
          g.id === action.payload.id
            ? { ...g, currentAmount: Math.min(g.currentAmount + action.payload.amount, g.targetAmount) }
            : g,
        ),
      };

    default:
      return state;
  }
}

// ─── Context ────────────────────────────────────────────────────────────────

interface ContextValue extends State {
  addTransaction:    (tx: Omit<Transaction, 'id'>) => Promise<void>;
  updateTransaction: (tx: Transaction) => void;
  deleteTransaction: (id: string) => void;
  setBudget:         (b: Budget) => void;
  deleteBudget:      (categoryId: string, month: string) => void;
  addGoal:           (g: Omit<Goal, 'id' | 'createdAt'>) => void;
  updateGoal:        (g: Goal) => void;
  deleteGoal:        (id: string) => void;
  contribute:        (id: string, amount: number) => void;
  getMonthStats:     (month: string) => { income: number; expenses: number; net: number };
  getCategorySpending: (month: string) => Record<string, number>;
  getBudgetStatus:   (catId: string, month: string) => { spent: number; limit: number; pct: number } | null;
}

const Ctx = createContext<ContextValue | null>(null);

// ─── Notification setup ─────────────────────────────────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ─── Provider ───────────────────────────────────────────────────────────────

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    transactions: [],
    budgets: [],
    goals: [],
    isLoading: true,
  });

  // Hydrate from storage
  useEffect(() => {
    (async () => {
      const [transactions, budgets, goals] = await Promise.all([
        loadTransactions(),
        loadBudgets(),
        loadGoals(),
      ]);
      dispatch({ type: 'HYDRATE', payload: { transactions, budgets, goals } });
    })();

    // Request notification permission
    Notifications.requestPermissionsAsync().catch(() => {});
  }, []);

  // Persist on change
  useEffect(() => { if (!state.isLoading) saveTransactions(state.transactions); }, [state.transactions, state.isLoading]);
  useEffect(() => { if (!state.isLoading) saveBudgets(state.budgets); },          [state.budgets,       state.isLoading]);
  useEffect(() => { if (!state.isLoading) saveGoals(state.goals); },              [state.goals,         state.isLoading]);

  // ── Budget alert helper ──────────────────────────────────────────────────
  const fireBudgetAlert = useCallback(
    async (categoryId: string, month: string, txs: Transaction[], budgets: Budget[]) => {
      const budget = budgets.find(b => b.categoryId === categoryId && b.month === month);
      if (!budget) return;
      const spent = txs
        .filter(t => t.type === 'expense' && t.category === categoryId && t.date.startsWith(month))
        .reduce((s, t) => s + t.amount, 0);
      const pct = (spent / budget.limit) * 100;
      const name = getCategoryById(categoryId)?.name ?? categoryId;

      if (pct >= 100) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `🚨 ${name} Budget Exceeded`,
            body: `You've spent ${formatCurrency(spent)} of your ${formatCurrency(budget.limit)} limit. Try cutting back on ${name.toLowerCase()}.`,
          },
          trigger: null,
        });
      } else if (pct >= 80) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `⚠️ ${name} Budget at ${Math.round(pct)}%`,
            body: `Only ${formatCurrency(budget.limit - spent)} left in your ${name} budget.`,
          },
          trigger: null,
        });
      }
    },
    [],
  );

  // ── Actions ─────────────────────────────────────────────────────────────
  const addTransaction = useCallback(async (tx: Omit<Transaction, 'id'>) => {
    const newTx: Transaction = { ...tx, id: `${Date.now()}_${Math.random()}` };
    dispatch({ type: 'ADD_TX', payload: newTx });
    if (tx.type === 'expense') {
      const month = tx.date.substring(0, 7);
      await fireBudgetAlert(tx.category, month, [newTx, ...state.transactions], state.budgets);
    }
  }, [state.transactions, state.budgets, fireBudgetAlert]);

  const updateTransaction = useCallback((tx: Transaction) => dispatch({ type: 'UPDATE_TX', payload: tx }), []);
  const deleteTransaction = useCallback((id: string) => dispatch({ type: 'DEL_TX', payload: id }), []);

  const setBudget    = useCallback((b: Budget) => dispatch({ type: 'SET_BUDGET', payload: b }), []);
  const deleteBudget = useCallback((categoryId: string, month: string) =>
    dispatch({ type: 'DEL_BUDGET', payload: { categoryId, month } }), []);

  const addGoal = useCallback((g: Omit<Goal, 'id' | 'createdAt'>) =>
    dispatch({
      type: 'ADD_GOAL',
      payload: { ...g, id: `${Date.now()}`, createdAt: new Date().toISOString() },
    }), []);
  const updateGoal = useCallback((g: Goal) => dispatch({ type: 'UPDATE_GOAL', payload: g }), []);
  const deleteGoal = useCallback((id: string) => dispatch({ type: 'DEL_GOAL', payload: id }), []);
  const contribute = useCallback((id: string, amount: number) =>
    dispatch({ type: 'CONTRIBUTE', payload: { id, amount } }), []);

  // ── Selectors ────────────────────────────────────────────────────────────
  const getMonthStats = useCallback((month: string) => {
    const txs = state.transactions.filter(t => t.date.startsWith(month));
    const income   = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { income, expenses, net: income - expenses };
  }, [state.transactions]);

  const getCategorySpending = useCallback((month: string) => {
    const map: Record<string, number> = {};
    state.transactions
      .filter(t => t.type === 'expense' && t.date.startsWith(month))
      .forEach(t => { map[t.category] = (map[t.category] || 0) + t.amount; });
    return map;
  }, [state.transactions]);

  const getBudgetStatus = useCallback((catId: string, month: string) => {
    const budget = state.budgets.find(b => b.categoryId === catId && b.month === month);
    if (!budget) return null;
    const spent = state.transactions
      .filter(t => t.type === 'expense' && t.category === catId && t.date.startsWith(month))
      .reduce((s, t) => s + t.amount, 0);
    return { spent, limit: budget.limit, pct: (spent / budget.limit) * 100 };
  }, [state.budgets, state.transactions]);

  return (
    <Ctx.Provider value={{
      ...state,
      addTransaction, updateTransaction, deleteTransaction,
      setBudget, deleteBudget,
      addGoal, updateGoal, deleteGoal, contribute,
      getMonthStats, getCategorySpending, getBudgetStatus,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useFinance(): ContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useFinance must be inside FinanceProvider');
  return ctx;
}

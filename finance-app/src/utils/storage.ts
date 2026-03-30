import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction, Budget, Goal } from '../types';

const KEYS = {
  TRANSACTIONS: '@finance_v1_transactions',
  BUDGETS:      '@finance_v1_budgets',
  GOALS:        '@finance_v1_goals',
};

async function load<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function save(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export const loadTransactions = () => load<Transaction[]>(KEYS.TRANSACTIONS, []);
export const saveTransactions = (v: Transaction[]) => save(KEYS.TRANSACTIONS, v);

export const loadBudgets = () => load<Budget[]>(KEYS.BUDGETS, []);
export const saveBudgets = (v: Budget[]) => save(KEYS.BUDGETS, v);

export const loadGoals = () => load<Goal[]>(KEYS.GOALS, []);
export const saveGoals = (v: Goal[]) => save(KEYS.GOALS, v);

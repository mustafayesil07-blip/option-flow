export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  amount: number;
  description: string;
  category: string;
  type: TransactionType;
  date: string; // ISO string YYYY-MM-DD
  notes?: string;
}

export interface Budget {
  categoryId: string;
  limit: number;
  month: string; // YYYY-MM
}

export interface Goal {
  id: string;
  name: string;
  icon: string;
  color: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string; // YYYY-MM-DD
  createdAt: string;
}

export interface Insight {
  id: string;
  type: 'warning' | 'info' | 'success';
  title: string;
  message: string;
}

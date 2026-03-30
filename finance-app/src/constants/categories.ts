export type CategoryGroup = 'income' | 'essentials' | 'lifestyle' | 'financial' | 'personal';

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  group: CategoryGroup;
}

export const CATEGORIES: Category[] = [
  // Income
  { id: 'salary',       name: 'Salary',       icon: '💼', color: '#00C853', group: 'income' },
  { id: 'freelance',    name: 'Freelance',     icon: '💻', color: '#69F0AE', group: 'income' },
  { id: 'investment',   name: 'Investment',    icon: '📈', color: '#00D2FF', group: 'income' },
  { id: 'other_income', name: 'Other Income',  icon: '💰', color: '#B2FF59', group: 'income' },

  // Essentials
  { id: 'housing',      name: 'Housing',       icon: '🏠', color: '#7C6FF7', group: 'essentials' },
  { id: 'groceries',    name: 'Groceries',     icon: '🛒', color: '#9D98F5', group: 'essentials' },
  { id: 'utilities',    name: 'Utilities',     icon: '⚡', color: '#FFD54F', group: 'essentials' },
  { id: 'transport',    name: 'Transport',     icon: '🚗', color: '#4DB6AC', group: 'essentials' },
  { id: 'healthcare',   name: 'Healthcare',    icon: '🏥', color: '#EF9A9A', group: 'essentials' },

  // Lifestyle
  { id: 'dining',         name: 'Dining Out',     icon: '🍽️', color: '#FF7043', group: 'lifestyle' },
  { id: 'entertainment',  name: 'Entertainment',  icon: '🎬', color: '#CE93D8', group: 'lifestyle' },
  { id: 'shopping',       name: 'Shopping',       icon: '🛍️', color: '#F48FB1', group: 'lifestyle' },
  { id: 'subscriptions',  name: 'Subscriptions',  icon: '📱', color: '#80DEEA', group: 'lifestyle' },
  { id: 'travel',         name: 'Travel',         icon: '✈️', color: '#A5D6A7', group: 'lifestyle' },

  // Financial
  { id: 'savings',        name: 'Savings',        icon: '🏦', color: '#00D2FF', group: 'financial' },
  { id: 'investments_exp',name: 'Investments',    icon: '📊', color: '#26C6DA', group: 'financial' },
  { id: 'debt',           name: 'Debt Payments',  icon: '💳', color: '#EF5350', group: 'financial' },
  { id: 'insurance',      name: 'Insurance',      icon: '🛡️', color: '#78909C', group: 'financial' },

  // Personal
  { id: 'education', name: 'Education', icon: '📚', color: '#FFF176', group: 'personal' },
  { id: 'fitness',   name: 'Fitness',   icon: '💪', color: '#AED581', group: 'personal' },
  { id: 'beauty',    name: 'Beauty',    icon: '💄', color: '#F48FB1', group: 'personal' },
  { id: 'gifts',     name: 'Gifts',     icon: '🎁', color: '#FFCC02', group: 'personal' },
  { id: 'pets',      name: 'Pets',      icon: '🐾', color: '#BCAAA4', group: 'personal' },
  { id: 'other',     name: 'Other',     icon: '📦', color: '#B0BEC5', group: 'personal' },
];

export const EXPENSE_CATEGORIES = CATEGORIES.filter(c => c.group !== 'income');
export const INCOME_CATEGORIES  = CATEGORIES.filter(c => c.group === 'income');

export const getCategoryById = (id: string): Category | undefined =>
  CATEGORIES.find(c => c.id === id);

export const GROUP_LABELS: Record<CategoryGroup, string> = {
  income:     'Income',
  essentials: 'Essentials',
  lifestyle:  'Lifestyle',
  financial:  'Financial',
  personal:   'Personal',
};

export const GOAL_ICONS = ['🎯', '🏠', '🚗', '✈️', '💍', '🎓', '💻', '🏖️', '🏋️', '💊', '🐾', '🎸'];
export const GOAL_COLORS = [
  '#7C6FF7', '#00D2FF', '#00C853', '#FFB300',
  '#FF3D71', '#FF6B35', '#CE93D8', '#26C6DA',
  '#69F0AE', '#FFD54F', '#F48FB1', '#80DEEA',
];

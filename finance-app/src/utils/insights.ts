import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { Transaction, Budget, Insight } from '../types';
import { getCategoryById } from '../constants/categories';
import { formatCurrency } from './currency';

function txInMonth(tx: Transaction, month: Date): boolean {
  return isWithinInterval(new Date(tx.date), {
    start: startOfMonth(month),
    end: endOfMonth(month),
  });
}

function categorySpending(txs: Transaction[]): Record<string, number> {
  const map: Record<string, number> = {};
  txs.filter(t => t.type === 'expense').forEach(t => {
    map[t.category] = (map[t.category] || 0) + t.amount;
  });
  return map;
}

export function generateInsights(
  transactions: Transaction[],
  budgets: Budget[],
): Insight[] {
  const insights: Insight[] = [];
  const now = new Date();
  const thisMonth = format(now, 'yyyy-MM');

  const thisTx = transactions.filter(t => txInMonth(t, now));
  const lastTx = transactions.filter(t => txInMonth(t, subMonths(now, 1)));

  const thisSpend = categorySpending(thisTx);
  const lastSpend = categorySpending(lastTx);

  // Category spike: ≥30% increase month-over-month
  for (const [catId, amount] of Object.entries(thisSpend)) {
    const prev = lastSpend[catId] ?? 0;
    if (prev > 0) {
      const pct = ((amount - prev) / prev) * 100;
      if (pct >= 30) {
        const cat = getCategoryById(catId);
        insights.push({
          id: `spike_${catId}`,
          type: 'warning',
          title: `${cat?.name ?? catId} up ${Math.round(pct)}%`,
          message: `${formatCurrency(amount)} this month vs ${formatCurrency(prev)} last month.`,
        });
      }
    }
  }

  // Budget alerts
  for (const budget of budgets.filter(b => b.month === thisMonth)) {
    const spent = thisSpend[budget.categoryId] ?? 0;
    const pct = (spent / budget.limit) * 100;
    const cat = getCategoryById(budget.categoryId);
    const name = cat?.name ?? budget.categoryId;
    if (pct >= 100) {
      insights.push({
        id: `over_${budget.categoryId}`,
        type: 'warning',
        title: `${name} budget exceeded`,
        message: `Spent ${formatCurrency(spent)} of ${formatCurrency(budget.limit)}. Consider cutting back.`,
      });
    } else if (pct >= 80) {
      insights.push({
        id: `warn_${budget.categoryId}`,
        type: 'info',
        title: `${name} at ${Math.round(pct)}% of budget`,
        message: `${formatCurrency(budget.limit - spent)} remaining for the month.`,
      });
    }
  }

  // Savings rate
  const income   = thisTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenses = thisTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  if (income > 0) {
    const rate = ((income - expenses) / income) * 100;
    if (rate >= 20) {
      insights.push({
        id: 'savings_great',
        type: 'success',
        title: `Saving ${Math.round(rate)}% of income`,
        message: `You're on track. You've saved ${formatCurrency(income - expenses)} this month.`,
      });
    } else if (income - expenses < 0) {
      insights.push({
        id: 'overspend',
        type: 'warning',
        title: 'Spending exceeds income',
        message: `You're ${formatCurrency(expenses - income)} over your income this month.`,
      });
    }
  }

  // Deduplicate and cap
  const seen = new Set<string>();
  return insights.filter(i => {
    if (seen.has(i.id)) return false;
    seen.add(i.id);
    return true;
  }).slice(0, 3);
}

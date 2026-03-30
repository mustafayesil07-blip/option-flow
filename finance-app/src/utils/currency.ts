import * as Localization from 'expo-localization';

function detectLocaleAndCurrency(): { locale: string; currency: string } {
  try {
    const locales = Localization.getLocales();
    const locale = locales?.[0]?.languageTag ?? 'en-US';
    const currencies = Localization.getCurrencies?.() ?? [];
    const currency = currencies[0] ?? 'USD';
    return { locale, currency };
  } catch {
    return { locale: 'en-US', currency: 'USD' };
  }
}

const { locale: LOCALE, currency: CURRENCY } = detectLocaleAndCurrency();

export { LOCALE, CURRENCY };

export function formatCurrency(amount: number, compact = false): string {
  try {
    if (compact && Math.abs(amount) >= 10_000) {
      return new Intl.NumberFormat(LOCALE, {
        style: 'currency',
        currency: CURRENCY,
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(amount);
    }
    return new Intl.NumberFormat(LOCALE, {
      style: 'currency',
      currency: CURRENCY,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${Math.abs(amount).toFixed(2)}`;
  }
}

export function parseCurrencyInput(value: string): number {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

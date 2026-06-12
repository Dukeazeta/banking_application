export const APP_LOCALE = "en-NG";
export const APP_CURRENCY = "NGN";

const currencyFormatter = new Intl.NumberFormat(APP_LOCALE, {
  style: "currency",
  currency: APP_CURRENCY,
});

const compactCurrencyFormatter = new Intl.NumberFormat(APP_LOCALE, {
  style: "currency",
  currency: APP_CURRENCY,
  minimumFractionDigits: 2,
});

export function formatCurrency(value: number | string): string {
  const amount = typeof value === "number" ? value : Number(value);
  return currencyFormatter.format(Number.isFinite(amount) ? amount : 0);
}

export function formatCompactCurrency(value: number | string): string {
  const amount = typeof value === "number" ? value : Number(value);
  return compactCurrencyFormatter.format(Number.isFinite(amount) ? amount : 0);
}

export function formatNigeriaDate(value: string | Date): string {
  return new Intl.DateTimeFormat(APP_LOCALE, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatNigeriaDateTime(value: string | Date): string {
  return new Intl.DateTimeFormat(APP_LOCALE, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

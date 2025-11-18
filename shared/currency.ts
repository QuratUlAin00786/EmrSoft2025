import { z } from "zod";

// Supported currency codes (ISO 4217)
export const currencyCodeSchema = z.enum([
  "GBP", // British Pound
  "USD", // US Dollar
  "EUR", // Euro
  "JPY", // Japanese Yen
  "CNY", // Chinese Yuan
  "INR", // Indian Rupee
  "AUD", // Australian Dollar
  "CAD", // Canadian Dollar
  "CHF", // Swiss Franc
  "HKD", // Hong Kong Dollar
  "SGD", // Singapore Dollar
  "SEK", // Swedish Krona
  "NZD", // New Zealand Dollar
  "KRW", // South Korean Won
  "MXN", // Mexican Peso
  "BRL", // Brazilian Real
  "ZAR", // South African Rand
  "TRY", // Turkish Lira
  "RUB", // Russian Ruble
  "AED", // UAE Dirham
  "SAR", // Saudi Riyal
  "PLN", // Polish Zloty
  "THB", // Thai Baht
  "IDR", // Indonesian Rupiah
  "MYR", // Malaysian Ringgit
  "PHP", // Philippine Peso
  "PKR", // Pakistani Rupee
  "BDT", // Bangladeshi Taka
  "VND", // Vietnamese Dong
  "NGN", // Nigerian Naira
]);

export type CurrencyCode = z.infer<typeof currencyCodeSchema>;

// Currency metadata
export interface CurrencyMetadata {
  code: CurrencyCode;
  symbol: string;
  name: string;
  locale: string;
  decimals: number;
}

export const CURRENCY_MAP: Record<CurrencyCode, CurrencyMetadata> = {
  GBP: { code: "GBP", symbol: "£", name: "British Pound", locale: "en-GB", decimals: 2 },
  USD: { code: "USD", symbol: "$", name: "US Dollar", locale: "en-US", decimals: 2 },
  EUR: { code: "EUR", symbol: "€", name: "Euro", locale: "de-DE", decimals: 2 },
  JPY: { code: "JPY", symbol: "¥", name: "Japanese Yen", locale: "ja-JP", decimals: 0 },
  CNY: { code: "CNY", symbol: "¥", name: "Chinese Yuan", locale: "zh-CN", decimals: 2 },
  INR: { code: "INR", symbol: "₹", name: "Indian Rupee", locale: "en-IN", decimals: 2 },
  AUD: { code: "AUD", symbol: "A$", name: "Australian Dollar", locale: "en-AU", decimals: 2 },
  CAD: { code: "CAD", symbol: "C$", name: "Canadian Dollar", locale: "en-CA", decimals: 2 },
  CHF: { code: "CHF", symbol: "CHF", name: "Swiss Franc", locale: "de-CH", decimals: 2 },
  HKD: { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar", locale: "en-HK", decimals: 2 },
  SGD: { code: "SGD", symbol: "S$", name: "Singapore Dollar", locale: "en-SG", decimals: 2 },
  SEK: { code: "SEK", symbol: "kr", name: "Swedish Krona", locale: "sv-SE", decimals: 2 },
  NZD: { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar", locale: "en-NZ", decimals: 2 },
  KRW: { code: "KRW", symbol: "₩", name: "South Korean Won", locale: "ko-KR", decimals: 0 },
  MXN: { code: "MXN", symbol: "MX$", name: "Mexican Peso", locale: "es-MX", decimals: 2 },
  BRL: { code: "BRL", symbol: "R$", name: "Brazilian Real", locale: "pt-BR", decimals: 2 },
  ZAR: { code: "ZAR", symbol: "R", name: "South African Rand", locale: "en-ZA", decimals: 2 },
  TRY: { code: "TRY", symbol: "₺", name: "Turkish Lira", locale: "tr-TR", decimals: 2 },
  RUB: { code: "RUB", symbol: "₽", name: "Russian Ruble", locale: "ru-RU", decimals: 2 },
  AED: { code: "AED", symbol: "د.إ", name: "UAE Dirham", locale: "ar-AE", decimals: 2 },
  SAR: { code: "SAR", symbol: "﷼", name: "Saudi Riyal", locale: "ar-SA", decimals: 2 },
  PLN: { code: "PLN", symbol: "zł", name: "Polish Zloty", locale: "pl-PL", decimals: 2 },
  THB: { code: "THB", symbol: "฿", name: "Thai Baht", locale: "th-TH", decimals: 2 },
  IDR: { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah", locale: "id-ID", decimals: 0 },
  MYR: { code: "MYR", symbol: "RM", name: "Malaysian Ringgit", locale: "ms-MY", decimals: 2 },
  PHP: { code: "PHP", symbol: "₱", name: "Philippine Peso", locale: "en-PH", decimals: 2 },
  PKR: { code: "PKR", symbol: "₨", name: "Pakistani Rupee", locale: "en-PK", decimals: 2 },
  BDT: { code: "BDT", symbol: "৳", name: "Bangladeshi Taka", locale: "bn-BD", decimals: 2 },
  VND: { code: "VND", symbol: "₫", name: "Vietnamese Dong", locale: "vi-VN", decimals: 0 },
  NGN: { code: "NGN", symbol: "₦", name: "Nigerian Naira", locale: "en-NG", decimals: 2 },
};

// Helper to ensure valid currency code
export function ensureCurrencyCode(code: string | undefined): CurrencyCode {
  const parsed = currencyCodeSchema.safeParse(code);
  return parsed.success ? parsed.data : "GBP";
}

// Format currency amount with symbol and locale
export function formatCurrency(
  amount: number | string,
  currencyCode: CurrencyCode = "GBP",
  options?: Intl.NumberFormatOptions
): string {
  const metadata = CURRENCY_MAP[currencyCode];
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;

  if (isNaN(numAmount)) {
    return `${metadata.symbol}0.00`;
  }

  const formatted = new Intl.NumberFormat(metadata.locale, {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: metadata.decimals,
    maximumFractionDigits: metadata.decimals,
    ...options,
  }).format(numAmount);

  return formatted;
}

// Get currency symbol only
export function getCurrencySymbol(currencyCode: CurrencyCode = "GBP"): string {
  return CURRENCY_MAP[currencyCode].symbol;
}

// Get all supported currencies for dropdown
export function getSupportedCurrencies(): CurrencyMetadata[] {
  return Object.values(CURRENCY_MAP);
}

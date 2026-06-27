import type { Currency } from "../domain/types";

export function formatMoney(amount: number, currency: Currency = "CNY") {
  if (currency === "USD") return `$${amount.toLocaleString("en-US")}`;
  return `¥${amount.toLocaleString("zh-CN")}`;
}

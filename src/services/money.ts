import type { Currency } from "../domain/types";

export function formatMoney(amount: number, currency: Currency = "CNY") {
  if (currency === "USD") return `$${amount.toLocaleString("en-US")}`;
  if (currency === "CNY") return `CNY ${amount.toLocaleString("zh-CN")}`;
  return `${amount.toLocaleString("en-US")} ${currency}`;
}

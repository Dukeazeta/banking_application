export type AccountType = "SAVINGS" | "CURRENT";

export function formatAccountType(accountType: AccountType): string {
  return accountType === "CURRENT" ? "Current" : "Savings";
}

export function maskMoney(): string {
  return "••••••";
}

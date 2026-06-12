"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency, formatNigeriaDate, formatNigeriaDateTime } from "../../lib/format";
import { formatAccountType, maskMoney, type AccountType } from "@/lib/accounts";

type Account = {
  account_id: number;
  account_number: string;
  account_type: AccountType;
  balance: string;
  status: "ACTIVE" | "CLOSED" | "FROZEN";
  opened_at: string;
};

type Customer = {
  first_name: string;
  last_name: string;
  email: string;
};

type Transaction = {
  transaction_id: number;
  transaction_reference: string;
  account_id: number;
  transaction_type: "DEPOSIT" | "WITHDRAWAL" | "TRANSFER_IN" | "TRANSFER_OUT";
  amount: string;
  balance_after: string;
  status: "SUCCESS" | "FAILED";
  description: string | null;
  created_at: string;
};

export default function DashboardOverview() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [recentTxns, setRecentTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBalances, setShowBalances] = useState(true);
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  
  // Modal state
  const [openModal, setOpenModal] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>("CURRENT");
  const [creationLoading, setCreationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      const customerRes = await fetch("/api/customers");
      if (customerRes.ok) {
        const customerData = await customerRes.json();
        setCustomer(customerData.customer);
      }

      const accountsRes = await fetch("/api/accounts");
      if (accountsRes.ok) {
        const accountsData = await accountsRes.json();
        const activeAccounts: Account[] = accountsData.accounts || [];
        setAccounts(activeAccounts);

        if (activeAccounts.length > 0) {
          const txnsPromises = activeAccounts.map(async (acc) => {
            const res = await fetch(`/api/transactions/mini-statement?accountId=${acc.account_id}`);
            if (res.ok) {
              const data = await res.json();
              return (data.transactions || []) as Transaction[];
            }
            return [];
          });

          const txnsResults = await Promise.all(txnsPromises);
          const flattened = txnsResults.flat();
          flattened.sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          setRecentTxns(flattened.slice(0, 5));
        }
      }
    } catch (err) {
      console.error("Dashboard data fetching failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const copyAccountNumber = async (accountNumber: string) => {
    await navigator.clipboard.writeText(accountNumber);
    setCopiedAccount(accountNumber);
    window.setTimeout(() => setCopiedAccount(null), 1400);
  };

  const getTransactionAccountNumber = (transaction: Transaction) =>
    accounts.find((account) => account.account_id === transaction.account_id)?.account_number ??
    "Unknown";

  const handleOpenAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setCreationLoading(true);

    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountType }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to open account.");
      }

      setSuccessMsg("Account opened successfully!");
      setOpenModal(false);
      await fetchDashboardData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred opening the account.");
      }
    } finally {
      setCreationLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#533afd] border-t-transparent" />
      </div>
    );
  }

  const totalAssets = accounts
    .filter((acc) => acc.status === "ACTIVE")
    .reduce((sum, acc) => sum + parseFloat(acc.balance), 0);

  return (
    <div className="space-y-16 pb-16 font-sans">
      
      {/* 1. Hero Summary (Stripi Minimalist) */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#e3e8ee] pb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <p className="text-[13px] font-[400] text-[#64748d] uppercase tracking-[0.06em]">
              Total Balance
            </p>
            <button
              type="button"
              onClick={() => setShowBalances((value) => !value)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#e3e8ee] bg-white text-[#64748d] transition-colors hover:bg-[#f6f9fc] hover:text-[#0d253d]"
              aria-label={showBalances ? "Hide balances" : "Show balances"}
              aria-pressed={!showBalances}
            >
              {showBalances ? (
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              ) : (
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3l18 18" />
                  <path d="M10.6 10.6a3 3 0 0 0 4.2 4.2" />
                  <path d="M9.9 5.2A10.5 10.5 0 0 1 12 5c6 0 9.5 7 9.5 7a15.8 15.8 0 0 1-2.5 3.3" />
                  <path d="M6.2 6.8C3.8 8.5 2.5 12 2.5 12S6 19 12 19a10.8 10.8 0 0 0 4.2-.8" />
                </svg>
              )}
            </button>
          </div>
          <h1 className="text-[48px] font-[300] leading-[1.1] tracking-[-0.96px] text-[#0d253d] [font-feature-settings:'tnum','ss01']">
            {showBalances ? formatCurrency(totalAssets) : maskMoney()}
          </h1>
        </div>
        
        <button
          onClick={() => setOpenModal(true)}
          className="inline-flex h-10 items-center justify-center rounded-full bg-[#533afd] px-6 text-[14px] font-[400] text-white hover:bg-[#4434d4] transition-colors [font-feature-settings:'ss01'] shrink-0 shadow-sm"
        >
          Open new account
        </button>
      </section>

      {/* 2. Accounts Portfolio */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-[20px] font-[300] tracking-[-0.2px] text-[#0d253d] [font-feature-settings:'ss01']">
            Active Accounts
          </h2>
        </div>
        
        {accounts.length === 0 ? (
          <div className="rounded-[12px] border border-dashed border-[#a8c3de] bg-white p-12 text-center">
            <p className="text-[15px] font-[400] text-[#0d253d]">No active accounts</p>
            <p className="text-[13px] text-[#64748d] mt-1 mb-6">Open a current or savings account to get started.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map((acc) => {
              const isFrozen = acc.status === "FROZEN";

              return (
                <Link
                  key={acc.account_id}
                  href={`/dashboard/accounts/${acc.account_id}`}
                  className="group flex flex-col justify-between rounded-[12px] bg-white border border-[#e3e8ee] p-6 hover:border-[#a8c3de] hover:shadow-[0_1px_3px_rgba(0,55,112,0.08)] transition-all duration-200 min-h-[160px]"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <span className="text-[15px] font-[400] text-[#0d253d] block group-hover:text-[#533afd] transition-colors">
                        {formatAccountType(acc.account_type)}
                      </span>
                      <span className="flex items-center gap-2 text-[13px] text-[#64748d] font-mono tracking-tight">
                        ...{acc.account_number.slice(-4)}
                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            void copyAccountNumber(acc.account_number);
                          }}
                          className="font-sans text-[12px] text-[#0d253d] underline-offset-4 hover:underline"
                        >
                          {copiedAccount === acc.account_number ? "Copied" : "Copy"}
                        </button>
                      </span>
                    </div>
                    {isFrozen ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-[400] uppercase tracking-[0.1px] bg-[#fef2f1] text-[#ea2261]">
                        Frozen
                      </span>
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-[#34c759] mt-1 opacity-70" />
                    )}
                  </div>

                  <div className="mt-8 flex items-baseline justify-between">
                    <div className="text-[26px] font-[300] leading-[1.12] tracking-[-0.26px] text-[#0d253d] [font-feature-settings:'tnum','ss01']">
                      {showBalances ? formatCurrency(acc.balance) : maskMoney()}
                    </div>
                    <span className="text-[16px] text-[#a8c3de] group-hover:text-[#533afd] transition-colors">
                      →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. Recent Activity (Stripi Data Density) */}
      {accounts.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[20px] font-[300] tracking-[-0.2px] text-[#0d253d] [font-feature-settings:'ss01']">
              Recent Activity
            </h2>
          </div>

          {recentTxns.length === 0 ? (
            <div className="rounded-[12px] bg-white border border-[#e3e8ee] p-8 text-center text-[#64748d] text-[13px]">
              No recent transactions recorded.
            </div>
          ) : (
            <div className="bg-white border border-[#e3e8ee] rounded-[12px] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-[#e3e8ee] bg-[#f6f9fc]">
                      <th className="text-[11px] font-[400] uppercase tracking-[0.06em] text-[#64748d] px-6 py-3">Date</th>
                      <th className="text-[11px] font-[400] uppercase tracking-[0.06em] text-[#64748d] px-6 py-3">Description</th>
                      <th className="text-[11px] font-[400] uppercase tracking-[0.06em] text-[#64748d] px-6 py-3">Status</th>
                      <th className="text-[11px] font-[400] uppercase tracking-[0.06em] text-[#64748d] px-6 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e3e8ee]">
                    {recentTxns.map((txn) => {
                      const isCredit = txn.transaction_type === "DEPOSIT" || txn.transaction_type === "TRANSFER_IN";
                      const isFailed = txn.status === "FAILED";

                      return (
                        <tr
                          key={txn.transaction_id}
                          onClick={() => setSelectedTransaction(txn)}
                          className="cursor-pointer hover:bg-[#f6f9fc]/50 transition-colors group"
                        >
                          <td className="text-[13px] text-[#64748d] px-6 py-4 whitespace-nowrap [font-feature-settings:'tnum']">
                            {formatNigeriaDate(txn.created_at)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-[14px] font-[400] text-[#0d253d] max-w-[280px] truncate">
                              {txn.description || txn.transaction_type.replace("_", " ")}
                            </div>
                            <div className="text-[12px] text-[#a8c3de] font-mono tracking-tight mt-0.5">
                              Ref: {txn.transaction_reference.slice(0, 8)}...
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-[400] uppercase tracking-[0.1px]
                                ${isFailed ? "bg-[#fef2f1] text-[#ea2261]" : "bg-[#f6f9fc] text-[#64748d] border border-[#e3e8ee]"}
                              `}
                            >
                              {txn.status}
                            </span>
                          </td>
                          <td className={`text-[15px] font-[300] [font-feature-settings:'tnum'] px-6 py-4 text-right whitespace-nowrap
                            ${isFailed ? "text-[#a8c3de] line-through" : isCredit ? "text-[#34c759]" : "text-[#0d253d]"}
                          `}>
                            {isCredit ? "+" : "-"}{formatCurrency(txn.amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Account Opening Custom Frosted Modal */}
      {openModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0d253d]/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-[420px] rounded-[16px] bg-white border border-[#e3e8ee] p-8 shadow-[0_8px_24px_rgba(0,55,112,0.08)] space-y-8">
            <div className="space-y-2">
              <h2 className="text-[22px] font-[300] tracking-[-0.22px] text-[#0d253d] [font-feature-settings:'ss01']">Open account</h2>
              <p className="text-[13px] text-[#64748d]">
                Initialize a new Savings or Current record.
              </p>
            </div>

            {error && (
              <div className="rounded-md bg-[#fef2f1] border border-[#ea2261]/20 p-4 text-[#ea2261] text-[13px]">
                {error}
              </div>
            )}

            <form onSubmit={handleOpenAccount} className="space-y-6">
              <div className="space-y-3">
                <label className="text-[11px] font-[400] uppercase tracking-[0.06em] text-[#64748d] block">Account Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAccountType("CURRENT")}
                    className={`px-4 py-3 rounded-md border text-[13px] font-[400] transition-all text-center
                      ${accountType === "CURRENT"
                        ? "border-[#533afd] bg-[#f6f9fc] text-[#533afd] shadow-sm"
                        : "border-[#e3e8ee] hover:bg-[#f6f9fc] text-[#64748d]"
                      }
                    `}
                  >
                    Current
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountType("SAVINGS")}
                    className={`px-4 py-3 rounded-md border text-[13px] font-[400] transition-all text-center
                      ${accountType === "SAVINGS"
                        ? "border-[#533afd] bg-[#f6f9fc] text-[#533afd] shadow-sm"
                        : "border-[#e3e8ee] hover:bg-[#f6f9fc] text-[#64748d]"
                      }
                    `}
                  >
                    Savings
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setOpenModal(false)}
                  disabled={creationLoading}
                  className="w-1/2 rounded-full border border-[#e3e8ee] bg-white py-2 text-[14px] text-[#0d253d] hover:bg-[#f6f9fc] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creationLoading}
                  className="w-1/2 rounded-full bg-[#533afd] py-2 text-[14px] text-white hover:bg-[#4434d4] transition-colors"
                >
                  {creationLoading ? "Processing..." : "Confirm"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedTransaction && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#0d253d]/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-[480px] rounded-[16px] bg-white border border-[#e3e8ee] p-8 shadow-[0_8px_24px_rgba(0,55,112,0.08)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[22px] font-[300] tracking-[-0.22px] text-[#0d253d] [font-feature-settings:'ss01']">Transaction details</h2>
                <p className="mt-1 font-mono text-[12px] text-[#64748d]">{selectedTransaction.transaction_reference}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTransaction(null)}
                className="text-[22px] leading-none text-[#64748d] hover:text-[#0d253d]"
                aria-label="Close transaction details"
              >
                &times;
              </button>
            </div>

            <div className="mt-8 grid gap-4 text-[13px]">
              {[
                ["Type", selectedTransaction.transaction_type.replace("_", " ")],
                ["Amount", formatCurrency(selectedTransaction.amount)],
                ["Status", selectedTransaction.status],
                ["Description", selectedTransaction.description || "No description"],
                ["Account number", getTransactionAccountNumber(selectedTransaction)],
                ["Balance after", formatCurrency(selectedTransaction.balance_after)],
                ["Timestamp", formatNigeriaDateTime(selectedTransaction.created_at)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-6 border-b border-[#e3e8ee] pb-3 last:border-0">
                  <span className="text-[#64748d]">{label}</span>
                  <span className="text-right font-[400] text-[#0d253d]">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

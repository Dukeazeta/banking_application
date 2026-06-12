"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency, formatNigeriaDateTime } from "@/lib/format";
import { formatAccountType, maskMoney, type AccountType } from "@/lib/accounts";

type Account = {
  account_id: number;
  account_number: string;
  account_type: AccountType;
  balance: string;
  status: "ACTIVE" | "CLOSED" | "FROZEN";
  opened_at: string;
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

export default function AccountDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);

  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBalances, setShowBalances] = useState(true);
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    async function fetchAccountData() {
      try {
        const accountsRes = await fetch("/api/accounts");
        if (!accountsRes.ok) {
          throw new Error("Failed to load accounts.");
        }
        
        const accountsData = await accountsRes.json();
        const activeAccounts: Account[] = accountsData.accounts || [];
        const matched = activeAccounts.find((acc) => acc.account_id === parseInt(id));

        if (!matched) {
          setError("Account not found or access denied.");
          setLoading(false);
          return;
        }
        setAccount(matched);

        const historyRes = await fetch(`/api/transactions/history?accountId=${id}`);
        if (historyRes.ok) {
          const historyData = await historyRes.json();
          setTransactions(historyData.transactions || []);
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Failed to reconstruct account history.");
        }
      } finally {
        setLoading(false);
      }
    }
    fetchAccountData();
  }, [id]);

  const copyAccountNumber = async (accountNumber: string) => {
    await navigator.clipboard.writeText(accountNumber);
    setCopiedAccount(accountNumber);
    window.setTimeout(() => setCopiedAccount(null), 1400);
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#533afd] border-t-transparent" />
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="space-y-6 text-center py-20 animate-fade-in">
        <div className="text-[48px] text-[#ea2261] mb-2 font-[300]">!</div>
        <h1 className="text-[20px] font-[300] tracking-[-0.2px] text-[#0d253d] [font-feature-settings:'ss01']">
          {error || "Ledger Rebuild Failure"}
        </h1>
        <p className="text-[14px] text-[#64748d] max-w-sm mx-auto">
          Please check your permissions or return to the main dashboard.
        </p>
        <Link href="/dashboard" className="inline-flex h-10 items-center justify-center rounded-full bg-[#533afd] px-6 text-[14px] font-[400] text-white hover:bg-[#4434d4] transition-colors shadow-sm mt-4">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const isFrozen = account.status === "FROZEN";

  return (
    <div className="space-y-10 font-sans pb-16">
      
      {/* Navigation Breadcrumbs */}
      <div className="flex items-center gap-2">
        <Link href="/dashboard" className="text-[13px] font-[400] text-[#64748d] hover:text-[#0d253d] hover:underline transition-colors">
          &larr; Overview
        </Link>
        <span className="text-[13px] text-[#a8c3de]">/</span>
        <span className="text-[13px] text-[#a8c3de]">Ledger details</span>
      </div>

      {/* Hero Summary & Actions */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-[#e3e8ee] pb-8">
        <div className="space-y-6">
          <div className="space-y-1">
            <h1 className="text-[26px] font-[300] leading-[1.12] tracking-[-0.26px] text-[#0d253d] [font-feature-settings:'ss01'] flex items-center gap-3">
              {formatAccountType(account.account_type)}
              {isFrozen && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-[400] uppercase tracking-[0.1px] bg-[#fef2f1] text-[#ea2261]">
                  Frozen
                </span>
              )}
            </h1>
            <div className="flex items-center gap-3 text-[13px] text-[#64748d] font-mono tracking-tight">
              <span>...{account.account_number.slice(-4)}</span>
              <button
                type="button"
                onClick={() => copyAccountNumber(account.account_number)}
                className="font-sans text-[12px] text-[#0d253d] underline-offset-4 hover:underline"
              >
                {copiedAccount === account.account_number ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
          
          <div className="space-y-2 pt-2">
            <div className="flex items-center gap-3">
              <p className="text-[11px] font-[400] uppercase tracking-[0.06em] text-[#64748d]">
                Current Balance
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
            <div className="text-[40px] font-[300] leading-[1] tracking-[-0.8px] text-[#0d253d] [font-feature-settings:'tnum','ss01']">
              {showBalances ? formatCurrency(account.balance) : maskMoney()}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap md:flex-col lg:flex-row items-center gap-3 w-full md:w-auto">
          <Link
            href={`/dashboard/deposit?accountId=${account.account_id}`}
            className="flex-1 md:flex-none inline-flex h-10 items-center justify-center rounded-full border border-[#e3e8ee] bg-white px-6 text-[14px] font-[400] text-[#0d253d] hover:border-[#a8c3de] hover:bg-[#f6f9fc] transition-colors"
          >
            Deposit
          </Link>
          <Link
            href={`/dashboard/withdraw?accountId=${account.account_id}`}
            className="flex-1 md:flex-none inline-flex h-10 items-center justify-center rounded-full border border-[#e3e8ee] bg-white px-6 text-[14px] font-[400] text-[#0d253d] hover:border-[#a8c3de] hover:bg-[#f6f9fc] transition-colors"
          >
            Withdraw
          </Link>
          <Link
            href={`/dashboard/transfer?fromAccountId=${account.account_id}`}
            className="flex-1 md:flex-none inline-flex h-10 items-center justify-center rounded-full border border-[#e3e8ee] bg-white px-6 text-[14px] font-[400] text-[#0d253d] hover:border-[#a8c3de] hover:bg-[#f6f9fc] transition-colors"
          >
            Transfer
          </Link>
        </div>
      </section>

      {/* Historical Ledger Table */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-[20px] font-[300] tracking-[-0.2px] text-[#0d253d] [font-feature-settings:'ss01']">
            Ledger Statement
          </h2>
          <span className="text-[13px] text-[#64748d]">
            {transactions.length} record{transactions.length !== 1 && "s"}
          </span>
        </div>

        {transactions.length === 0 ? (
          <div className="rounded-[12px] bg-white border border-[#e3e8ee] p-12 text-center text-[#64748d] text-[13px]">
            No transactions found for this account.
          </div>
        ) : (
          <div className="bg-white border border-[#e3e8ee] rounded-[12px] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b border-[#e3e8ee] bg-[#f6f9fc]">
                    <th className="text-[11px] font-[400] uppercase tracking-[0.06em] text-[#64748d] px-6 py-3">Date</th>
                    <th className="text-[11px] font-[400] uppercase tracking-[0.06em] text-[#64748d] px-6 py-3">Description</th>
                    <th className="text-[11px] font-[400] uppercase tracking-[0.06em] text-[#64748d] px-6 py-3">Status</th>
                    <th className="text-[11px] font-[400] uppercase tracking-[0.06em] text-[#64748d] px-6 py-3 text-right">Amount</th>
                    <th className="text-[11px] font-[400] uppercase tracking-[0.06em] text-[#64748d] px-6 py-3 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e3e8ee]">
                  {transactions.map((txn) => {
                    const isCredit = txn.transaction_type === "DEPOSIT" || txn.transaction_type === "TRANSFER_IN";
                    const isFailed = txn.status === "FAILED";

                    return (
                      <tr
                        key={txn.transaction_id}
                        onClick={() => setSelectedTransaction(txn)}
                        className="cursor-pointer hover:bg-[#f6f9fc]/50 transition-colors group"
                      >
                        <td className="text-[13px] text-[#64748d] px-6 py-4 whitespace-nowrap [font-feature-settings:'tnum']">
                          {formatNigeriaDateTime(txn.created_at)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-[14px] font-[400] text-[#0d253d] max-w-[260px] truncate">
                            {txn.description || txn.transaction_type.replace("_", " ")}
                          </div>
                          <div className="text-[12px] text-[#a8c3de] font-mono tracking-tight mt-0.5">
                            Ref: {txn.transaction_reference}
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
                        <td className="text-[14px] font-[300] [font-feature-settings:'tnum'] px-6 py-4 text-right text-[#64748d] whitespace-nowrap">
                          {formatCurrency(txn.balance_after)}
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
                ["Account number", account.account_number],
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

"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatCompactCurrency, formatCurrency } from "@/lib/format";
import { formatAccountType, type AccountType } from "@/lib/accounts";

type Account = {
  account_id: number;
  account_number: string;
  account_type: AccountType;
  balance: string;
  status: "ACTIVE" | "CLOSED" | "FROZEN";
};

function DepositContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlAccountId = searchParams.get("accountId");

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAccounts() {
      try {
        const res = await fetch("/api/accounts");
        if (res.ok) {
          const data = await res.json();
          const activeAccounts = (data.accounts || []).filter(
            (acc: Account) => acc.status === "ACTIVE"
          );
          setAccounts(activeAccounts);

          if (urlAccountId && activeAccounts.some((acc: Account) => acc.account_id === parseInt(urlAccountId))) {
            setSelectedAccountId(urlAccountId);
          } else if (activeAccounts.length > 0) {
            setSelectedAccountId(activeAccounts[0].account_id.toString());
          }
        }
      } catch (err) {
        console.error("Failed to load accounts for deposit:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAccounts();
  }, [urlAccountId]);

  const selectedAccount = accounts.find(
    (acc) => acc.account_id === parseInt(selectedAccountId)
  );

  const copyAccountNumber = async (accountNumber: string) => {
    await navigator.clipboard.writeText(accountNumber);
    setCopiedAccount(accountNumber);
    window.setTimeout(() => setCopiedAccount(null), 1400);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setProcessing(true);

    if (!selectedAccountId || !amount) {
      setError("Please select an account and specify a deposit amount.");
      setProcessing(false);
      return;
    }

    const numericAmount = parseFloat(amount);
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      setError("Please specify a valid deposit amount greater than zero.");
      setProcessing(false);
      return;
    }

    try {
      const res = await fetch("/api/transactions/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: parseInt(selectedAccountId),
          amount: numericAmount,
          description: description || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Deposit failed.");
      }

      setSuccess("Deposit of " + formatCurrency(numericAmount) + " completed successfully!");
      
      setAmount("");
      setDescription("");

      setTimeout(() => {
        router.push(`/dashboard/accounts/${selectedAccountId}`);
      }, 2000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred during processing.");
      }
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#533afd] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-10 font-sans max-w-[500px] mx-auto pb-16">
      
      {/* Navigation Breadcrumbs */}
      <div className="flex items-center justify-center gap-2">
        <Link href="/dashboard" className="text-[13px] font-[400] text-[#64748d] hover:text-[#0d253d] hover:underline transition-colors">
          &larr; Overview
        </Link>
        <span className="text-[13px] text-[#a8c3de]">/</span>
        <span className="text-[13px] text-[#a8c3de]">Deposit</span>
      </div>

      {/* Main Deposit Form Card */}
      <div className="w-full rounded-[16px] bg-white border border-[#e3e8ee] p-8 shadow-[0_8px_24px_rgba(0,55,112,0.08)]">
        <div className="mb-8 space-y-2 text-center">
          <h1 className="text-[26px] font-[300] leading-[1.12] tracking-[-0.26px] text-[#0d253d] [font-feature-settings:'ss01']">
            Process Deposit
          </h1>
          <p className="text-[13px] text-[#64748d]">
            Securely load funds into your active accounts.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-[#fef2f1] border border-[#ea2261]/20 p-4 text-[#ea2261] text-[13px] animate-fade-in text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-md bg-[#f6f9fc] border border-[#e3e8ee] p-4 text-[#0d253d] text-[13px] animate-fade-in text-center shadow-sm">
            {success}
          </div>
        )}

        {accounts.length === 0 ? (
          <div className="text-center py-8 space-y-4">
            <p className="text-[14px] text-[#64748d]">You do not have any active accounts to deposit into.</p>
            <Link href="/dashboard" className="inline-flex h-10 items-center justify-center rounded-full bg-[#533afd] px-6 text-[14px] font-[400] text-white hover:bg-[#4434d4] transition-colors shadow-sm">
              Return to Dashboard
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="accountId" className="text-[11px] font-[400] uppercase tracking-[0.06em] text-[#64748d] block">
                Destination Account
              </label>
              <div className="relative">
                <select
                  id="accountId"
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  disabled={processing}
                  className="w-full appearance-none rounded-md border border-[#e3e8ee] bg-white px-4 py-2.5 text-[14px] text-[#0d253d] focus:border-[#533afd] focus:outline-none focus:ring-1 focus:ring-[#533afd] disabled:opacity-50"
                  required
                >
                  {accounts.map((acc) => (
                    <option key={acc.account_id} value={acc.account_id}>
                      {formatAccountType(acc.account_type)} &mdash; {acc.account_number} (Bal: {formatCompactCurrency(acc.balance)})
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[#64748d]">
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>

            {selectedAccount && (
              <div className="rounded-md bg-[#f6f9fc] border border-[#e3e8ee] p-4 flex items-center justify-between gap-4">
                <div>
                  <div className="text-[12px] text-[#64748d]">Selected account</div>
                  <div className="font-mono text-[13px] text-[#0d253d]">{selectedAccount.account_number}</div>
                </div>
                <button
                  type="button"
                  onClick={() => copyAccountNumber(selectedAccount.account_number)}
                  className="text-[12px] text-[#0d253d] underline-offset-4 hover:underline"
                >
                  {copiedAccount === selectedAccount.account_number ? "Copied" : "Copy"}
                </button>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="amount" className="text-[11px] font-[400] uppercase tracking-[0.06em] text-[#64748d] block">
                Amount (NGN)
              </label>
              <input
                id="amount"
                type="number"
                step="0.01"
                placeholder="10000.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={processing}
                className="w-full rounded-md border border-[#e3e8ee] bg-white px-4 py-2.5 text-[15px] text-[#0d253d] font-mono [font-feature-settings:'tnum'] focus:border-[#533afd] focus:outline-none focus:ring-1 focus:ring-[#533afd] disabled:opacity-50"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-[11px] font-[400] uppercase tracking-[0.06em] text-[#64748d] block">
                Reference Memo <span className="text-[#a8c3de] lowercase">(Optional)</span>
              </label>
              <input
                id="description"
                type="text"
                placeholder="e.g. Payroll or Savings"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={processing}
                className="w-full rounded-md border border-[#e3e8ee] bg-white px-4 py-2.5 text-[14px] text-[#0d253d] focus:border-[#533afd] focus:outline-none focus:ring-1 focus:ring-[#533afd] disabled:opacity-50"
              />
            </div>

            <div className="flex gap-3 pt-6 border-t border-[#e3e8ee]">
              <Link
                href="/dashboard"
                className="inline-flex flex-1 h-10 items-center justify-center rounded-full border border-[#e3e8ee] bg-white px-6 text-[14px] font-[400] text-[#0d253d] hover:border-[#a8c3de] hover:bg-[#f6f9fc] transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={processing}
                className="inline-flex flex-1 h-10 items-center justify-center rounded-full bg-[#533afd] px-6 text-[14px] font-[400] text-white hover:bg-[#4434d4] transition-colors shadow-sm disabled:opacity-70 disabled:hover:bg-[#533afd]"
              >
                {processing ? "Processing..." : "Process Deposit"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function DepositPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[50vh] flex-col items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#533afd] border-t-transparent" />
      </div>
    }>
      <DepositContent />
    </Suspense>
  );
}

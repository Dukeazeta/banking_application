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

type RecipientAccount = {
  accountNumber: string;
  accountType: AccountType;
  customerName: string;
};

function TransferContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlFromAccountId = searchParams.get("fromAccountId");

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedFromAccountId, setSelectedFromAccountId] = useState("");
  const [toAccountNumber, setToAccountNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [transactionPin, setTransactionPin] = useState("");
  const [recipient, setRecipient] = useState<RecipientAccount | null>(null);
  const [recipientError, setRecipientError] = useState<string | null>(null);
  const [checkingRecipient, setCheckingRecipient] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

          if (urlFromAccountId && activeAccounts.some((acc: Account) => acc.account_id === parseInt(urlFromAccountId))) {
            setSelectedFromAccountId(urlFromAccountId);
          } else if (activeAccounts.length > 0) {
            setSelectedFromAccountId(activeAccounts[0].account_id.toString());
          }
        }
      } catch (err) {
        console.error("Failed to load accounts for transfer:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAccounts();
  }, [urlFromAccountId]);

  const originAccount = accounts.find(
    (acc) => acc.account_id === parseInt(selectedFromAccountId)
  );

  const copyAccountNumber = async (accountNumber: string) => {
    await navigator.clipboard.writeText(accountNumber);
    setCopiedAccount(accountNumber);
    window.setTimeout(() => setCopiedAccount(null), 1400);
  };

  const validateRecipient = async (accountNumber = toAccountNumber) => {
    const cleanAccountNumber = accountNumber.replace(/\D/g, "").slice(0, 10);

    setRecipient(null);
    setRecipientError(null);

    if (!cleanAccountNumber) {
      return false;
    }

    if (!/^\d{10}$/.test(cleanAccountNumber)) {
      setRecipientError("Enter a 10-digit account number.");
      return false;
    }

    if (originAccount && cleanAccountNumber === originAccount.account_number) {
      setRecipientError("You cannot transfer to the same account.");
      return false;
    }

    setCheckingRecipient(true);

    try {
      const res = await fetch(
        `/api/accounts/lookup?accountNumber=${encodeURIComponent(cleanAccountNumber)}`,
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Recipient account could not be verified.");
      }

      setRecipient(data.account as RecipientAccount);
      return true;
    } catch (err: unknown) {
      setRecipientError(
        err instanceof Error ? err.message : "Recipient account could not be verified.",
      );
      return false;
    } finally {
      setCheckingRecipient(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setProcessing(true);

    if (!selectedFromAccountId || !toAccountNumber || !amount || !transactionPin) {
      setError("Please fill in all required fields.");
      setProcessing(false);
      return;
    }

    const cleanToAccountNumber = toAccountNumber.replace(/\D/g, "").slice(0, 10);
    if (!/^\d{10}$/.test(cleanToAccountNumber)) {
      setError("Destination account number must be exactly 10 digits.");
      setProcessing(false);
      return;
    }

    if (originAccount && cleanToAccountNumber === originAccount.account_number) {
      setError("Forbidden: You cannot transfer funds to the same origin account.");
      setProcessing(false);
      return;
    }

    if (!/^\d{4}$/.test(transactionPin)) {
      setError("Transaction PIN must be exactly 4 digits.");
      setProcessing(false);
      return;
    }

    const numericAmount = parseFloat(amount);
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      setError("Please specify a valid transfer amount greater than zero.");
      setProcessing(false);
      return;
    }

    if (originAccount && numericAmount > parseFloat(originAccount.balance)) {
      setError(
        "Insufficient Funds: Requested transfer of " +
        formatCurrency(numericAmount) +
        " exceeds available balance of " +
        formatCurrency(originAccount.balance) + "."
      );
      setProcessing(false);
      return;
    }

    try {
      const recipientIsValid = await validateRecipient(cleanToAccountNumber);

      if (!recipientIsValid) {
        setProcessing(false);
        return;
      }

      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromAccountId: parseInt(selectedFromAccountId),
          toAccountNumber: cleanToAccountNumber,
          amount: numericAmount,
          description: description || undefined,
          transactionPin,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Transfer failed.");
      }

      setSuccess("Transfer of " + formatCurrency(numericAmount) + " completed successfully!");
      
      setToAccountNumber("");
      setAmount("");
      setDescription("");
      setTransactionPin("");
      setRecipient(null);

      setTimeout(() => {
        router.push(`/dashboard/accounts/${selectedFromAccountId}`);
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
    <div className="space-y-10 font-sans max-w-[920px] mx-auto pb-16">
      {/* Navigation Breadcrumbs */}
      <div className="flex items-center justify-center gap-2 lg:justify-start">
        <Link href="/dashboard" className="text-[13px] font-[400] text-[#64748d] hover:text-[#0d253d] hover:underline transition-colors">
          &larr; Overview
        </Link>
        <span className="text-[13px] text-[#a8c3de]">/</span>
        <span className="text-[13px] text-[#a8c3de]">Transfer</span>
      </div>

      {/* Main Transfer Form Card */}
      <div className="w-full rounded-[16px] bg-white border border-[#e3e8ee] p-6 shadow-[0_8px_24px_rgba(0,55,112,0.08)] sm:p-8">
        <div className="mb-8 space-y-2 text-center lg:text-left">
          <h1 className="text-[26px] font-[300] leading-[1.12] tracking-[-0.26px] text-[#0d253d] [font-feature-settings:'ss01']">
            Transfer Funds
          </h1>
          <p className="text-[13px] text-[#64748d]">
            Send money instantly via account number.
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
            <p className="text-[14px] text-[#64748d]">You do not have any active accounts to transfer funds from.</p>
            <Link href="/dashboard" className="inline-flex h-10 items-center justify-center rounded-full bg-[#533afd] px-6 text-[14px] font-[400] text-white hover:bg-[#4434d4] transition-colors shadow-sm">
              Return to Dashboard
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-2 lg:items-start">
            <div className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="fromAccountId" className="text-[11px] font-[400] uppercase tracking-[0.06em] text-[#64748d] block">
                  Origin Account
                </label>
                <div className="relative">
                  <select
                    id="fromAccountId"
                    value={selectedFromAccountId}
                    onChange={(e) => {
                      setSelectedFromAccountId(e.target.value);
                      setRecipient(null);
                      setRecipientError(null);
                    }}
                    disabled={processing}
                    className="w-full appearance-none rounded-md border border-[#e3e8ee] bg-white px-4 py-2.5 text-[14px] text-[#0d253d] focus:border-[#533afd] focus:outline-none focus:ring-1 focus:ring-[#533afd] disabled:opacity-50"
                    required
                  >
                    {accounts.map((acc) => (
                      <option key={acc.account_id} value={acc.account_id}>
                        {formatAccountType(acc.account_type)} &mdash; {acc.account_number}
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

              {originAccount && (
                <div className="rounded-md bg-[#f6f9fc] border border-[#e3e8ee] p-4 space-y-3">
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-[13px] text-[#64748d]">Available Funding</span>
                    <span className="text-[14px] font-[300] text-[#0d253d] [font-feature-settings:'tnum']">
                      {formatCurrency(originAccount.balance)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-t border-[#e3e8ee] pt-3">
                    <span className="font-mono text-[13px] text-[#0d253d]">{originAccount.account_number}</span>
                    <button
                      type="button"
                      onClick={() => copyAccountNumber(originAccount.account_number)}
                      className="text-[12px] text-[#0d253d] underline-offset-4 hover:underline"
                    >
                      {copiedAccount === originAccount.account_number ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="toAccountNumber" className="text-[11px] font-[400] uppercase tracking-[0.06em] text-[#64748d] block">
                  Target Account Number
                </label>
                <input
                  id="toAccountNumber"
                  type="text"
                  placeholder="10-digit account number"
                  value={toAccountNumber}
                  inputMode="numeric"
                  maxLength={10}
                  onBlur={() => {
                    if (toAccountNumber.length === 10) {
                      void validateRecipient();
                    }
                  }}
                  onChange={(e) => {
                    const cleanValue = e.target.value.replace(/\D/g, "").slice(0, 10);
                    setToAccountNumber(cleanValue);
                    setRecipient(null);
                    setRecipientError(null);
                  }}
                  disabled={processing}
                  className="w-full rounded-md border border-[#e3e8ee] bg-white px-4 py-2.5 text-[15px] text-[#0d253d] font-mono tracking-widest focus:border-[#533afd] focus:outline-none focus:ring-1 focus:ring-[#533afd] disabled:opacity-50"
                  required
                />
                {checkingRecipient && (
                  <p className="text-[12px] text-[#64748d]">Checking recipient...</p>
                )}
                {recipientError && (
                  <p className="text-[12px] text-[#ea2261]">{recipientError}</p>
                )}
                {recipient && (
                  <div className="rounded-md border border-[#d6f0df] bg-[#f4fbf6] p-4 text-[13px] text-[#0d253d]">
                    <div className="font-[500]">{recipient.customerName}</div>
                    <div className="mt-1 text-[#64748d]">
                      {formatAccountType(recipient.accountType)} - {recipient.accountNumber}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
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
                  placeholder="e.g. Rent or Split expense"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={processing}
                  className="w-full rounded-md border border-[#e3e8ee] bg-white px-4 py-2.5 text-[14px] text-[#0d253d] focus:border-[#533afd] focus:outline-none focus:ring-1 focus:ring-[#533afd] disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="transactionPin" className="text-[11px] font-[400] uppercase tracking-[0.06em] text-[#64748d] block">
                  Transaction PIN
                </label>
                <input
                  id="transactionPin"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="4-digit PIN"
                  value={transactionPin}
                  onChange={(e) => setTransactionPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  disabled={processing}
                  className="w-full rounded-md border border-[#e3e8ee] bg-white px-4 py-2.5 text-[15px] text-[#0d253d] font-mono tracking-widest focus:border-[#533afd] focus:outline-none focus:ring-1 focus:ring-[#533afd] disabled:opacity-50"
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 pt-6 border-t border-[#e3e8ee] lg:col-span-2">
              <Link
                href="/dashboard"
                className="inline-flex flex-1 h-10 items-center justify-center rounded-full border border-[#e3e8ee] bg-white px-6 text-[14px] font-[400] text-[#0d253d] hover:border-[#a8c3de] hover:bg-[#f6f9fc] transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={processing || checkingRecipient}
                className="inline-flex flex-1 h-10 items-center justify-center rounded-full bg-[#533afd] px-6 text-[14px] font-[400] text-white hover:bg-[#4434d4] transition-colors shadow-sm disabled:opacity-70 disabled:hover:bg-[#533afd]"
              >
                {processing ? "Processing..." : "Transfer"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function TransferPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[50vh] flex-col items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#533afd] border-t-transparent" />
      </div>
    }>
      <TransferContent />
    </Suspense>
  );
}

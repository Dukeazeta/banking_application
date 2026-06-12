"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";

function TellerDepositContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlAccountNumber = searchParams.get("accountNumber") || "";

  const [accountNumber, setAccountNumber] = useState(urlAccountNumber);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setProcessing(true);

    if (!accountNumber || !amount) {
      setError("Please specify the destination account and deposit amount.");
      setProcessing(false);
      return;
    }

    if (accountNumber.length !== 10) {
      setError("Account number must be exactly 10 digits.");
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
          accountNumber,
          amount: numericAmount,
          description: description || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Deposit failed.");
      }

      setSuccess("Deposit of " + formatCurrency(numericAmount) + " completed successfully!");
      
      setAccountNumber("");
      setAmount("");
      setDescription("");

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

  return (
    <div className="space-y-10 font-sans max-w-[500px] mx-auto pb-16">
      
      {/* Navigation Breadcrumbs */}
      <div className="flex items-center justify-center gap-2">
        <Link href="/teller" className="text-[13px] font-[400] text-[#64748d] hover:text-[#0d253d] hover:underline transition-colors">
          &larr; Lookup
        </Link>
        <span className="text-[13px] text-[#a8c3de]">/</span>
        <span className="text-[13px] text-[#a8c3de]">Process Deposit</span>
      </div>

      {/* Main Deposit Form Card */}
      <div className="w-full rounded-[16px] bg-white border border-[#e3e8ee] p-8 shadow-[0_8px_24px_rgba(0,55,112,0.08)]">
        <div className="mb-8 space-y-2 text-center">
          <h1 className="text-[26px] font-[300] leading-[1.12] tracking-[-0.26px] text-[#0d253d] [font-feature-settings:'ss01']">
            Teller Deposit
          </h1>
          <p className="text-[13px] text-[#64748d]">
            Process a cash deposit for a customer.
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

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="accountNumber" className="text-[11px] font-[400] uppercase tracking-[0.06em] text-[#64748d] block">
              Destination Account Number
            </label>
            <input
              id="accountNumber"
              type="text"
              maxLength={10}
              placeholder="0123456789"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              disabled={processing}
              className="w-full rounded-md border border-[#e3e8ee] bg-white px-4 py-2.5 text-[15px] text-[#0d253d] font-mono tracking-widest focus:border-[#533afd] focus:outline-none focus:ring-1 focus:ring-[#533afd] disabled:opacity-50"
              required
            />
          </div>

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
              placeholder="e.g. Branch Cash Deposit"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={processing}
              className="w-full rounded-md border border-[#e3e8ee] bg-white px-4 py-2.5 text-[14px] text-[#0d253d] focus:border-[#533afd] focus:outline-none focus:ring-1 focus:ring-[#533afd] disabled:opacity-50"
            />
          </div>

          <div className="flex gap-3 pt-6 border-t border-[#e3e8ee]">
            <button
              type="submit"
              disabled={processing}
              className="inline-flex flex-1 h-10 items-center justify-center rounded-full bg-[#533afd] px-6 text-[14px] font-[400] text-white hover:bg-[#4434d4] transition-colors shadow-sm disabled:opacity-70 disabled:hover:bg-[#533afd]"
            >
              {processing ? "Processing..." : "Process Deposit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TellerDepositPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[50vh] flex-col items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#533afd] border-t-transparent" />
      </div>
    }>
      <TellerDepositContent />
    </Suspense>
  );
}

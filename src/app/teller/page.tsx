"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";

type AccountLookupResult = {
  accountNumber: string;
  accountType: "SAVINGS" | "CURRENT";
  holderName: string;
  status: "ACTIVE" | "CLOSED" | "FROZEN";
};

type TellerTransactionRow = {
  transaction_id: number;
  transaction_reference: string;
  account_number: string;
  first_name: string;
  last_name: string;
  amount: string;
  status: "SUCCESS" | "FAILED";
  created_at: string;
};

export default function TellerLookupPage() {
  const [accountNumber, setAccountNumber] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AccountLookupResult | null>(null);

  const [history, setHistory] = useState<TellerTransactionRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch("/api/teller/transactions");
        if (res.ok) {
          const data = await res.json();
          setHistory(data.transactions || []);
        }
      } catch (err) {
        console.error("Failed to load history:", err);
      } finally {
        setHistoryLoading(false);
      }
    }
    fetchHistory();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (accountNumber.length !== 10) {
      setError("Account number must be exactly 10 digits.");
      return;
    }
    
    setError(null);
    setResult(null);
    setSearching(true);

    try {
      const res = await fetch(`/api/teller/accounts/lookup?accountNumber=${accountNumber}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to lookup account");
      }
      setResult(data.account);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred.");
      }
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-10 font-sans max-w-[1200px] mx-auto pb-16 px-6">
      <div className="flex items-center justify-center gap-2">
        <span className="text-[13px] text-[#a8c3de]">Operations</span>
        <span className="text-[13px] text-[#a8c3de]">/</span>
        <span className="text-[13px] text-[#0d253d]">Teller Desk</span>
      </div>

      <div className="flex flex-col gap-16">
        
        {/* Lookup Section */}
        <div className="w-full max-w-[640px] mx-auto rounded-[16px] bg-white border border-[#e3e8ee] p-8 shadow-[0_8px_24px_rgba(0,55,112,0.08)]">
          <div className="mb-8 space-y-2 text-center">
            <h1 className="text-[26px] font-[300] leading-[1.12] tracking-[-0.26px] text-[#0d253d] [font-feature-settings:'ss01']">
              Account Lookup
            </h1>
            <p className="text-[13px] text-[#64748d]">
              Search for an active customer account.
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-md bg-[#fef2f1] border border-[#ea2261]/20 p-4 text-[#ea2261] text-[13px] animate-fade-in text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSearch} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="accountNumber" className="text-[11px] font-[400] uppercase tracking-[0.06em] text-[#64748d] block">
                Account Number
              </label>
              <div className="flex gap-3">
                <input
                  id="accountNumber"
                  type="text"
                  maxLength={10}
                  placeholder="0123456789"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  disabled={searching}
                  className="w-full rounded-md border border-[#e3e8ee] bg-white px-4 py-2.5 text-[15px] text-[#0d253d] font-mono tracking-widest focus:border-[#533afd] focus:outline-none focus:ring-1 focus:ring-[#533afd] disabled:opacity-50"
                  required
                />
                <button
                  type="submit"
                  disabled={searching}
                  className="inline-flex h-11 items-center justify-center rounded-md bg-[#533afd] px-6 text-[14px] font-[400] text-white hover:bg-[#4434d4] transition-colors shadow-sm disabled:opacity-70 disabled:hover:bg-[#533afd]"
                >
                  {searching ? "Searching..." : "Search"}
                </button>
              </div>
            </div>
          </form>

          {result && (
            <div className="mt-8 animate-fade-in border-t border-[#e3e8ee] pt-6 space-y-4">
              <h2 className="text-[11px] font-[400] uppercase tracking-[0.06em] text-[#64748d]">
                Result
              </h2>
              
              <div className="rounded-[12px] border border-[#e3e8ee] bg-[#f6f9fc] p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[16px] font-[400] text-[#0d253d]">{result.holderName}</p>
                    <p className="text-[13px] text-[#64748d] uppercase mt-1">{result.accountType} &bull; <span className="font-mono text-[#0d253d] tracking-widest">{result.accountNumber}</span></p>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-[500] uppercase tracking-[0.04em] ${
                    result.status === "ACTIVE" ? "bg-[#e5fcf5] text-[#006e54]" :
                    result.status === "FROZEN" ? "bg-[#fff0e6] text-[#b35900]" :
                    "bg-[#fef2f1] text-[#ea2261]"
                  }`}>
                    {result.status}
                  </span>
                </div>
              </div>

              {result.status === "ACTIVE" && (
                <div className="pt-2">
                  <Link
                    href={`/teller/deposit?accountNumber=${result.accountNumber}`}
                    className="flex w-full h-11 items-center justify-center rounded-full bg-white border border-[#e3e8ee] text-[14px] font-[400] text-[#0d253d] hover:border-[#533afd] hover:text-[#533afd] hover:bg-[#f6f9fc] transition-colors"
                  >
                    Process Deposit
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* History Section */}
        <div className="w-full rounded-[16px] bg-white border border-[#e3e8ee] shadow-[0_4px_12px_rgba(0,55,112,0.04)] overflow-hidden">
          <div className="px-6 py-5 border-b border-[#e3e8ee] flex justify-between items-center bg-[#fafafc]">
            <h2 className="text-[14px] font-[400] text-[#0d253d] [font-feature-settings:'ss01']">Recent Deposits</h2>
            {historyLoading && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#e3e8ee] border-t-[#533afd]" />
            )}
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-[#f6f9fc] border-b border-[#e3e8ee] text-[11px] font-[400] uppercase tracking-[0.06em] text-[#64748d]">
                <tr>
                  <th className="px-6 py-4 font-normal">Date</th>
                  <th className="px-6 py-4 font-normal">Time</th>
                  <th className="px-6 py-4 font-normal">Customer</th>
                  <th className="px-6 py-4 font-normal">Account</th>
                  <th className="px-6 py-4 font-normal text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e3e8ee]">
                {history.map((txn) => (
                  <tr key={txn.transaction_id} className="hover:bg-[#fef2f1]/20 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-[#64748d] font-mono text-[12px]">
                      {new Date(txn.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[#64748d] font-mono text-[12px]">
                      {new Date(txn.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-[#0d253d] font-[400]">{txn.last_name}, {txn.first_name}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-[#64748d] font-mono text-[12px]">{txn.account_number}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-[#0d253d] [font-feature-settings:'tnum']">
                      {formatCurrency(parseFloat(txn.amount || "0"))}
                    </td>
                  </tr>
                ))}
                {!historyLoading && history.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-[#64748d]">
                      You haven't processed any deposits yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

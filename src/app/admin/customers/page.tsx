"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/format";

type AdminCustomerRow = {
  customer_id: number;
  first_name: string;
  last_name: string;
  email: string;
  total_accounts: number;
  total_balance: string;
  account_numbers: string | null;
};

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<AdminCustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchCustomers() {
      try {
        const res = await fetch("/api/customers");
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to load customers");
        }
        setCustomers(data.customers || []);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("An unknown error occurred.");
        }
      } finally {
        setLoading(false);
      }
    }
    fetchCustomers();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#533afd] border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-[#fef2f1] border border-[#ea2261]/20 p-4 text-[#ea2261] text-[13px] animate-fade-in text-center max-w-[500px] mx-auto">
        {error}
      </div>
    );
  }

  const filteredCustomers = customers.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.first_name.toLowerCase().includes(q) ||
      c.last_name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.account_numbers && c.account_numbers.includes(q))
    );
  });

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-[300] tracking-[-0.26px] text-[#0d253d] [font-feature-settings:'ss01']">
            Customer Directory
          </h1>
          <p className="mt-1 text-[14px] text-[#64748d]">
            View all registered customers and their aggregated balances.
          </p>
        </div>
        <div className="w-full sm:max-w-xs relative">
          <input
            type="text"
            placeholder="Search by name, email, or account..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-full border border-[#e3e8ee] bg-white pl-10 pr-4 py-2 text-[14px] text-[#0d253d] focus:border-[#533afd] focus:outline-none focus:ring-1 focus:ring-[#533afd] transition-colors"
          />
          <svg className="absolute left-3.5 top-2.5 h-4 w-4 text-[#64748d]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      <div className="rounded-[16px] bg-white border border-[#e3e8ee] shadow-[0_4px_12px_rgba(0,55,112,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-[#f6f9fc] border-b border-[#e3e8ee] text-[11px] font-[400] uppercase tracking-[0.06em] text-[#64748d]">
              <tr>
                <th className="px-6 py-4 font-normal">Customer Name</th>
                <th className="px-6 py-4 font-normal">Email Address</th>
                <th className="px-6 py-4 font-normal">Total Accounts</th>
                <th className="px-6 py-4 font-normal text-right">Aggregated Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e3e8ee]">
              {filteredCustomers.map((cust) => (
                <tr key={cust.customer_id} className="hover:bg-[#f6f9fc]/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-[#0d253d] font-[400]">
                    {cust.last_name}, {cust.first_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-[#64748d]">
                    {cust.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-[#0d253d]">
                    {cust.total_accounts}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-[#0d253d] [font-feature-settings:'tnum']">
                    {formatCurrency(parseFloat(cust.total_balance || "0"))}
                  </td>
                </tr>
              ))}
              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-[#64748d]">
                    {searchQuery ? "No customers found matching your search." : "No customers found in the system."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/format";

type FailedLogRow = {
  log_id: number;
  attempted_by: string;
  source_account: string;
  target_account: string | null;
  transaction_type: string;
  attempted_amount: string;
  failure_reason: string;
  created_at: string;
};

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<FailedLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const res = await fetch("/api/failed-logs");
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to load logs");
        }
        setLogs(data.failedLogs || []);
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
    fetchLogs();
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

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-[26px] font-[300] tracking-[-0.26px] text-[#0d253d] [font-feature-settings:'ss01']">
          Security Logs
        </h1>
        <p className="mt-1 text-[14px] text-[#64748d]">
          Audit trail of all failed transactions across the platform.
        </p>
      </div>

      <div className="rounded-[16px] bg-white border border-[#e3e8ee] shadow-[0_4px_12px_rgba(0,55,112,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-[#f6f9fc] border-b border-[#e3e8ee] text-[11px] font-[400] uppercase tracking-[0.06em] text-[#64748d]">
              <tr>
                <th className="px-6 py-4 font-normal">Timestamp</th>
                <th className="px-6 py-4 font-normal">Type</th>
                <th className="px-6 py-4 font-normal">Source &rarr; Target</th>
                <th className="px-6 py-4 font-normal text-right">Attempted Amount</th>
                <th className="px-6 py-4 font-normal">Failure Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e3e8ee]">
              {logs.map((log) => (
                <tr key={log.log_id} className="hover:bg-[#fef2f1]/50 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap text-[#64748d] font-mono text-[12px]">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center rounded-full bg-[#f6f9fc] px-2.5 py-0.5 text-[10px] font-[500] uppercase tracking-[0.04em] text-[#0d253d] border border-[#e3e8ee]">
                      {log.transaction_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[#0d253d] text-[12px]">{log.source_account}</span>
                      {log.target_account && (
                        <>
                          <span className="text-[#a8c3de]">&rarr;</span>
                          <span className="font-mono text-[#0d253d] text-[12px]">{log.target_account}</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-[#0d253d] [font-feature-settings:'tnum']">
                    {formatCurrency(parseFloat(log.attempted_amount || "0"))}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex text-[12px] text-[#ea2261] group-hover:bg-[#fef2f1] rounded px-1 transition-colors">
                      {log.failure_reason}
                    </span>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[#64748d]">
                    No failed transactions recorded.
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

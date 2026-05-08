"use client";

import { useEffect, useState } from "react";
import { fetchSyncHistory, SyncHistoryItem } from "@/lib/admin-sync";
import { toast } from "sonner";

function StatusBadge({ status }: { status: SyncHistoryItem["status"] }) {
  const mapping = {
    SUCCESS: "border-[#103c2540] bg-[#103c2512] text-[#103c25]",
    PROCESSING: "border-[#f0b42940] bg-[#f0b42912] text-[#b36b00]",
    FAILED: "border-[#9e0a0a40] bg-[#9e0a0a12] text-[#9e0a0a]",
  } as const;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${mapping[status]}`}
    >
      {status}
    </span>
  );
}

export default function AdminCsvSyncPage() {
  const [items, setItems] = useState<SyncHistoryItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeError, setActiveError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchSyncHistory()
      .then((data) => setItems(data))
      .catch((err) => toast.error(err?.message || "Unable to load history"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="rounded-[20px] border p-4">
        <h2 className="text-lg font-semibold">Sync History</h2>
        <p className="text-sm text-[#62625b]">
          Monitor CSV files processed by the nightly sync job.
        </p>
      </div>

      <div className="mt-4 rounded-[20px] border bg-white p-4">
        {loading ? (
          <p className="text-sm text-[#62625b]">Loading...</p>
        ) : items && items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="text-left text-xs text-[#62625b]">
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">File name</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Records</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className="border-t">
                    <td className="px-3 py-3 text-sm text-[#211922]">
                      {new Date(it.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-sm text-[#211922]">
                      <div className="font-medium">{it.filename}</div>
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={it.status} />
                    </td>
                    <td className="px-3 py-3 text-sm">
                      {it.totalRecordsProcessed}
                    </td>
                    <td className="px-3 py-3 text-sm text-[#62625b]">
                      {it.errorMessage ? (
                        <button
                          className="text-xs font-semibold text-[#e60023] underline"
                          onClick={() => setActiveError(it.errorMessage)}
                        >
                          See error
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-[#62625b]">No sync history found.</p>
        )}
      </div>

      {activeError ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setActiveError(null)}
          />
          <div className="relative z-10 w-[min(96vw,700px)] rounded-lg bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold">Error details</h3>
            <pre className="mt-4 max-h-[60vh] overflow-auto whitespace-pre-wrap text-sm text-[#211922]">
              {activeError}
            </pre>
            <div className="mt-6 flex justify-end">
              <button
                className="rounded-2xl border px-4 py-2 text-sm"
                onClick={() => setActiveError(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { IconDownload, IconRefresh } from "@tabler/icons-react";

export type TransactionRow = {
  id: string;
  type: string;
  description: string | null;
  amount: string;
  status: string;
  createdAt: string;
};

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "SUCCESSFUL":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-900/40 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Success
        </span>
      );
    case "PENDING":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-900/40 px-2.5 py-0.5 text-xs font-medium text-amber-400">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          Processing
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-zinc-400">
          <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
          {status}
        </span>
      );
  }
}

const formatInr = (value: string | number) => {
  const num = typeof value === "number" ? value : Number.parseFloat(value);
  if (!Number.isFinite(num)) return "₹0.00";
  return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

export function TransactionHistory({ rows }: { rows: TransactionRow[] }) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();

  function handleDownload() {
    if (rows.length === 0) return;

    const header = ["#", "Description", "Amount", "Date", "Status", "Type"];
    const csvRows = rows.map((txn, idx) => [
      idx + 1,
      `"${(txn.description || txn.type).replace(/"/g, '""')}"`,
      txn.amount,
      formatDate(txn.createdAt),
      txn.status,
      txn.type.replaceAll("_", " "),
    ]);
    const csv = [header.join(","), ...csvRows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleRefresh() {
    startRefresh(() => {
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle>Transaction History</CardTitle>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownload}
            disabled={rows.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
          >
            <IconDownload className="h-3.5 w-3.5" />
            Download
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-violet-700 disabled:opacity-60"
          >
            <IconRefresh className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No transactions yet. Activity will appear here.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[600px] w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                  <th className="pb-3 pr-4">#</th>
                  <th className="pb-3 pr-4">Description</th>
                  <th className="pb-3 pr-4">Amount</th>
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Type</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((txn, idx) => (
                  <tr key={txn.id} className="border-b border-border/50 last:border-0">
                    <td className="py-3 pr-4 tabular-nums text-muted-foreground">{idx + 1}</td>
                    <td className="py-3 pr-4">
                      <p className="max-w-[200px] truncate font-medium">{txn.description || txn.type}</p>
                    </td>
                    <td className="py-3 pr-4 tabular-nums font-medium">{formatInr(txn.amount)}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{formatDate(txn.createdAt)}</td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={txn.status} />
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant="outline" className="text-xs">
                        {txn.type.replace("_", " ")}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

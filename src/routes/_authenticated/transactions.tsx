import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download } from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";

export const Route = createFileRoute("/_authenticated/transactions")({ component: TxPage });

function TxPage() {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("__all");

  const { data = [], isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_transactions")
        .select("id, action, quantity, notes, created_at, products(name, product_id)")
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data as any[]).filter((r) => {
      if (actionFilter !== "__all" && r.action !== actionFilter) return false;
      if (q && ![r.products?.name, r.products?.product_id, r.notes].some((v: any) => v?.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [data, search, actionFilter]);

  const exportExcel = () => {
    const xrows = rows.map((r: any) => ({
      Date: format(new Date(r.created_at), "yyyy-MM-dd HH:mm"),
      "Product ID": r.products?.product_id, Product: r.products?.name,
      Action: r.action, Quantity: r.quantity, Notes: r.notes,
    }));
    const ws = XLSX.utils.json_to_sheet(xrows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transactions");
    XLSX.writeFile(wb, `transactions-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t("transactions")}</h1>
        <Button variant="outline" onClick={exportExcel}><Download className="h-4 w-4 me-2" />{t("export_transactions")}</Button>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <Input placeholder={t("search")} value={search} onChange={(e) => setSearch(e.target.value)} className="sm:col-span-2" />
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All</SelectItem>
                <SelectItem value="in">{t("in")}</SelectItem>
                <SelectItem value="out">{t("out")}</SelectItem>
                <SelectItem value="adjust">{t("adjust")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("date")}</TableHead>
                  <TableHead>{t("product")}</TableHead>
                  <TableHead>{t("action")}</TableHead>
                  <TableHead className="text-end">{t("quantity")}</TableHead>
                  <TableHead>{t("notes")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">{t("loading")}</TableCell></TableRow>
                ) : rows.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">—</TableCell></TableRow>
                ) : rows.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{format(new Date(r.created_at), "yyyy-MM-dd HH:mm")}</TableCell>
                    <TableCell>
                      <div className="font-medium">{r.products?.name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground font-mono">{r.products?.product_id}</div>
                    </TableCell>
                    <TableCell>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.action === "in" ? "bg-success/15 text-success" : r.action === "out" ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground"}`}>
                        {t(r.action)}
                      </span>
                    </TableCell>
                    <TableCell className="text-end font-mono">{r.action === "in" ? "+" : r.action === "out" ? "−" : "="}{r.quantity}</TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-muted-foreground">{r.notes || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

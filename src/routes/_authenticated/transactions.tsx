import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useRole } from "@/hooks/use-auth";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Download, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export const Route = createFileRoute("/_authenticated/transactions")({ component: TxPage });

type Tx = {
  id: string;
  action: "in" | "out" | "adjust";
  quantity: number;
  notes: string | null;
  created_at: string;
  product_id_fk: string;
  products: { name: string; product_id: string } | null;
};

function TxPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { data: role } = useRole(user?.id);
  const isAdmin = role?.isAdmin ?? false;
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("__all");
  const [toDelete, setToDelete] = useState<Tx | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_transactions")
        .select("id, action, quantity, notes, created_at, product_id, products(name, product_id)")
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data ?? []).map((r: any) => ({ ...r, product_id_fk: r.product_id })) as Tx[];
    },
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((r) => {
      if (actionFilter !== "__all" && r.action !== actionFilter) return false;
      if (q && ![r.products?.name, r.products?.product_id, r.notes].some((v: any) => v?.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [data, search, actionFilter]);

  const deleteTx = useMutation({
    mutationFn: async (tx: Tx) => {
      const { error: delErr } = await supabase.from("stock_transactions").delete().eq("id", tx.id);
      if (delErr) throw delErr;

      if (tx.action !== "adjust") {
        const reverseQty = tx.action === "in" ? -tx.quantity : tx.quantity;
        const { error: updErr } = await supabase.rpc("adjust_stock_delta", {
          p_product_id: tx.product_id_fk,
          p_delta: reverseQty,
        });
        if (updErr) {
          const { error: fallback } = await supabase
            .from("products")
            .select("id, stock_quantity")
            .eq("id", tx.product_id_fk)
            .single()
            .then(async ({ data: p, error: fetchErr }) => {
              if (fetchErr || !p) return { error: fetchErr };
              const next = Math.max(0, Number(p.stock_quantity) + reverseQty);
              return supabase.from("products").update({ stock_quantity: next }).eq("id", tx.product_id_fk);
            });
          if (fallback) throw fallback;
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["products-summary"] });
      qc.invalidateQueries({ queryKey: ["recent-tx"] });
      toast.success("Transaction deleted and stock reversed");
      setToDelete(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const exportExcel = () => {
    const xrows = rows.map((r) => ({
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
            <Table className="[&_th:not(:last-child)]:border-r-2 [&_td:not(:last-child)]:border-r-2 [&_th]:border-border [&_td]:border-border">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("date")}</TableHead>
                  <TableHead>{t("product")}</TableHead>
                  <TableHead>{t("action")}</TableHead>
                  <TableHead className="text-end">{t("quantity")}</TableHead>
                  <TableHead>{t("notes")}</TableHead>
                  {isAdmin && <TableHead className="w-12" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={isAdmin ? 6 : 5} className="text-center py-10 text-muted-foreground">{t("loading")}</TableCell></TableRow>
                ) : rows.length === 0 ? (
                  <TableRow><TableCell colSpan={isAdmin ? 6 : 5} className="text-center py-10 text-muted-foreground">—</TableCell></TableRow>
                ) : rows.map((r) => (
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
                    {isAdmin && (
                      <TableCell className="text-center">
                        <Button size="icon" variant="ghost" onClick={() => setToDelete(r)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete && (
                <>
                  This will permanently delete the <strong>{toDelete.action === "in" ? "stock-in" : toDelete.action === "out" ? "stock-out" : "adjustment"}</strong> of{" "}
                  <strong>{toDelete.quantity}</strong> units for <strong>{toDelete.products?.name ?? "this product"}</strong>.
                  {toDelete.action !== "adjust" && (
                    <> The stock quantity will be <strong>reversed</strong> automatically.</>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => toDelete && deleteTx.mutate(toDelete)}
              disabled={deleteTx.isPending}
            >
              {deleteTx.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

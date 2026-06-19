import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useAuth, useRole } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, ArrowUpDown, Download, Upload, ArrowDownToLine, ArrowUpFromLine, AlertTriangle, X } from "lucide-react";
import { ProductDialog } from "@/components/product-dialog";
import { StockDialog } from "@/components/stock-dialog";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/products")({
  component: ProductsPage,
  validateSearch: (s: Record<string, unknown>) => ({ low: s.low === "1" || s.low === 1 || s.low === true ? 1 : undefined }),
});

type Product = {
  id: string; product_id: string; name: string; category: string | null;
  supplier: string | null; unit_price: number; stock_quantity: number;
  min_stock_level: number; notes: string | null;
};

function ProductsPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { data: role } = useRole(user?.id);
  const isAdmin = role?.isAdmin ?? false;
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { low } = Route.useSearch();
  const lowOnly = low === 1;
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("__all");
  const [supplier, setSupplier] = useState<string>("__all");
  const [sortKey, setSortKey] = useState<keyof Product>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [stockTarget, setStockTarget] = useState<{ product: Product; action: "in" | "out" } | null>(null);
  const [toDelete, setToDelete] = useState<Product | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("name");
      if (error) throw error;
      return data as Product[];
    },
  });

  const categories = useMemo(() => Array.from(new Set(products.map((p) => p.category).filter(Boolean))) as string[], [products]);
  const suppliers = useMemo(() => Array.from(new Set(products.map((p) => p.supplier).filter(Boolean))) as string[], [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let r = products.filter((p) => {
      if (lowOnly && p.stock_quantity > p.min_stock_level) return false;
      if (category !== "__all" && p.category !== category) return false;
      if (supplier !== "__all" && p.supplier !== supplier) return false;
      if (q && ![p.name, p.product_id, p.category, p.supplier].some((v) => v?.toLowerCase().includes(q))) return false;
      return true;
    });
    r = [...r].sort((a, b) => {
      const av = a[sortKey] as any, bv = b[sortKey] as any;
      if (av == null) return 1; if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av;
      return sortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return r;
  }, [products, search, category, supplier, sortKey, sortDir, lowOnly]);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const sortBy = (key: keyof Product) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const exportExcel = () => {
    const rows = filtered.map((p) => ({
      "Product ID": p.product_id, Name: p.name, Category: p.category, Supplier: p.supplier,
      "Unit Price": p.unit_price, "Stock Quantity": p.stock_quantity,
      "Min Stock Level": p.min_stock_level, Notes: p.notes,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    XLSX.writeFile(wb, `inventory-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleImport = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: null });
      const mapped = rows.map((r) => ({
        product_id: String(r["Product ID"] ?? r["product_id"] ?? r["ID"] ?? r["Part Number"] ?? "").trim(),
        name: String(r["Name"] ?? r["name"] ?? r["Description"] ?? "").trim(),
        category: r["Category"] ?? r["category"] ?? null,
        supplier: r["Supplier"] ?? r["supplier"] ?? null,
        unit_price: Number(r["Unit Price"] ?? r["unit_price"] ?? 0) || 0,
        stock_quantity: Number(r["Stock Quantity"] ?? r["Qty"] ?? r["Quantity"] ?? 0) || 0,
        min_stock_level: Number(r["Min Stock Level"] ?? r["min_stock_level"] ?? 0) || 0,
        notes: r["Notes"] ?? r["notes"] ?? null,
        created_by: user?.id ?? null,
      })).filter((r) => r.product_id && r.name);

      if (!mapped.length) return toast.error("No valid rows found. Required columns: Product ID, Name.");
      const { error } = await supabase.from("products").upsert(mapped, { onConflict: "product_id" });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success(`Imported ${mapped.length} products`);
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t("products")}</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportExcel}><Download className="h-4 w-4 me-2" />{t("export_excel")}</Button>
          {isAdmin && (
            <>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])} />
              <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4 me-2" />{t("import_excel")}</Button>
              <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4 me-2" />{t("add_product")}</Button>
            </>
          )}
        </div>
      </div>

      {lowOnly && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-warning/40 bg-warning/10 px-4 py-2.5 text-sm">
          <div className="flex items-center gap-2 text-warning">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-medium">Showing low stock only</span>
          </div>
          <Button size="sm" variant="ghost" onClick={() => navigate({ to: "/products", search: {} })}>
            <X className="h-4 w-4 me-1" /> Clear
          </Button>
        </div>
      )}


      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <Input placeholder={t("search")} value={search} onChange={(e) => setSearch(e.target.value)} className="sm:col-span-2" />
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder={t("all_categories")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">{t("all_categories")}</SelectItem>
                {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={supplier} onValueChange={setSupplier}>
              <SelectTrigger><SelectValue placeholder={t("supplier")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">{t("supplier")}</SelectItem>
                {suppliers.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <Table className="[&_th:not(:last-child)]:border-r-2 [&_td:not(:last-child)]:border-r-2 [&_th]:border-border [&_td]:border-border">
              <TableHeader>
                <TableRow>
                  <TH onClick={() => sortBy("name")}>{t("name")}</TH>
                  <TH onClick={() => sortBy("category")}>{t("category")}</TH>
                  <TH onClick={() => sortBy("product_id")}>{t("product_id")}</TH>
                  <TH onClick={() => sortBy("supplier")}>{t("supplier")}</TH>
                  <TH onClick={() => sortBy("unit_price")} className="text-end">{t("unit_price")}</TH>
                  <TH onClick={() => sortBy("stock_quantity")} className="text-end">{t("quantity")}</TH>
                  <TableHead className="text-end">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border">
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">{t("loading")}</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">{t("no_products")}</TableCell></TableRow>
                ) : filtered.map((p) => {
                  const low = p.stock_quantity <= p.min_stock_level;
                  return (
                    <TableRow key={p.id} className="border-b last:border-b-0">
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 group/cat">
                          <span>{p.category || "—"}</span>
                          {isAdmin && p.category && (
                            <button
                              type="button"
                              title="Clear category"
                              className="opacity-0 group-hover/cat:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                              onClick={async () => {
                                const { error } = await supabase.from("products").update({ category: null }).eq("id", p.id);
                                if (error) toast.error(error.message);
                                else qc.invalidateQueries({ queryKey: ["products"] });
                              }}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono font-medium">{p.product_id}</TableCell>
                      <TableCell>{p.supplier || "—"}</TableCell>
                      <TableCell className="text-end font-mono">{Number(p.unit_price).toFixed(2)}</TableCell>
                      <TableCell className="text-end">
                        <span className={`font-mono ${low ? "text-warning font-semibold" : ""}`}>{p.stock_quantity}</span>
                      </TableCell>
                      <TableCell className="text-end">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" title={t("stock_in")} onClick={() => setStockTarget({ product: p, action: "in" })}><ArrowDownToLine className="h-4 w-4 text-success" /></Button>
                          <Button size="icon" variant="ghost" title={t("stock_out")} onClick={() => setStockTarget({ product: p, action: "out" })}><ArrowUpFromLine className="h-4 w-4 text-destructive" /></Button>
                          {isAdmin && <>
                            <Button size="icon" variant="ghost" onClick={() => setEditing(p)}><Pencil className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => setToDelete(p)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </>}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ProductDialog open={creating} onOpenChange={setCreating} />
      <ProductDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} product={editing ?? undefined} />
      {stockTarget && <StockDialog
        open={!!stockTarget}
        onOpenChange={(o: boolean) => !o && setStockTarget(null)}
        product={stockTarget.product}
        action={stockTarget.action}
      />}

      <AlertDialog open={!!toDelete} onOpenChange={(o: boolean) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirm_delete")}</AlertDialogTitle>
            <AlertDialogDescription>{toDelete?.name}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (toDelete) del.mutate(toDelete.id); setToDelete(null); }}>{t("delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TH({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
  return (
    <TableHead className={className}>
      <button type="button" onClick={onClick} className="inline-flex items-center gap-1 font-medium hover:text-foreground">
        {children}<ArrowUpDown className="h-3 w-3 opacity-50" />
      </button>
    </TableHead>
  );
}

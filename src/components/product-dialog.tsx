import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Product = {
  id: string; product_id: string; name: string; category: string | null;
  supplier: string | null; unit_price: number; buy_price: number; stock_quantity: number;
  min_stock_level: number; notes: string | null;
};

const empty = { product_id: "", name: "", category: "", supplier: "", unit_price: 0, buy_price: 0, stock_quantity: 0, min_stock_level: 0, notes: "" };

export function ProductDialog({ open, onOpenChange, product }: { open: boolean; onOpenChange: (o: boolean) => void; product?: Product }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState<any>(empty);

  useEffect(() => {
    if (product) setForm({ ...product, category: product.category ?? "", supplier: product.supplier ?? "", notes: product.notes ?? "" });
    else setForm(empty);
  }, [product, open]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        product_id: form.product_id.trim(),
        name: form.name.trim(),
        category: form.category || null,
        supplier: form.supplier || null,
        unit_price: Number(form.unit_price) || 0,
        buy_price: Number(form.buy_price) || 0,
        stock_quantity: Number(form.stock_quantity) || 0,
        min_stock_level: Number(form.min_stock_level) || 0,
        notes: form.notes || null,
      };
      if (product) {
        const { error } = await supabase.from("products").update(payload).eq("id", product.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert({ ...payload, created_by: user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["products-summary"] });
      toast.success("Saved");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const field = (k: string, type = "text") => (
    <Input type={type} value={form[k] ?? ""} onChange={(e) => setForm({ ...form, [k]: type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value })} />
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{product ? t("edit") : t("add_product")}</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>{t("product_id")}</Label>{field("product_id")}</div>
          <div className="space-y-1.5"><Label>{t("name")}</Label>{field("name")}</div>
          <div className="space-y-1.5"><Label>{t("category")}</Label>{field("category")}</div>
          <div className="space-y-1.5"><Label>{t("supplier")}</Label>{field("supplier")}</div>
          <div className="space-y-1.5"><Label>{t("unit_price")}</Label>{field("unit_price", "number")}</div>
          <div className="space-y-1.5"><Label>Buy Price</Label>{field("buy_price", "number")}</div>
          <div className="space-y-1.5"><Label>{t("quantity")}</Label>{field("stock_quantity", "number")}</div>
          <div className="space-y-1.5"><Label>{t("min_stock")}</Label>{field("min_stock_level", "number")}</div>
          <div className="space-y-1.5 sm:col-span-2"><Label>{t("notes")}</Label>
            <Textarea value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
            <Button type="submit" disabled={save.isPending || !form.product_id || !form.name}>{t("save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

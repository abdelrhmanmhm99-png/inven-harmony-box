import { useState } from "react";
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

export function StockDialog({
  open, onOpenChange, product, action,
}: { open: boolean; onOpenChange: (o: boolean) => void; product: { id: string; name: string; stock_quantity: number }; action: "in" | "out" }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [qty, setQty] = useState<number>(1);
  const [notes, setNotes] = useState("");

  const mut = useMutation({
    mutationFn: async () => {
      if (qty <= 0) throw new Error("Quantity must be > 0");
      if (action === "out" && qty > product.stock_quantity) throw new Error("Not enough stock");
      const { error } = await supabase.from("stock_transactions").insert({
        product_id: product.id, action, quantity: qty, notes: notes || null, user_id: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["products-summary"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["recent-tx"] });
      toast.success("Recorded");
      onOpenChange(false);
      setQty(1); setNotes("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{action === "in" ? t("stock_in") : t("stock_out")} — {product.name}</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="space-y-3">
          <div className="space-y-1.5">
            <Label>{t("quantity")}</Label>
            <Input type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} />
            <p className="text-xs text-muted-foreground">Current: {product.stock_quantity}</p>
          </div>
          <div className="space-y-1.5">
            <Label>{t("notes")}</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
            <Button type="submit" disabled={mut.isPending}>{t("save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

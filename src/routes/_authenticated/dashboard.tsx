import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Boxes, AlertTriangle, DollarSign } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

const COLORS = ["#10b981", "#34d399", "#6ee7b7", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6"];

function Dashboard() {
  const { t, lang } = useI18n();

  const { data: products } = useQuery({
    queryKey: ["products-summary"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id, name, category, unit_price, stock_quantity, min_stock_level");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: recent } = useQuery({
    queryKey: ["recent-tx"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_transactions")
        .select("id, action, quantity, created_at, notes, products(name, product_id)")
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data ?? [];
    },
  });

  const totalProducts = products?.length ?? 0;
  const totalStock = products?.reduce((s, p) => s + (p.stock_quantity ?? 0), 0) ?? 0;
  const lowStock = products?.filter((p) => p.stock_quantity <= p.min_stock_level) ?? [];
  const invValue = products?.reduce((s, p) => s + Number(p.unit_price) * p.stock_quantity, 0) ?? 0;

  const byCategory = Object.values(
    (products ?? []).reduce<Record<string, { name: string; stock: number }>>((acc, p) => {
      const k = p.category || "—";
      acc[k] = acc[k] || { name: k, stock: 0 };
      acc[k].stock += p.stock_quantity;
      return acc;
    }, {}),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("dashboard")}</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Package} label={t("total_products")} value={totalProducts} />
        <StatCard icon={Boxes} label={t("total_stock")} value={totalStock} />
        <StatCard icon={AlertTriangle} label={t("low_stock")} value={lowStock.length} tone={lowStock.length ? "warn" : "ok"} />
        <StatCard icon={DollarSign} label={t("inventory_value")} value={invValue.toLocaleString(lang === "ar" ? "ar-EG" : "en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">{t("stock_by_category")}</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer>
              <BarChart data={byCategory}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="name" stroke="currentColor" fontSize={12} />
                <YAxis stroke="currentColor" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Bar dataKey="stock" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">{t("stock_by_category")}</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={byCategory} dataKey="stock" nameKey="name" innerRadius={45} outerRadius={80}>
                  {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">{t("low_stock")}</CardTitle></CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">—</p>
            ) : (
              <ul className="divide-y">
                {lowStock.slice(0, 8).map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="truncate">{p.name}</span>
                    <span className="font-mono text-warning">{p.stock_quantity} / {p.min_stock_level}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">{t("recent_activity")}</CardTitle></CardHeader>
          <CardContent>
            {!recent?.length ? <p className="text-sm text-muted-foreground">—</p> : (
              <ul className="divide-y">
                {recent.map((r: any) => (
                  <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{r.products?.name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{format(new Date(r.created_at), "PPp")}</div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.action === "in" ? "bg-success/15 text-success" : r.action === "out" ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground"}`}>
                      {r.action === "in" ? "+" : r.action === "out" ? "−" : "="}{r.quantity}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone }: { icon: any; label: string; value: any; tone?: "warn" | "ok" }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
            <div className={`mt-2 text-2xl font-bold ${tone === "warn" ? "text-warning" : ""}`}>{value}</div>
          </div>
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary grid place-items-center">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

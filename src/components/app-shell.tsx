import { Link, useRouter } from "@tanstack/react-router";
import { LayoutDashboard, Package, ArrowLeftRight, LogOut, Moon, Sun, Languages, Menu } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useAuth, useRole } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: ReactNode }) {
  const { t, lang, setLang } = useI18n();
  const { theme, toggle } = useTheme();
  const { user } = useAuth();
  const { data: role } = useRole(user?.id);
  const router = useRouter();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const nav = [
    { to: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { to: "/products", label: t("products"), icon: Package },
    { to: "/transactions", label: t("transactions"), icon: ArrowLeftRight },
  ];

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  };

  const SideNav = (
    <nav className="flex flex-col gap-1 p-3">
      {nav.map((n) => (
        <Link
          key={n.to}
          to={n.to}
          onClick={() => setOpen(false)}
          className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors [&.active]:bg-sidebar-primary [&.active]:text-sidebar-primary-foreground"
          activeProps={{ className: "active" }}
        >
          <n.icon className="h-4 w-4" />
          <span>{n.label}</span>
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-64 flex-col border-e border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-16 items-center gap-2 px-5 border-b border-sidebar-border">
          <div className="h-8 w-8 rounded-md bg-sidebar-primary text-sidebar-primary-foreground grid place-items-center font-bold">I</div>
          <span className="font-semibold tracking-tight">{t("app_name")}</span>
        </div>
        {SideNav}
        <div className="mt-auto p-3 text-xs text-sidebar-foreground/60 border-t border-sidebar-border">
          <div className="truncate">{user?.email}</div>
          <div className="mt-1 inline-flex rounded-full bg-sidebar-accent px-2 py-0.5 text-[10px] uppercase tracking-wide">{role?.isAdmin ? "Admin" : "Employee"}</div>
        </div>
      </aside>

      {/* Mobile drawer */}
      <div className={cn("fixed inset-0 z-40 md:hidden", open ? "block" : "hidden")}>
        <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
        <aside className="absolute inset-y-0 start-0 w-64 bg-sidebar text-sidebar-foreground flex flex-col">
          <div className="flex h-16 items-center gap-2 px-5 border-b border-sidebar-border">
            <div className="h-8 w-8 rounded-md bg-sidebar-primary text-sidebar-primary-foreground grid place-items-center font-bold">I</div>
            <span className="font-semibold">{t("app_name")}</span>
          </div>
          {SideNav}
        </aside>
      </div>

      <div className="md:ps-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur md:px-8">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></Button>
          <div className="ms-auto flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setLang(lang === "en" ? "ar" : "en")} title={t("language")}>
              <Languages className="h-4 w-4" />
              <span className="ms-1 text-xs font-medium">{lang.toUpperCase()}</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={toggle} title={t("toggle_theme")}>
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut} title={t("sign_out")}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <main className="p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}

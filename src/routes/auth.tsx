import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Boxes } from "lucide-react";

export const Route = createFileRoute("/auth")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/dashboard" });
  },
  component: AuthPage,
});

function AuthPage() {
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    navigate({ to: "/dashboard" });
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName }, emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created — you can sign in now.");
  };

  const google = async () => {
    setLoading(true);
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/dashboard" });
    if (r.error) { setLoading(false); return toast.error((r.error as Error).message); }
    if (!r.redirected) navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-between bg-sidebar text-sidebar-foreground p-10">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground grid place-items-center"><Boxes className="h-5 w-5" /></div>
          <span className="text-lg font-semibold">{t("app_name")}</span>
        </div>
        <div>
          <h2 className="text-3xl font-bold leading-tight">{t("app_name")}</h2>
          <p className="mt-3 max-w-md text-sidebar-foreground/70">
            {lang === "ar" ? "نظام متكامل لإدارة المخزون والحركات والتقارير — يدعم العربية والإنجليزية." : "A complete inventory, stock movements, and reporting system — bilingual EN/AR."}
          </p>
        </div>
        <div className="text-xs text-sidebar-foreground/50">{t("first_user_admin")}</div>
      </div>

      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{t("welcome_back")}</span>
              <Button variant="ghost" size="sm" onClick={() => setLang(lang === "en" ? "ar" : "en")}>{lang === "en" ? "العربية" : "English"}</Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">{t("sign_in")}</TabsTrigger>
                <TabsTrigger value="signup">{t("sign_up")}</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={signIn} className="space-y-3 pt-4">
                  <Field label={t("email")} value={email} onChange={setEmail} type="email" required />
                  <Field label={t("password")} value={password} onChange={setPassword} type="password" required />
                  <Button type="submit" disabled={loading} className="w-full">{t("sign_in")}</Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={signUp} className="space-y-3 pt-4">
                  <Field label={t("full_name")} value={fullName} onChange={setFullName} required />
                  <Field label={t("email")} value={email} onChange={setEmail} type="email" required />
                  <Field label={t("password")} value={password} onChange={setPassword} type="password" required />
                  <Button type="submit" disabled={loading} className="w-full">{t("sign_up")}</Button>
                  <p className="text-xs text-muted-foreground text-center">{t("first_user_admin")}</p>
                </form>
              </TabsContent>
            </Tabs>

            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" /><span>or</span><div className="h-px flex-1 bg-border" />
            </div>
            <Button variant="outline" className="w-full" onClick={google} disabled={loading}>
              <svg viewBox="0 0 24 24" className="h-4 w-4 me-2"><path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h5.9c-.3 1.4-1.1 2.6-2.4 3.4v2.8h3.9c2.3-2.1 3.6-5.2 3.6-8.3z"/><path fill="#34A853" d="M12 23c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3C3.4 20.6 7.4 23 12 23z"/><path fill="#FBBC05" d="M5.4 13.4c-.2-.7-.4-1.4-.4-2.2s.1-1.5.4-2.2V6H1.4C.5 7.5 0 9.2 0 11.2s.5 3.7 1.4 5.2l4-3z"/><path fill="#EA4335" d="M12 4.4c1.8 0 3.3.6 4.6 1.8l3.4-3.4C17.9 1 15.2 0 12 0 7.4 0 3.4 2.4 1.4 6l4 3c.9-2.8 3.5-4.6 6.6-4.6z"/></svg>
              {t("continue_with_google")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} />
    </div>
  );
}

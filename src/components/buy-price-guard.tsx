import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Eye, EyeOff } from "lucide-react";

const LS_KEY = "bp_hash";

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function getStoredHash(): string | null {
  try { return localStorage.getItem(LS_KEY); } catch { return null; }
}
function setStoredHash(hash: string): void {
  try { localStorage.setItem(LS_KEY, hash); } catch {}
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onUnlock: () => void;
}

export function BuyPriceGuard({ open, onOpenChange, onUnlock }: Props) {
  const isNew = !getStoredHash();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => { setPw(""); setConfirm(""); setError(""); setShow(false); };

  const handleOpenChange = (o: boolean) => { if (!o) reset(); onOpenChange(o); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    if (isNew) {
      if (pw.length < 4) { setError("Password must be at least 4 characters"); setLoading(false); return; }
      if (pw !== confirm) { setError("Passwords do not match"); setLoading(false); return; }
      const hash = await sha256(pw);
      setStoredHash(hash);
      setLoading(false);
      reset();
      onUnlock();
      onOpenChange(false);
    } else {
      const stored = getStoredHash();
      const entered = await sha256(pw);
      setLoading(false);
      if (entered === stored) {
        reset();
        onUnlock();
        onOpenChange(false);
      } else {
        setError("Incorrect password");
        setPw("");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            {isNew ? "Set Buy Price Password" : "Enter Buy Price Password"}
          </DialogTitle>
          <DialogDescription>
            {isNew
              ? "Create a password to protect buy prices. You'll use this same password every time."
              : "Enter your password to reveal buy prices."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Password</Label>
            <div className="relative">
              <Input
                type={show ? "text" : "password"}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                autoFocus
                placeholder={isNew ? "Choose a password" : "Enter password"}
                className="pe-10"
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShow((s) => !s)}
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {isNew && (
            <div className="space-y-1.5">
              <Label>Confirm Password</Label>
              <Input
                type={show ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat password"
              />
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading || !pw}>
            {loading ? "Please wait…" : isNew ? "Set Password & Unlock" : "Unlock"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

-- Add buy_price to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS buy_price numeric(12,2) DEFAULT 0;

-- App-wide settings table (e.g. buy_price_password_hash)
CREATE TABLE IF NOT EXISTS public.app_settings (
  key   text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

CREATE POLICY "auth_read_settings"  ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_settings" ON public.app_settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_settings" ON public.app_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

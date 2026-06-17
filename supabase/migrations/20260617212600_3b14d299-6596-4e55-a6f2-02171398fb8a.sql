
-- Restrict stock_transactions SELECT: users see their own; admins see all
DROP POLICY IF EXISTS "auth view transactions" ON public.stock_transactions;
CREATE POLICY "users view own transactions or admin views all"
  ON public.stock_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Allow admins to correct transaction history
CREATE POLICY "admins update transactions"
  ON public.stock_transactions FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins delete transactions"
  ON public.stock_transactions FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

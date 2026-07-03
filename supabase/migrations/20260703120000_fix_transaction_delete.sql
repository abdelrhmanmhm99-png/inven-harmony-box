-- Fix admin "delete transaction" flow.
--
-- 1) The UI (transactions.tsx) calls the RPC `adjust_stock_delta` to reverse a
--    transaction's effect on stock when it is deleted, but the function was never
--    created. Add it (atomic, clamped at 0).
-- 2) The "admins update/delete transactions" RLS policies exist, but the
--    `authenticated` role was only granted SELECT, INSERT on stock_transactions,
--    so UPDATE/DELETE were denied at the privilege level. Grant them.

CREATE OR REPLACE FUNCTION public.adjust_stock_delta(p_product_id uuid, p_delta integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.products
  SET stock_quantity = GREATEST(0, stock_quantity + p_delta),
      updated_at = now()
  WHERE id = p_product_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.adjust_stock_delta(uuid, integer) TO authenticated;

GRANT UPDATE, DELETE ON public.stock_transactions TO authenticated;

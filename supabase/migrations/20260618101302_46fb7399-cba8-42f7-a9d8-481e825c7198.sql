CREATE OR REPLACE FUNCTION public.apply_stock_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be greater than zero';
  END IF;

  IF NEW.action = 'in' THEN
    UPDATE public.products
    SET stock_quantity = stock_quantity + NEW.quantity,
        updated_at = now()
    WHERE id = NEW.product_id;
  ELSIF NEW.action = 'out' THEN
    UPDATE public.products
    SET stock_quantity = GREATEST(0, stock_quantity - NEW.quantity),
        updated_at = now()
    WHERE id = NEW.product_id;
  ELSIF NEW.action = 'adjust' THEN
    UPDATE public.products
    SET stock_quantity = NEW.quantity,
        updated_at = now()
    WHERE id = NEW.product_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS stock_tx_apply ON public.stock_transactions;
DROP TRIGGER IF EXISTS trg_apply_stock_change ON public.stock_transactions;

CREATE TRIGGER trg_apply_stock_change
AFTER INSERT ON public.stock_transactions
FOR EACH ROW EXECUTE FUNCTION public.apply_stock_change();

DROP TRIGGER IF EXISTS products_updated_at ON public.products;
DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;

CREATE TRIGGER trg_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
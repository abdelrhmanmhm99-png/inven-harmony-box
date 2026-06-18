DROP TRIGGER IF EXISTS trg_apply_stock_change ON public.stock_transactions;
CREATE TRIGGER trg_apply_stock_change
AFTER INSERT ON public.stock_transactions
FOR EACH ROW EXECUTE FUNCTION public.apply_stock_change();

DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
CREATE OR REPLACE FUNCTION public.prevent_self_disabled_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.disabled IS DISTINCT FROM OLD.disabled
     AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can change the disabled status of a profile';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_self_disabled_change ON public.profiles;
CREATE TRIGGER profiles_prevent_self_disabled_change
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_self_disabled_change();

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nome text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cognome text NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION public.profiles_sync_display_name()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR NEW.nome IS DISTINCT FROM OLD.nome OR NEW.cognome IS DISTINCT FROM OLD.cognome) THEN
    IF coalesce(NEW.nome, '') <> '' OR coalesce(NEW.cognome, '') <> '' THEN
      NEW.display_name := trim(coalesce(NEW.nome,'') || ' ' || coalesce(NEW.cognome,''));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_sync_display_name_trg ON public.profiles;
CREATE TRIGGER profiles_sync_display_name_trg
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.profiles_sync_display_name();

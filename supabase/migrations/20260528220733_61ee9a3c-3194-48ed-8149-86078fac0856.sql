-- =====================================================================
-- FASE 7 — Utenti, ruoli e RLS
-- =====================================================================

-- 1. Enum dei ruoli applicativi
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'commerciale', 'lettura');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Tabella profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  disabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Tabella user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Funzione has_role (security definer, evita ricorsione su user_roles)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 5. Trigger updated_at su profiles
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. Trigger: alla creazione di un utente, crea profilo + assegna ruolo
--    (primo utente -> admin, successivi -> lettura)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.app_role;
  v_count INT;
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;

  SELECT COUNT(*) INTO v_count FROM public.user_roles;
  v_role := CASE WHEN v_count = 0 THEN 'admin'::public.app_role ELSE 'lettura'::public.app_role END;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================================
-- 7. POLICIES — profiles & user_roles
-- =====================================================================

DROP POLICY IF EXISTS "profiles self read" ON public.profiles;
CREATE POLICY "profiles self read" ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "profiles self update" ON public.profiles;
CREATE POLICY "profiles self update" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "user_roles self read" ON public.user_roles;
CREATE POLICY "user_roles self read" ON public.user_roles
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "user_roles admin write" ON public.user_roles;
CREATE POLICY "user_roles admin write" ON public.user_roles
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================================================================
-- 8. RIASSEGNAZIONE policy sulle tabelle esistenti (sostituiscono "auth.*" permissive)
-- =====================================================================

-- Helper inline: lettura → tutti gli autenticati. Scrittura → admin sempre, commerciale solo su tabelle commerciali.

-- ARTICOLI: lettura tutti, scrittura solo admin
DROP POLICY IF EXISTS "auth read articoli" ON public.articoli;
DROP POLICY IF EXISTS "auth write articoli" ON public.articoli;
CREATE POLICY "articoli read" ON public.articoli
FOR SELECT TO authenticated USING (true);
CREATE POLICY "articoli admin write" ON public.articoli
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- LISTINI ACQUISTO / VENDITA: lettura tutti, scrittura solo admin
DROP POLICY IF EXISTS "auth read listini_acquisto" ON public.listini_acquisto;
DROP POLICY IF EXISTS "auth write listini_acquisto" ON public.listini_acquisto;
CREATE POLICY "listini_acquisto read" ON public.listini_acquisto
FOR SELECT TO authenticated USING (true);
CREATE POLICY "listini_acquisto admin write" ON public.listini_acquisto
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "auth read listini_vendita" ON public.listini_vendita;
DROP POLICY IF EXISTS "auth write listini_vendita" ON public.listini_vendita;
CREATE POLICY "listini_vendita read" ON public.listini_vendita
FOR SELECT TO authenticated USING (true);
CREATE POLICY "listini_vendita admin write" ON public.listini_vendita
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- KIT / KIT_COMPONENTI: lettura tutti, scrittura solo admin
DROP POLICY IF EXISTS "auth read kit" ON public.kit;
DROP POLICY IF EXISTS "auth write kit" ON public.kit;
CREATE POLICY "kit read" ON public.kit
FOR SELECT TO authenticated USING (true);
CREATE POLICY "kit admin write" ON public.kit
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "auth read kit_componenti" ON public.kit_componenti;
DROP POLICY IF EXISTS "auth write kit_componenti" ON public.kit_componenti;
CREATE POLICY "kit_componenti read" ON public.kit_componenti
FOR SELECT TO authenticated USING (true);
CREATE POLICY "kit_componenti admin write" ON public.kit_componenti
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- FORNITORI / AGENTI / COMUNI: lettura tutti, scrittura solo admin
DROP POLICY IF EXISTS "auth read fornitori" ON public.fornitori;
DROP POLICY IF EXISTS "auth write fornitori" ON public.fornitori;
CREATE POLICY "fornitori read" ON public.fornitori
FOR SELECT TO authenticated USING (true);
CREATE POLICY "fornitori admin write" ON public.fornitori
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "auth read agenti" ON public.agenti;
DROP POLICY IF EXISTS "auth write agenti" ON public.agenti;
CREATE POLICY "agenti read" ON public.agenti
FOR SELECT TO authenticated USING (true);
CREATE POLICY "agenti admin write" ON public.agenti
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "auth read comuni" ON public.comuni;
DROP POLICY IF EXISTS "auth write comuni" ON public.comuni;
CREATE POLICY "comuni read" ON public.comuni
FOR SELECT TO authenticated USING (true);
CREATE POLICY "comuni admin write" ON public.comuni
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- CLIENTI: lettura tutti, scrittura admin+commerciale
DROP POLICY IF EXISTS "auth read clienti" ON public.clienti;
DROP POLICY IF EXISTS "auth write clienti" ON public.clienti;
CREATE POLICY "clienti read" ON public.clienti
FOR SELECT TO authenticated USING (true);
CREATE POLICY "clienti commerciale write" ON public.clienti
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'commerciale'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'commerciale'));

-- CANTIERI: idem
DROP POLICY IF EXISTS "auth read cantieri" ON public.cantieri;
DROP POLICY IF EXISTS "auth write cantieri" ON public.cantieri;
CREATE POLICY "cantieri read" ON public.cantieri
FOR SELECT TO authenticated USING (true);
CREATE POLICY "cantieri commerciale write" ON public.cantieri
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'commerciale'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'commerciale'));

-- PREVENTIVI / BLOCCHI / RIGHE: lettura tutti, scrittura admin+commerciale
DROP POLICY IF EXISTS "auth read preventivi" ON public.preventivi;
DROP POLICY IF EXISTS "auth write preventivi" ON public.preventivi;
CREATE POLICY "preventivi read" ON public.preventivi
FOR SELECT TO authenticated USING (true);
CREATE POLICY "preventivi commerciale write" ON public.preventivi
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'commerciale'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'commerciale'));

DROP POLICY IF EXISTS "auth read blocchi_preventivo" ON public.blocchi_preventivo;
DROP POLICY IF EXISTS "auth write blocchi_preventivo" ON public.blocchi_preventivo;
CREATE POLICY "blocchi read" ON public.blocchi_preventivo
FOR SELECT TO authenticated USING (true);
CREATE POLICY "blocchi commerciale write" ON public.blocchi_preventivo
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'commerciale'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'commerciale'));

DROP POLICY IF EXISTS "auth read righe_preventivo" ON public.righe_preventivo;
DROP POLICY IF EXISTS "auth write righe_preventivo" ON public.righe_preventivo;
CREATE POLICY "righe read" ON public.righe_preventivo
FOR SELECT TO authenticated USING (true);
CREATE POLICY "righe commerciale write" ON public.righe_preventivo
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'commerciale'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'commerciale'));

-- Backfill: crea profili e ruoli per utenti auth già esistenti (se ce ne sono)
INSERT INTO public.profiles (id, email, display_name)
SELECT u.id, u.email, COALESCE(u.raw_user_meta_data->>'full_name', u.email)
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- Se non c'è nessun admin, promuovi il più vecchio utente
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin')
ORDER BY u.created_at
LIMIT 1
ON CONFLICT (user_id, role) DO NOTHING;
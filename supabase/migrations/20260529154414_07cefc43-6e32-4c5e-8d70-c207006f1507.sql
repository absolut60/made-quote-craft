
-- Enum categoria
DO $$ BEGIN
  CREATE TYPE public.categoria_allegato AS ENUM (
    'capitolato', 'disegni', 'scheda_tecnica', 'certificazioni',
    'foto_cantiere', 'documenti_commerciali', 'altro'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabella
CREATE TABLE IF NOT EXISTS public.allegati_preventivo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preventivo_id uuid NOT NULL REFERENCES public.preventivi(id) ON DELETE CASCADE,
  categoria public.categoria_allegato NOT NULL DEFAULT 'altro',
  nome_file text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  dimensione_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_allegati_preventivo_preventivo_id
  ON public.allegati_preventivo(preventivo_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.allegati_preventivo TO authenticated;
GRANT ALL ON public.allegati_preventivo TO service_role;

ALTER TABLE public.allegati_preventivo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "utenti autenticati gestiscono allegati" ON public.allegati_preventivo;
CREATE POLICY "utenti autenticati gestiscono allegati"
  ON public.allegati_preventivo
  FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Storage bucket privato
INSERT INTO storage.buckets (id, name, public)
VALUES ('allegati-preventivi', 'allegati-preventivi', false)
ON CONFLICT (id) DO NOTHING;

-- Policy storage
DROP POLICY IF EXISTS "allegati preventivi auth read" ON storage.objects;
CREATE POLICY "allegati preventivi auth read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'allegati-preventivi');

DROP POLICY IF EXISTS "allegati preventivi auth insert" ON storage.objects;
CREATE POLICY "allegati preventivi auth insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'allegati-preventivi');

DROP POLICY IF EXISTS "allegati preventivi auth update" ON storage.objects;
CREATE POLICY "allegati preventivi auth update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'allegati-preventivi');

DROP POLICY IF EXISTS "allegati preventivi auth delete" ON storage.objects;
CREATE POLICY "allegati preventivi auth delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'allegati-preventivi');

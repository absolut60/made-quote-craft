
-- Bucket privato per allegati kit
INSERT INTO storage.buckets (id, name, public)
VALUES ('allegati-kit', 'allegati-kit', false)
ON CONFLICT (id) DO NOTHING;

-- Policy storage (utenti autenticati gestiscono allegati kit)
CREATE POLICY "kit attachments authenticated read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'allegati-kit');

CREATE POLICY "kit attachments authenticated write"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'allegati-kit');

CREATE POLICY "kit attachments authenticated update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'allegati-kit');

CREATE POLICY "kit attachments authenticated delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'allegati-kit');

-- Tabella metadati allegati kit
CREATE TABLE public.allegati_kit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_id uuid NOT NULL REFERENCES public.kit(id) ON DELETE CASCADE,
  categoria text NOT NULL DEFAULT 'altro',
  nome_file text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  dimensione_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.allegati_kit TO authenticated;
GRANT ALL ON public.allegati_kit TO service_role;

ALTER TABLE public.allegati_kit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "utenti autenticati gestiscono allegati kit"
ON public.allegati_kit FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX idx_allegati_kit_kit_id ON public.allegati_kit(kit_id);

-- Create enum for article attachment categories
CREATE TYPE public.categoria_allegato_articolo AS ENUM (
  'scheda_tecnica', 'scheda_sicurezza', 'certificazione_ce_dop',
  'certificazione_antincendio', 'certificazione_acustica', 'dichiarazione_conformita',
  'voce_capitolato', 'manuale_posa', 'certificato_ambientale',
  'immagine_prodotto', 'disegno_tecnico', 'altro'
);

-- Create table
CREATE TABLE public.allegati_articolo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  articolo_id uuid NOT NULL REFERENCES public.articoli(id) ON DELETE CASCADE,
  categoria public.categoria_allegato_articolo NOT NULL DEFAULT 'altro',
  nome_file text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  dimensione_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_allegati_articolo_articolo_id ON public.allegati_articolo(articolo_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.allegati_articolo TO authenticated;
GRANT ALL ON public.allegati_articolo TO service_role;

ALTER TABLE public.allegati_articolo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "utenti autenticati gestiscono allegati articolo"
  ON public.allegati_articolo
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Create private storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('allegati-articoli', 'allegati-articoli', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: authenticated users can read/write/delete
CREATE POLICY "auth read allegati articoli"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'allegati-articoli');

CREATE POLICY "auth insert allegati articoli"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'allegati-articoli');

CREATE POLICY "auth update allegati articoli"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'allegati-articoli');

CREATE POLICY "auth delete allegati articoli"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'allegati-articoli');

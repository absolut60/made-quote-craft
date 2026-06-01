CREATE TABLE public.cantiere_listini_speciali (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cantiere_id UUID NOT NULL REFERENCES public.cantieri(id) ON DELETE CASCADE,
  cod_gamma TEXT NOT NULL,
  costo_netto_speciale NUMERIC(12,5),
  prezzo_vendita_speciale NUMERIC(12,5),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cantiere_id, cod_gamma)
);

CREATE INDEX idx_cantiere_listini_cantiere_id ON public.cantiere_listini_speciali(cantiere_id);
CREATE INDEX idx_cantiere_listini_cod_gamma ON public.cantiere_listini_speciali(cod_gamma);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cantiere_listini_speciali TO authenticated;
GRANT ALL ON public.cantiere_listini_speciali TO service_role;

ALTER TABLE public.cantiere_listini_speciali ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cantiere_listini read"
  ON public.cantiere_listini_speciali FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'commerciale'::app_role));

CREATE POLICY "cantiere_listini commerciale write"
  ON public.cantiere_listini_speciali FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'commerciale'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'commerciale'::app_role));

CREATE TRIGGER set_updated_at_cantiere_listini
  BEFORE UPDATE ON public.cantiere_listini_speciali
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
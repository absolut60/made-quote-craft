CREATE TABLE public.preferenze_stampa (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  colonne_righe jsonb NOT NULL DEFAULT '{"um":true,"quantita":true,"prezzo_unit":true,"sconto":true,"prezzo_scontato":true,"importo":true}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.preferenze_stampa TO authenticated;
GRANT ALL ON public.preferenze_stampa TO service_role;

ALTER TABLE public.preferenze_stampa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ognuno gestisce le proprie preferenze"
  ON public.preferenze_stampa
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_preferenze_stampa_updated_at
  BEFORE UPDATE ON public.preferenze_stampa
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
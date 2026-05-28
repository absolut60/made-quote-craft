-- Ensure cod_gamma is unique (required for upsert during GAMMA import)
-- Use partial unique index to allow multiple NULL values
CREATE UNIQUE INDEX IF NOT EXISTS articoli_cod_gamma_unique
  ON public.articoli (cod_gamma)
  WHERE cod_gamma IS NOT NULL;

-- Ensure (articolo_id, fascia) is unique on listini_vendita
CREATE UNIQUE INDEX IF NOT EXISTS listini_vendita_articolo_fascia_unique
  ON public.listini_vendita (articolo_id, fascia);
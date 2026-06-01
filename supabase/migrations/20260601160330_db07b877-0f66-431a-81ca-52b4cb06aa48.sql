ALTER TABLE public.cantieri 
  ADD COLUMN IF NOT EXISTS stato TEXT NOT NULL DEFAULT 'aperto' 
  CHECK (stato IN ('aperto', 'chiuso', 'sospeso'));

ALTER TABLE public.cantieri
  ADD COLUMN IF NOT EXISTS lat NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS lng NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS geocodificato_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_cantieri_stato ON public.cantieri(stato);
CREATE INDEX IF NOT EXISTS idx_cantieri_lat_lng ON public.cantieri(lat, lng) WHERE lat IS NOT NULL;

UPDATE public.cantieri SET stato = 'aperto' WHERE stato IS NULL;

-- 1. Aggiungi prezzo_scontato
ALTER TABLE public.listini_acquisto ADD COLUMN IF NOT EXISTS prezzo_scontato numeric;

-- 2. Normalizza sconti salvati ×100 (es. 5000 -> 50.00). Tutti i valori >100 vengono divisi per 100.
UPDATE public.listini_acquisto SET sc1 = sc1 / 100 WHERE sc1 IS NOT NULL AND sc1 > 100;
UPDATE public.listini_acquisto SET sc2 = sc2 / 100 WHERE sc2 IS NOT NULL AND sc2 > 100;
UPDATE public.listini_acquisto SET sc3 = sc3 / 100 WHERE sc3 IS NOT NULL AND sc3 > 100;
UPDATE public.listini_acquisto SET sc4 = sc4 / 100 WHERE sc4 IS NOT NULL AND sc4 > 100;
UPDATE public.listini_acquisto SET sc5 = sc5 / 100 WHERE sc5 IS NOT NULL AND sc5 > 100;

-- 3. Backfill prezzo_scontato, trasporto coerente e costo_netto
-- listino_for è text in alcuni dati: cast sicuro via NULLIF
WITH calc AS (
  SELECT
    id,
    NULLIF(regexp_replace(coalesce(listino_for,''), '[^0-9\.,\-]', '', 'g'), '')::numeric AS lfor_num,
    coalesce(sc1,0) AS s1, coalesce(sc2,0) AS s2, coalesce(sc3,0) AS s3,
    coalesce(sc4,0) AS s4, coalesce(sc5,0) AS s5,
    coalesce(trasporto_eur,0) AS te,
    coalesce(trasporto_perc,0) AS tp
  FROM public.listini_acquisto
),
calc2 AS (
  SELECT
    id,
    round(
      coalesce(lfor_num,0)
      * (1 - s1/100) * (1 - s2/100) * (1 - s3/100) * (1 - s4/100) * (1 - s5/100)
    , 6) AS ps,
    te, tp
  FROM calc
)
UPDATE public.listini_acquisto la
SET
  prezzo_scontato = c.ps,
  trasporto_eur = CASE
    WHEN c.te > 0 THEN c.te
    WHEN c.tp > 0 AND c.ps > 0 THEN round(c.ps * c.tp / 100, 4)
    ELSE 0
  END,
  trasporto_perc = CASE
    WHEN c.te > 0 AND c.ps > 0 THEN round((c.te / c.ps) * 100, 4)
    WHEN c.tp > 0 THEN c.tp
    ELSE 0
  END,
  costo_netto = round(
    c.ps + CASE
      WHEN c.te > 0 THEN c.te
      WHEN c.tp > 0 AND c.ps > 0 THEN c.ps * c.tp / 100
      ELSE 0
    END
  , 4)
FROM calc2 c
WHERE la.id = c.id;

-- 4. Rimuovi colonne ambigue
ALTER TABLE public.listini_acquisto DROP COLUMN IF EXISTS costo;
ALTER TABLE public.listini_acquisto DROP COLUMN IF EXISTS costo_parziale;

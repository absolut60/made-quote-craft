
-- Tabella contatori
CREATE TABLE public.contatori_preventivo (
  anno int PRIMARY KEY,
  ultimo_numero int NOT NULL DEFAULT 0
);

GRANT SELECT ON public.contatori_preventivo TO authenticated;
GRANT ALL ON public.contatori_preventivo TO service_role;

ALTER TABLE public.contatori_preventivo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contatori read" ON public.contatori_preventivo
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'commerciale'::app_role));

-- Funzione atomica progressivo
CREATE OR REPLACE FUNCTION public.prossimo_numero_preventivo(p_anno int)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_num int;
  v_start int;
BEGIN
  v_start := CASE WHEN p_anno = 2026 THEN 100 ELSE 1 END;
  INSERT INTO public.contatori_preventivo (anno, ultimo_numero)
    VALUES (p_anno, v_start)
    ON CONFLICT (anno) DO UPDATE
      SET ultimo_numero = public.contatori_preventivo.ultimo_numero + 1
    RETURNING ultimo_numero INTO v_num;
  RETURN v_num;
END;
$$;

GRANT EXECUTE ON FUNCTION public.prossimo_numero_preventivo(int) TO authenticated;

-- Rinumerazione preventivi esistenti
WITH ordered AS (
  SELECT id,
         EXTRACT(YEAR FROM created_at)::int AS anno,
         ROW_NUMBER() OVER (PARTITION BY EXTRACT(YEAR FROM created_at) ORDER BY created_at) AS rn
  FROM public.preventivi
),
numerati AS (
  SELECT id, anno,
         (CASE WHEN anno = 2026 THEN 99 ELSE 0 END) + rn AS n
  FROM ordered
)
UPDATE public.preventivi p
SET numero = 'PRV-' || n.n || '/' || lpad((n.anno % 100)::text, 2, '0')
FROM numerati n
WHERE p.id = n.id;

-- Sincronizza i contatori con l'ultimo numero usato per ciascun anno
INSERT INTO public.contatori_preventivo (anno, ultimo_numero)
SELECT anno, MAX(n) FROM (
  SELECT EXTRACT(YEAR FROM created_at)::int AS anno,
         (CASE WHEN EXTRACT(YEAR FROM created_at)::int = 2026 THEN 99 ELSE 0 END)
           + ROW_NUMBER() OVER (PARTITION BY EXTRACT(YEAR FROM created_at) ORDER BY created_at) AS n
  FROM public.preventivi
) s
GROUP BY anno
ON CONFLICT (anno) DO UPDATE SET ultimo_numero = EXCLUDED.ultimo_numero;

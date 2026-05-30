-- Vincolo di unicità sul numero preventivo
ALTER TABLE public.preventivi
  ADD CONSTRAINT preventivi_numero_unique UNIQUE (numero);

-- Funzione atomica: ritorna il prossimo progressivo per l'anno, allineandosi
-- al MAX esistente nei preventivi (gestisce numeri PRV-<n>/<aa>).
CREATE OR REPLACE FUNCTION public.prossimo_numero_preventivo(p_anno integer)
RETURNS integer
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_num int;
  v_start int;
  v_max_existing int;
  v_aa text;
BEGIN
  v_start := CASE WHEN p_anno = 2026 THEN 100 ELSE 1 END;
  v_aa := lpad((p_anno % 100)::text, 2, '0');

  -- Massimo progressivo già presente nei preventivi per quell'anno
  SELECT COALESCE(MAX(
    NULLIF(regexp_replace(numero, '^PRV-(\d+)/' || v_aa || '$', '\1'), numero)::int
  ), 0)
    INTO v_max_existing
    FROM public.preventivi
   WHERE numero ~ ('^PRV-\d+/' || v_aa || '$');

  -- Upsert e incremento atomico del contatore, garantendo che sia
  -- almeno > del massimo realmente esistente.
  INSERT INTO public.contatori_preventivo (anno, ultimo_numero)
    VALUES (p_anno, GREATEST(v_start, v_max_existing + 1))
    ON CONFLICT (anno) DO UPDATE
      SET ultimo_numero = GREATEST(
        public.contatori_preventivo.ultimo_numero + 1,
        v_max_existing + 1
      )
    RETURNING ultimo_numero INTO v_num;

  RETURN v_num;
END;
$function$;

-- Funzione di sola lettura: anteprima del prossimo numero senza incrementare.
CREATE OR REPLACE FUNCTION public.anteprima_numero_preventivo(p_anno integer)
RETURNS integer
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  v_start int;
  v_max_existing int;
  v_counter int;
  v_aa text;
BEGIN
  v_start := CASE WHEN p_anno = 2026 THEN 100 ELSE 1 END;
  v_aa := lpad((p_anno % 100)::text, 2, '0');

  SELECT COALESCE(MAX(
    NULLIF(regexp_replace(numero, '^PRV-(\d+)/' || v_aa || '$', '\1'), numero)::int
  ), 0)
    INTO v_max_existing
    FROM public.preventivi
   WHERE numero ~ ('^PRV-\d+/' || v_aa || '$');

  SELECT ultimo_numero INTO v_counter
    FROM public.contatori_preventivo WHERE anno = p_anno;

  RETURN GREATEST(COALESCE(v_counter, v_start - 1) + 1, v_max_existing + 1, v_start);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.anteprima_numero_preventivo(integer) TO authenticated;
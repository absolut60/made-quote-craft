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

  SELECT COALESCE(MAX(
    NULLIF(regexp_replace(numero, '^PRV-(\d+)/' || v_aa || '$', '\1'), numero)::int
  ), 0)
    INTO v_max_existing
    FROM public.preventivi
   WHERE numero ~ ('^PRV-\d+/' || v_aa || '$');

  INSERT INTO public.contatori_preventivo (anno, tipo, ultimo_numero)
    VALUES (p_anno, 'preventivo', GREATEST(v_start, v_max_existing + 1))
    ON CONFLICT (anno, tipo) DO UPDATE
      SET ultimo_numero = GREATEST(
        public.contatori_preventivo.ultimo_numero + 1,
        v_max_existing + 1
      )
    RETURNING ultimo_numero INTO v_num;

  RETURN v_num;
END;
$function$;

CREATE OR REPLACE FUNCTION public.prossimo_numero_ordine(p_anno integer)
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

  SELECT COALESCE(MAX(
    NULLIF(regexp_replace(numero, '^ORD-(\d+)/' || v_aa || '$', '\1'), numero)::int
  ), 0)
    INTO v_max_existing
    FROM public.preventivi
   WHERE numero ~ ('^ORD-\d+/' || v_aa || '$');

  INSERT INTO public.contatori_preventivo (anno, tipo, ultimo_numero)
    VALUES (p_anno, 'ordine', GREATEST(v_start, v_max_existing + 1))
    ON CONFLICT (anno, tipo) DO UPDATE
      SET ultimo_numero = GREATEST(
        public.contatori_preventivo.ultimo_numero + 1,
        v_max_existing + 1
      )
    RETURNING ultimo_numero INTO v_num;

  RETURN v_num;
END;
$function$;
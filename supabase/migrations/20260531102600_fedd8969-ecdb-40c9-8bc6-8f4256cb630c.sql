-- Tipo documento (preventivo/ordine)
CREATE TYPE public.tipo_documento AS ENUM ('preventivo','ordine');

-- Aggiungi tipo + colonna preventivo_origine_id (predisposta per fase 2)
ALTER TABLE public.preventivi
  ADD COLUMN tipo public.tipo_documento NOT NULL DEFAULT 'preventivo',
  ADD COLUMN preventivo_origine_id uuid NULL
    REFERENCES public.preventivi(id) ON DELETE SET NULL;

CREATE INDEX idx_preventivi_tipo ON public.preventivi(tipo);
CREATE INDEX idx_preventivi_origine ON public.preventivi(preventivo_origine_id);

-- Contatore: aggiunta colonna tipo, nuova PK (anno, tipo)
ALTER TABLE public.contatori_preventivo
  ADD COLUMN tipo public.tipo_documento NOT NULL DEFAULT 'preventivo';
ALTER TABLE public.contatori_preventivo DROP CONSTRAINT contatori_preventivo_pkey;
ALTER TABLE public.contatori_preventivo
  ADD PRIMARY KEY (anno, tipo);

-- RPC anteprima numero ordine: ORD-{n}/{aa}, parte da 100 nel 2026
CREATE OR REPLACE FUNCTION public.anteprima_numero_ordine(p_anno integer)
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
    NULLIF(regexp_replace(numero, '^ORD-(\d+)/' || v_aa || '$', '\1'), numero)::int
  ), 0)
    INTO v_max_existing
    FROM public.preventivi
   WHERE tipo = 'ordine' AND numero ~ ('^ORD-\d+/' || v_aa || '$');

  SELECT ultimo_numero INTO v_counter
    FROM public.contatori_preventivo
   WHERE anno = p_anno AND tipo = 'ordine';

  RETURN GREATEST(COALESCE(v_counter, v_start - 1) + 1, v_max_existing + 1, v_start);
END;
$function$;

-- RPC prossimo numero ordine (atomico)
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
   WHERE tipo = 'ordine' AND numero ~ ('^ORD-\d+/' || v_aa || '$');

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
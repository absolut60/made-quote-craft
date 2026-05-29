
CREATE OR REPLACE FUNCTION public.prossimo_numero_preventivo(p_anno int)
RETURNS int
LANGUAGE plpgsql
SECURITY INVOKER
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

GRANT INSERT, UPDATE ON public.contatori_preventivo TO authenticated;

CREATE POLICY "contatori commerciale write" ON public.contatori_preventivo
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'commerciale'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'commerciale'::app_role));

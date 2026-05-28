
-- Restrict SELECT on sensitive tables to admin + commerciale only (exclude 'lettura' and unauthenticated)

DROP POLICY IF EXISTS "clienti read" ON public.clienti;
CREATE POLICY "clienti read" ON public.clienti
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'commerciale'::app_role));

DROP POLICY IF EXISTS "listini_acquisto read" ON public.listini_acquisto;
CREATE POLICY "listini_acquisto read" ON public.listini_acquisto
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'commerciale'::app_role));

DROP POLICY IF EXISTS "listini_vendita read" ON public.listini_vendita;
CREATE POLICY "listini_vendita read" ON public.listini_vendita
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'commerciale'::app_role));

DROP POLICY IF EXISTS "righe read" ON public.righe_preventivo;
CREATE POLICY "righe read" ON public.righe_preventivo
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'commerciale'::app_role));

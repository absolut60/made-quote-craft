DROP POLICY IF EXISTS "preventivi read" ON public.preventivi;
CREATE POLICY "preventivi read" ON public.preventivi FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'commerciale'::app_role));

DROP POLICY IF EXISTS "blocchi read" ON public.blocchi_preventivo;
CREATE POLICY "blocchi read" ON public.blocchi_preventivo FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'commerciale'::app_role));

DROP POLICY IF EXISTS "cantieri read" ON public.cantieri;
CREATE POLICY "cantieri read" ON public.cantieri FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'commerciale'::app_role));
DROP TABLE IF EXISTS public._staging_cat_note;
CREATE TABLE public._staging_cat_note (
  codice text,
  art_for text,
  categoria text,
  note text
);
GRANT ALL ON public._staging_cat_note TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public._staging_cat_note TO authenticated;
ALTER TABLE public._staging_cat_note ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staging admin" ON public._staging_cat_note FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE TABLE public.matrice_ricarichi (
  categoria text PRIMARY KEY,
  descrizione_categoria text,
  macro_gruppo text,
  ricarico_a numeric,
  ricarico_b numeric,
  ricarico_c numeric,
  ricarico_soci numeric,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.matrice_ricarichi TO authenticated;
GRANT ALL ON public.matrice_ricarichi TO service_role;

ALTER TABLE public.matrice_ricarichi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "matrice read" ON public.matrice_ricarichi
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "matrice admin write" ON public.matrice_ricarichi
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER matrice_ricarichi_set_updated_at
  BEFORE UPDATE ON public.matrice_ricarichi
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.matrice_ricarichi (categoria, descrizione_categoria, macro_gruppo, ricarico_a, ricarico_b, ricarico_c, ricarico_soci) VALUES
('A','LASTRE STANDARD','LASTRE',20.0,25.4,33.4,6.0),
('B','LASTRE TECNICHE','LASTRE',25.0,30.6,38.9,6.0),
('C','LASTRE ACCOPPIATE','LASTRE',40.1,46.3,55.6,6.0),
('D','LASTRE PER ESTERNO','LASTRE',30.0,35.8,44.5,6.0),
('E','STRUTTURA CARTONGESSO','STRUTTURA',40.1,46.3,55.6,6.0),
('F','VITI E TASSELLI','FERRAMENTA',70.1,77.6,89.0,6.0),
('G','ACCESSORI CARTONGESSO','ACCESSORI',70.1,77.6,89.0,6.0),
('H','POLVERI','POLVERI',40.1,46.3,55.6,6.0),
('I','ISOLANTI','ISOLANTI',37.0,43.1,52.2,6.0),
('J','FRESATI, BOTOLE E PEZZI SPECIALI','FRESATI',40.1,46.3,55.6,6.0),
('K','PROFILI METALLICI CARTONGESSO','PROFILI',60.0,67.1,77.8,6.0),
('L','PANNELLI MODULARI FIBRA E LANA','CONTROSOFFITTI',40.1,46.3,55.6,6.0),
('M','PROFILI PER CONTROSOFFITTI','PROFILI',60.0,67.1,77.8,6.0),
('N',NULL,NULL,NULL,NULL,NULL,NULL),
('O',NULL,NULL,NULL,NULL,NULL,NULL),
('P','PORTE E CONTROTELAI','COMPLEMENTI',40.1,46.3,55.6,6.0),
('Q','SERRAMENTI E COMPLEMENTI (EDILIZIA)','COMPLEMENTI',40.1,46.3,55.6,6.0),
('R','LEGNO ACCESSORI (EDILIZIA)','LEGNO',48.1,54.7,64.6,6.0),
('S','PANNELLI MODULARI METALLO MDF','CONTROSOFFITTI',30.0,35.8,44.5,6.0),
('T',NULL,NULL,NULL,NULL,NULL,NULL),
('U',NULL,NULL,NULL,NULL,NULL,NULL),
('V',NULL,NULL,NULL,NULL,NULL,NULL),
('W',NULL,NULL,NULL,NULL,NULL,NULL),
('X',NULL,NULL,NULL,NULL,NULL,NULL),
('Y','SUPPLEMENTO','SUPPLEMENTI',10.0,10.0,10.0,6.0),
('Z','TRASPORTI','LOGISTICA',10.0,10.0,10.0,6.0);

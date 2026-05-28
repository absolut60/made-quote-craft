
-- ============ EXTENSIONS ============
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============ ENUMS ============
CREATE TYPE public.stato_articolo AS ENUM ('attivo', 'potenziale');
CREATE TYPE public.fascia_listino AS ENUM ('A', 'B', 'C', 'S', 'SOCI');
CREATE TYPE public.kit_famiglia AS ENUM ('PARETE', 'CONTROPARETE', 'CTS_CARTONGESSO', 'CTS_MODULARE', 'VELETTA', 'ALTRO');
CREATE TYPE public.tipo_driver AS ENUM ('CONSUMO', 'PASSO', 'LATI', 'INCIDENZA_FISSA');
CREATE TYPE public.tipo_doc_preventivo AS ENUM ('PREVENTIVO', 'PROPOSTA_RAPIDA', 'LISTA_MATERIALI', 'LISTA_MAT_FORNITORE');
CREATE TYPE public.stato_preventivo AS ENUM ('bozza', 'inviato', 'confermato');
CREATE TYPE public.tipo_riga_preventivo AS ENUM ('da_kit', 'articolo_singolo', 'manuale', 'sotto_totale', 'nota', 'separatore');

-- ============ TIMESTAMP TRIGGER FN ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============ FORNITORI ============
CREATE TABLE public.fornitori (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ragione_sociale TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fornitori TO authenticated;
GRANT ALL ON public.fornitori TO service_role;
ALTER TABLE public.fornitori ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read fornitori" ON public.fornitori FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write fornitori" ON public.fornitori FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_fornitori_updated BEFORE UPDATE ON public.fornitori FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ ARTICOLI ============
CREATE TABLE public.articoli (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cod_gamma TEXT,
  cod_fornitore TEXT,
  fornitore_id UUID REFERENCES public.fornitori(id) ON DELETE SET NULL,
  descrizione TEXT NOT NULL,
  um TEXT,
  qta_fornitore NUMERIC(14,4),
  qta_cliente NUMERIC(14,4),
  peso_unit NUMERIC(14,4),
  categoria TEXT,
  tipologia TEXT,
  componente TEXT,
  stato public.stato_articolo NOT NULL DEFAULT 'attivo',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.articoli TO authenticated;
GRANT ALL ON public.articoli TO service_role;
ALTER TABLE public.articoli ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read articoli" ON public.articoli FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write articoli" ON public.articoli FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_articoli_updated BEFORE UPDATE ON public.articoli FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_articoli_cod_gamma ON public.articoli (cod_gamma);
CREATE INDEX idx_articoli_cod_fornitore ON public.articoli (cod_fornitore);
CREATE INDEX idx_articoli_fornitore_id ON public.articoli (fornitore_id);
CREATE INDEX idx_articoli_categoria ON public.articoli (categoria);
CREATE INDEX idx_articoli_tipologia ON public.articoli (tipologia);
CREATE INDEX idx_articoli_stato ON public.articoli (stato);
CREATE INDEX idx_articoli_descrizione_trgm ON public.articoli USING gin (descrizione public.gin_trgm_ops);
CREATE INDEX idx_articoli_descrizione_fts ON public.articoli USING gin (to_tsvector('italian', coalesce(descrizione, '')));

-- ============ LISTINI ACQUISTO ============
CREATE TABLE public.listini_acquisto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  articolo_id UUID NOT NULL REFERENCES public.articoli(id) ON DELETE CASCADE,
  costo NUMERIC(14,4),
  sc1 NUMERIC(7,4),
  sc2 NUMERIC(7,4),
  sc3 NUMERIC(7,4),
  sc4 NUMERIC(7,4),
  sc5 NUMERIC(7,4),
  trasporto_eur NUMERIC(14,4),
  trasporto_perc NUMERIC(7,4),
  costo_parziale NUMERIC(14,4),
  costo_netto NUMERIC(14,4),
  listino_for TEXT,
  condizioni TEXT,
  data_validita DATE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listini_acquisto TO authenticated;
GRANT ALL ON public.listini_acquisto TO service_role;
ALTER TABLE public.listini_acquisto ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read listini_acquisto" ON public.listini_acquisto FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write listini_acquisto" ON public.listini_acquisto FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_listini_acquisto_updated BEFORE UPDATE ON public.listini_acquisto FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_listini_acquisto_articolo ON public.listini_acquisto (articolo_id);
CREATE INDEX idx_listini_acquisto_data ON public.listini_acquisto (data_validita DESC);

-- ============ LISTINI VENDITA ============
CREATE TABLE public.listini_vendita (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  articolo_id UUID NOT NULL REFERENCES public.articoli(id) ON DELETE CASCADE,
  fascia public.fascia_listino NOT NULL,
  ricarico NUMERIC(7,4),
  prezzo NUMERIC(14,4),
  margine NUMERIC(7,4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (articolo_id, fascia)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listini_vendita TO authenticated;
GRANT ALL ON public.listini_vendita TO service_role;
ALTER TABLE public.listini_vendita ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read listini_vendita" ON public.listini_vendita FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write listini_vendita" ON public.listini_vendita FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_listini_vendita_updated BEFORE UPDATE ON public.listini_vendita FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_listini_vendita_articolo ON public.listini_vendita (articolo_id);

-- ============ KIT ============
CREATE TABLE public.kit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  famiglia public.kit_famiglia NOT NULL DEFAULT 'ALTRO',
  spessore NUMERIC(10,2),
  tipo_struttura TEXT,
  h_max NUMERIC(10,2),
  isolante TEXT,
  descrizione_tecnica TEXT,
  um_base TEXT NOT NULL DEFAULT 'mq',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kit TO authenticated;
GRANT ALL ON public.kit TO service_role;
ALTER TABLE public.kit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read kit" ON public.kit FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write kit" ON public.kit FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_kit_updated BEFORE UPDATE ON public.kit FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_kit_famiglia ON public.kit (famiglia);
CREATE INDEX idx_kit_nome ON public.kit (nome);

-- ============ KIT COMPONENTI ============
CREATE TABLE public.kit_componenti (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_id UUID NOT NULL REFERENCES public.kit(id) ON DELETE CASCADE,
  articolo_id UUID NOT NULL REFERENCES public.articoli(id) ON DELETE RESTRICT,
  ruolo TEXT,
  lato INTEGER,
  strato INTEGER,
  tipo_driver public.tipo_driver,
  valore_driver NUMERIC(14,4),
  incidenza NUMERIC(14,6),
  ordine NUMERIC(14,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kit_componenti TO authenticated;
GRANT ALL ON public.kit_componenti TO service_role;
ALTER TABLE public.kit_componenti ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read kit_componenti" ON public.kit_componenti FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write kit_componenti" ON public.kit_componenti FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_kit_componenti_updated BEFORE UPDATE ON public.kit_componenti FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_kit_componenti_kit ON public.kit_componenti (kit_id, ordine);
CREATE INDEX idx_kit_componenti_articolo ON public.kit_componenti (articolo_id);

-- ============ COMUNI ============
CREATE TABLE public.comuni (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  provincia TEXT,
  cap TEXT,
  codice_istat TEXT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comuni TO authenticated;
GRANT ALL ON public.comuni TO service_role;
ALTER TABLE public.comuni ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read comuni" ON public.comuni FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write comuni" ON public.comuni FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_comuni_nome ON public.comuni (nome);
CREATE INDEX idx_comuni_provincia ON public.comuni (provincia);
CREATE INDEX idx_comuni_cap ON public.comuni (cap);
CREATE INDEX idx_comuni_istat ON public.comuni (codice_istat);

-- ============ AGENTI ============
CREATE TABLE public.agenti (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  filiale TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agenti TO authenticated;
GRANT ALL ON public.agenti TO service_role;
ALTER TABLE public.agenti ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read agenti" ON public.agenti FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write agenti" ON public.agenti FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_agenti_updated BEFORE UPDATE ON public.agenti FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ CLIENTI ============
CREATE TABLE public.clienti (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ragione_sociale TEXT NOT NULL,
  id_cliente TEXT,
  piva TEXT,
  indirizzo TEXT,
  comune_id UUID REFERENCES public.comuni(id) ON DELETE SET NULL,
  prov TEXT,
  cap TEXT,
  filiale TEXT,
  agente_id UUID REFERENCES public.agenti(id) ON DELETE SET NULL,
  fascia_listino_default public.fascia_listino,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clienti TO authenticated;
GRANT ALL ON public.clienti TO service_role;
ALTER TABLE public.clienti ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read clienti" ON public.clienti FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write clienti" ON public.clienti FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_clienti_updated BEFORE UPDATE ON public.clienti FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_clienti_ragione_sociale ON public.clienti (ragione_sociale);
CREATE INDEX idx_clienti_ragione_sociale_trgm ON public.clienti USING gin (ragione_sociale public.gin_trgm_ops);
CREATE INDEX idx_clienti_id_cliente ON public.clienti (id_cliente);
CREATE INDEX idx_clienti_piva ON public.clienti (piva);
CREATE INDEX idx_clienti_agente ON public.clienti (agente_id);

-- ============ CANTIERI ============
CREATE TABLE public.cantieri (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clienti(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  indirizzo TEXT,
  comune_id UUID REFERENCES public.comuni(id) ON DELETE SET NULL,
  prov TEXT,
  cap TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cantieri TO authenticated;
GRANT ALL ON public.cantieri TO service_role;
ALTER TABLE public.cantieri ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read cantieri" ON public.cantieri FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write cantieri" ON public.cantieri FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_cantieri_updated BEFORE UPDATE ON public.cantieri FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_cantieri_cliente ON public.cantieri (cliente_id);

-- ============ PREVENTIVI ============
CREATE TABLE public.preventivi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  validita DATE,
  cliente_id UUID REFERENCES public.clienti(id) ON DELETE SET NULL,
  cantiere_id UUID REFERENCES public.cantieri(id) ON DELETE SET NULL,
  agente_id UUID REFERENCES public.agenti(id) ON DELETE SET NULL,
  filiale TEXT,
  fascia_listino public.fascia_listino,
  tipo_doc public.tipo_doc_preventivo NOT NULL DEFAULT 'PREVENTIVO',
  stato public.stato_preventivo NOT NULL DEFAULT 'bozza',
  totale_imponibile NUMERIC(14,2) DEFAULT 0,
  iva_perc NUMERIC(5,2) DEFAULT 22,
  iva_importo NUMERIC(14,2) DEFAULT 0,
  totale NUMERIC(14,2) DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.preventivi TO authenticated;
GRANT ALL ON public.preventivi TO service_role;
ALTER TABLE public.preventivi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read preventivi" ON public.preventivi FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write preventivi" ON public.preventivi FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_preventivi_updated BEFORE UPDATE ON public.preventivi FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_preventivi_cliente ON public.preventivi (cliente_id);
CREATE INDEX idx_preventivi_cantiere ON public.preventivi (cantiere_id);
CREATE INDEX idx_preventivi_data ON public.preventivi (data DESC);
CREATE INDEX idx_preventivi_stato ON public.preventivi (stato);
CREATE INDEX idx_preventivi_numero ON public.preventivi (numero);

-- ============ BLOCCHI PREVENTIVO ============
CREATE TABLE public.blocchi_preventivo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preventivo_id UUID NOT NULL REFERENCES public.preventivi(id) ON DELETE CASCADE,
  rif_capitolato TEXT,
  descrizione TEXT,
  kit_id UUID REFERENCES public.kit(id) ON DELETE SET NULL,
  quantita_base NUMERIC(14,4),
  um_base TEXT,
  prezzo_um NUMERIC(14,4),
  importo NUMERIC(14,2),
  ordine NUMERIC(14,4) NOT NULL DEFAULT 0,
  note_tecniche TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blocchi_preventivo TO authenticated;
GRANT ALL ON public.blocchi_preventivo TO service_role;
ALTER TABLE public.blocchi_preventivo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read blocchi_preventivo" ON public.blocchi_preventivo FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write blocchi_preventivo" ON public.blocchi_preventivo FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_blocchi_preventivo_updated BEFORE UPDATE ON public.blocchi_preventivo FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_blocchi_preventivo ON public.blocchi_preventivo (preventivo_id, ordine);
CREATE INDEX idx_blocchi_kit ON public.blocchi_preventivo (kit_id);

-- ============ RIGHE PREVENTIVO ============
CREATE TABLE public.righe_preventivo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocco_id UUID NOT NULL REFERENCES public.blocchi_preventivo(id) ON DELETE CASCADE,
  tipo_riga public.tipo_riga_preventivo NOT NULL DEFAULT 'manuale',
  articolo_id UUID REFERENCES public.articoli(id) ON DELETE SET NULL,
  descrizione TEXT,
  um TEXT,
  incidenza NUMERIC(14,6),
  quantita NUMERIC(14,4),
  prezzo_unit NUMERIC(14,4),
  sconto_perc NUMERIC(7,4),
  segno INTEGER NOT NULL DEFAULT 1,
  importo NUMERIC(14,2),
  costo NUMERIC(14,4),
  ricarico NUMERIC(7,4),
  margine NUMERIC(7,4),
  vendita NUMERIC(14,4),
  peso NUMERIC(14,4),
  ordine NUMERIC(14,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT righe_segno_check CHECK (segno IN (-1, 1))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.righe_preventivo TO authenticated;
GRANT ALL ON public.righe_preventivo TO service_role;
ALTER TABLE public.righe_preventivo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read righe_preventivo" ON public.righe_preventivo FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write righe_preventivo" ON public.righe_preventivo FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_righe_preventivo_updated BEFORE UPDATE ON public.righe_preventivo FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_righe_blocco ON public.righe_preventivo (blocco_id, ordine);
CREATE INDEX idx_righe_articolo ON public.righe_preventivo (articolo_id);

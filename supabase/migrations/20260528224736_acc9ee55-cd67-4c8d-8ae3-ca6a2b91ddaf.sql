
-- Rimuovi 'S' da fascia_listino (ricreazione enum, ammessi solo A/B/C/SOCI)
ALTER TYPE public.fascia_listino RENAME TO fascia_listino_old;
CREATE TYPE public.fascia_listino AS ENUM ('A','B','C','SOCI');

ALTER TABLE public.listini_vendita ALTER COLUMN fascia TYPE public.fascia_listino USING fascia::text::public.fascia_listino;
ALTER TABLE public.clienti ALTER COLUMN fascia_listino_default TYPE public.fascia_listino USING fascia_listino_default::text::public.fascia_listino;
ALTER TABLE public.preventivi ALTER COLUMN fascia_listino TYPE public.fascia_listino USING fascia_listino::text::public.fascia_listino;

DROP TYPE public.fascia_listino_old;

-- Aggiungi colonne mancanti su kit (passo) e colonne temporanee per import
ALTER TABLE public.kit ADD COLUMN IF NOT EXISTS passo numeric;
ALTER TABLE public.kit ADD COLUMN IF NOT EXISTS passo_um text;
ALTER TABLE public.kit ADD COLUMN IF NOT EXISTS import_kit_id integer;
ALTER TABLE public.articoli ADD COLUMN IF NOT EXISTS import_key text;
CREATE INDEX IF NOT EXISTS idx_articoli_import_key ON public.articoli(import_key);
CREATE INDEX IF NOT EXISTS idx_kit_import_kit_id ON public.kit(import_kit_id);

-- I componenti di kit possono non avere un articolo collegato (es. "SENZA ISOLANTE")
ALTER TABLE public.kit_componenti ALTER COLUMN articolo_id DROP NOT NULL;

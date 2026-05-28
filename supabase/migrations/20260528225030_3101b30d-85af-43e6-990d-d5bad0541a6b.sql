
DROP INDEX IF EXISTS public.idx_articoli_import_key;
DROP INDEX IF EXISTS public.idx_kit_import_kit_id;
ALTER TABLE public.articoli DROP COLUMN IF EXISTS import_key;
ALTER TABLE public.kit DROP COLUMN IF EXISTS import_kit_id;

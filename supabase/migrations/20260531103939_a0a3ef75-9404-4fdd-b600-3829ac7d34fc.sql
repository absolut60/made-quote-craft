
-- Fase 2 ordini: tracciabilità quantità ordinate per riga di preventivo
-- e riferimento alla riga di origine sulle righe d'ordine.

ALTER TABLE public.righe_preventivo
  ADD COLUMN IF NOT EXISTS qta_ordinata numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS riga_origine_id uuid NULL
    REFERENCES public.righe_preventivo(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_righe_riga_origine
  ON public.righe_preventivo(riga_origine_id);

-- Vincolo: qta_ordinata non può superare la quantita (quando entrambe valorizzate)
-- e non può essere negativa.
ALTER TABLE public.righe_preventivo
  DROP CONSTRAINT IF EXISTS righe_qta_ordinata_non_negativa;
ALTER TABLE public.righe_preventivo
  ADD CONSTRAINT righe_qta_ordinata_non_negativa CHECK (qta_ordinata >= 0);

-- =========================================================================
-- RPC: trasforma_preventivo_in_ordine
-- Crea un nuovo documento tipo='ordine' a partire da una selezione di righe
-- del preventivo, in modo atomico. Aggiorna qta_ordinata sulle righe origine.
--
-- Input p_selezione JSONB:
-- [
--   {
--     "blocco_id": "uuid",
--     "righe": [ { "riga_id": "uuid", "quantita": 50 }, ... ]
--   }, ...
-- ]
-- Le righe non valorizzate (nota/separatore/sotto_totale) NON vanno passate.
-- Restituisce l'id del nuovo ordine.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.trasforma_preventivo_in_ordine(
  p_preventivo_id uuid,
  p_selezione jsonb
) RETURNS uuid
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_prev public.preventivi%ROWTYPE;
  v_ordine_id uuid;
  v_numero text;
  v_num int;
  v_aa text;
  v_anno int;
  v_blocco jsonb;
  v_riga_sel jsonb;
  v_old_blocco public.blocchi_preventivo%ROWTYPE;
  v_old_riga public.righe_preventivo%ROWTYPE;
  v_new_blocco_id uuid;
  v_blocco_ordine numeric := 0;
  v_riga_ordine numeric := 0;
  v_qta_richiesta numeric;
  v_residuo numeric;
  v_importo numeric;
  v_totale_blocco numeric;
  v_segno int;
  v_attempt int := 0;
BEGIN
  SELECT * INTO v_prev FROM public.preventivi WHERE id = p_preventivo_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Preventivo non trovato: %', p_preventivo_id;
  END IF;
  IF v_prev.tipo <> 'preventivo' THEN
    RAISE EXCEPTION 'Solo i preventivi possono essere trasformati in ordine';
  END IF;
  IF jsonb_array_length(p_selezione) = 0 THEN
    RAISE EXCEPTION 'Selezione vuota';
  END IF;

  v_anno := EXTRACT(YEAR FROM CURRENT_DATE)::int;
  v_aa := lpad((v_anno % 100)::text, 2, '0');

  -- Numerazione ordine con retry su collisione (max 5 tentativi)
  LOOP
    v_num := public.prossimo_numero_ordine(v_anno);
    v_numero := 'ORD-' || v_num || '/' || v_aa;
    BEGIN
      INSERT INTO public.preventivi (
        numero, data, validita, cliente_id, cantiere_id, agente_id, filiale,
        fascia_listino, tipo_doc, stato, iva_perc, sconto_piede_perc,
        tipo, preventivo_origine_id
      ) VALUES (
        v_numero, CURRENT_DATE, NULL, v_prev.cliente_id, v_prev.cantiere_id,
        v_prev.agente_id, v_prev.filiale, v_prev.fascia_listino,
        v_prev.tipo_doc, 'bozza', v_prev.iva_perc, 0,
        'ordine', v_prev.id
      ) RETURNING id INTO v_ordine_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      v_attempt := v_attempt + 1;
      IF v_attempt >= 5 THEN
        RAISE EXCEPTION 'Impossibile assegnare un numero ordine libero';
      END IF;
    END;
  END LOOP;

  -- Itera blocchi selezionati
  FOR v_blocco IN SELECT * FROM jsonb_array_elements(p_selezione)
  LOOP
    SELECT * INTO v_old_blocco
      FROM public.blocchi_preventivo
     WHERE id = (v_blocco->>'blocco_id')::uuid
       AND preventivo_id = p_preventivo_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Blocco non valido: %', v_blocco->>'blocco_id';
    END IF;
    IF jsonb_array_length(v_blocco->'righe') = 0 THEN CONTINUE; END IF;

    v_blocco_ordine := v_blocco_ordine + 10;

    INSERT INTO public.blocchi_preventivo (
      preventivo_id, descrizione, rif_capitolato, note_tecniche,
      um_base, quantita_base, kit_id, ordine
    ) VALUES (
      v_ordine_id, v_old_blocco.descrizione, v_old_blocco.rif_capitolato,
      v_old_blocco.note_tecniche, v_old_blocco.um_base,
      v_old_blocco.quantita_base, v_old_blocco.kit_id, v_blocco_ordine
    ) RETURNING id INTO v_new_blocco_id;

    v_riga_ordine := 0;
    v_totale_blocco := 0;

    FOR v_riga_sel IN SELECT * FROM jsonb_array_elements(v_blocco->'righe')
    LOOP
      v_qta_richiesta := (v_riga_sel->>'quantita')::numeric;
      IF v_qta_richiesta IS NULL OR v_qta_richiesta <= 0 THEN CONTINUE; END IF;

      -- LOCK la riga origine per evitare race su qta_ordinata
      SELECT * INTO v_old_riga
        FROM public.righe_preventivo
       WHERE id = (v_riga_sel->>'riga_id')::uuid
         AND blocco_id = v_old_blocco.id
       FOR UPDATE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Riga non valida: %', v_riga_sel->>'riga_id';
      END IF;
      IF v_old_riga.tipo_riga NOT IN ('articolo_singolo','da_kit','manuale') THEN
        CONTINUE;
      END IF;

      v_residuo := COALESCE(v_old_riga.quantita, 0) - COALESCE(v_old_riga.qta_ordinata, 0);
      IF v_qta_richiesta > v_residuo + 0.0001 THEN
        RAISE EXCEPTION 'Quantità richiesta (%) supera il residuo (%) per la riga %',
          v_qta_richiesta, v_residuo, v_old_riga.id;
      END IF;

      v_riga_ordine := v_riga_ordine + 10;
      v_segno := COALESCE(v_old_riga.segno, 1);
      v_importo := round(
        v_qta_richiesta * COALESCE(v_old_riga.prezzo_unit, 0)
          * (1 - COALESCE(v_old_riga.sconto_perc, 0) / 100.0)
          * v_segno, 2);

      INSERT INTO public.righe_preventivo (
        blocco_id, tipo_riga, articolo_id, descrizione, um,
        incidenza, quantita, prezzo_unit, sconto_perc, segno,
        importo, costo, ricarico, margine, peso, vendita,
        ordine, riga_origine_id, qta_ordinata
      ) VALUES (
        v_new_blocco_id, v_old_riga.tipo_riga, v_old_riga.articolo_id,
        v_old_riga.descrizione, v_old_riga.um,
        v_old_riga.incidenza, v_qta_richiesta, v_old_riga.prezzo_unit,
        v_old_riga.sconto_perc, v_segno,
        v_importo,
        CASE WHEN COALESCE(v_old_riga.quantita,0) > 0
             THEN round(COALESCE(v_old_riga.costo,0) * v_qta_richiesta / v_old_riga.quantita, 2)
             ELSE 0 END,
        v_old_riga.ricarico, v_old_riga.margine,
        CASE WHEN COALESCE(v_old_riga.quantita,0) > 0
             THEN round(COALESCE(v_old_riga.peso,0) * v_qta_richiesta / v_old_riga.quantita, 2)
             ELSE 0 END,
        CASE WHEN COALESCE(v_old_riga.quantita,0) > 0
             THEN round(COALESCE(v_old_riga.vendita,0) * v_qta_richiesta / v_old_riga.quantita, 2)
             ELSE 0 END,
        v_riga_ordine, v_old_riga.id, 0
      );

      v_totale_blocco := v_totale_blocco + v_importo;

      UPDATE public.righe_preventivo
         SET qta_ordinata = COALESCE(qta_ordinata, 0) + v_qta_richiesta
       WHERE id = v_old_riga.id;
    END LOOP;

    -- Aggiorna totale del blocco ordine
    UPDATE public.blocchi_preventivo
       SET importo = round(v_totale_blocco, 2),
           prezzo_um = CASE WHEN COALESCE(quantita_base,0) > 0
                            THEN round(v_totale_blocco / quantita_base, 2)
                            ELSE NULL END
     WHERE id = v_new_blocco_id;
  END LOOP;

  -- Ricalcola totale documento ordine
  UPDATE public.preventivi p
     SET totale_imponibile = sub.totale,
         iva_importo = round(sub.totale * COALESCE(p.iva_perc,22) / 100.0, 2),
         totale = round(sub.totale + sub.totale * COALESCE(p.iva_perc,22) / 100.0, 2)
    FROM (
      SELECT COALESCE(SUM(importo),0) AS totale
        FROM public.blocchi_preventivo
       WHERE preventivo_id = v_ordine_id
    ) sub
   WHERE p.id = v_ordine_id;

  RETURN v_ordine_id;
END;
$$;

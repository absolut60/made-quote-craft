import type { BloccoConRighe, PreventivoConDettagli } from "./preventivi-api";
import { calcolaBlocco } from "./preventivi-api";
import { round2 } from "./pricing";

// =========================================================================
// Aggregazione materiali per Lista Materiali e Lista Mat. Fornitore
// =========================================================================

export interface MaterialeAggregato {
  articolo_id: string;
  cod_gamma: string | null;
  descrizione: string;
  um: string | null;
  fornitore_id: string | null;
  fornitore_nome: string | null;
  qta_confezione: number; // qta_fornitore dell'articolo (es. 192 mq/bancale)
  /** Quantità teorica sommata su tutti i blocchi (incidenza × quantita_base in pratica
   *  coincide con la somma di `quantita` di tutte le righe che referenziano l'articolo). */
  qta_teorica: number;
  peso_totale: number;
}

export interface MaterialeFornitore extends MaterialeAggregato {
  /** Numero di confezioni intere da ordinare. */
  n_confezioni: number;
  /** Quantità arrotondata (n_confezioni × qta_confezione). */
  qta_ordine: number;
}

export interface GruppoFornitore {
  fornitore_id: string | null;
  fornitore_nome: string;
  righe: MaterialeFornitore[];
}

const n = (v: unknown): number => {
  if (v == null || v === "") return 0;
  const x = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return Number.isFinite(x) ? x : 0;
};

/**
 * Aggrega tutti i materiali di un preventivo: somma le quantità delle righe che
 * hanno un articolo_id, ignorando le righe note/separatore/sotto_totale.
 */
export function aggregaMateriali(blocchi: BloccoConRighe[]): MaterialeAggregato[] {
  const map = new Map<string, MaterialeAggregato>();
  for (const b of blocchi) {
    for (const r of b.righe) {
      if (!r.articolo_id) continue;
      if (r.tipo_riga === "nota" || r.tipo_riga === "separatore" || r.tipo_riga === "sotto_totale") continue;
      const segno = r.segno === -1 ? -1 : 1;
      const q = n(r.quantita) * segno;
      const a = r.articolo;
      const key = r.articolo_id;
      const cur = map.get(key);
      if (cur) {
        cur.qta_teorica = round2(cur.qta_teorica + q);
        cur.peso_totale = round2(cur.peso_totale + q * n(a?.peso_unit));
      } else {
        // qta_fornitore non viene dal join standard — verrà aggiunto dal chiamante che fa il fetch articoli completi.
        map.set(key, {
          articolo_id: r.articolo_id,
          cod_gamma: a?.cod_gamma ?? null,
          descrizione: a?.descrizione ?? r.descrizione ?? "",
          um: a?.um ?? r.um ?? null,
          fornitore_id: null,
          fornitore_nome: null,
          qta_confezione: 0,
          qta_teorica: round2(q),
          peso_totale: round2(q * n(a?.peso_unit)),
        });
      }
    }
  }
  return [...map.values()].sort((a, b) =>
    (a.cod_gamma ?? "").localeCompare(b.cod_gamma ?? "") ||
    a.descrizione.localeCompare(b.descrizione),
  );
}

/**
 * Arrotonda le quantità ai minimi di vendita (qta_fornitore) e raggruppa per fornitore.
 * Se qta_confezione <= 0 la quantità non viene arrotondata (1 confezione = qta_teorica).
 */
export function arrotondaPerFornitore(materiali: MaterialeAggregato[]): GruppoFornitore[] {
  const arrotondati: MaterialeFornitore[] = materiali.map((m) => {
    if (m.qta_confezione > 0 && m.qta_teorica > 0) {
      const n_conf = Math.ceil(m.qta_teorica / m.qta_confezione);
      return {
        ...m,
        n_confezioni: n_conf,
        qta_ordine: round2(n_conf * m.qta_confezione),
      };
    }
    return { ...m, n_confezioni: m.qta_teorica > 0 ? 1 : 0, qta_ordine: round2(m.qta_teorica) };
  });

  const gruppi = new Map<string, GruppoFornitore>();
  for (const m of arrotondati) {
    const key = m.fornitore_id ?? "__none__";
    const nome = m.fornitore_nome ?? "Senza fornitore";
    const g = gruppi.get(key);
    if (g) g.righe.push(m);
    else gruppi.set(key, { fornitore_id: m.fornitore_id, fornitore_nome: nome, righe: [m] });
  }
  return [...gruppi.values()].sort((a, b) => a.fornitore_nome.localeCompare(b.fornitore_nome));
}

// =========================================================================
// Totali blocco riassuntivi (per PDF preventivo / proposta rapida)
// =========================================================================

export interface BloccoOutput {
  id: string;
  rif: string;
  descrizione: string;
  note_tecniche: string | null;
  um: string;
  quantita: number;
  prezzo_um: number;
  importo: number;
  righe: BloccoConRighe["righe"];
}

export function buildBlocchiOutput(prev: PreventivoConDettagli): BloccoOutput[] {
  return prev.blocchi.map((b) => {
    const calc = calcolaBlocco(b.righe);
    const totale = calc.totale || n(b.importo);
    const q = n(b.quantita_base);
    const prezzo_um = q > 0 ? round2(totale / q) : n(b.prezzo_um);
    return {
      id: b.id,
      rif: b.rif_capitolato ?? "",
      descrizione: b.descrizione ?? "",
      note_tecniche: b.note_tecniche ?? null,
      um: b.um_base ?? "mq",
      quantita: q,
      prezzo_um,
      importo: round2(totale),
      righe: b.righe,
    };
  });
}

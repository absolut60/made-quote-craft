import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { round2 } from "./pricing";
import {
  calcolaRigaKit,
  fetchKit,
  type FasciaListino,
} from "./kit-api";

export type Preventivo = Database["public"]["Tables"]["preventivi"]["Row"];
export type PreventivoInsert = Database["public"]["Tables"]["preventivi"]["Insert"];
export type PreventivoUpdate = Database["public"]["Tables"]["preventivi"]["Update"];
export type Blocco = Database["public"]["Tables"]["blocchi_preventivo"]["Row"];
export type BloccoInsert = Database["public"]["Tables"]["blocchi_preventivo"]["Insert"];
export type BloccoUpdate = Database["public"]["Tables"]["blocchi_preventivo"]["Update"];
export type Riga = Database["public"]["Tables"]["righe_preventivo"]["Row"];
export type RigaInsert = Database["public"]["Tables"]["righe_preventivo"]["Insert"];
export type RigaUpdate = Database["public"]["Tables"]["righe_preventivo"]["Update"];
export type TipoDoc = Database["public"]["Enums"]["tipo_doc_preventivo"];
export type StatoPreventivo = Database["public"]["Enums"]["stato_preventivo"];
export type TipoRiga = Database["public"]["Enums"]["tipo_riga_preventivo"];

export const TIPI_DOC: TipoDoc[] = [
  "PREVENTIVO",
  "PROPOSTA_RAPIDA",
  "LISTA_MATERIALI",
  "LISTA_MAT_FORNITORE",
];
export const TIPI_DOC_LABEL: Record<TipoDoc, string> = {
  PREVENTIVO: "Preventivo",
  PROPOSTA_RAPIDA: "Proposta rapida",
  LISTA_MATERIALI: "Lista materiali",
  LISTA_MAT_FORNITORE: "Lista mat. fornitore",
};
export const STATI: StatoPreventivo[] = ["bozza", "inviato", "confermato"];
export const STATI_LABEL: Record<StatoPreventivo, string> = {
  bozza: "Bozza",
  inviato: "Inviato",
  confermato: "Confermato",
};
export const TIPI_RIGA: TipoRiga[] = [
  "articolo_singolo",
  "da_kit",
  "manuale",
  "sotto_totale",
  "nota",
  "separatore",
];
export const TIPI_RIGA_LABEL: Record<TipoRiga, string> = {
  articolo_singolo: "Articolo",
  da_kit: "Da kit",
  manuale: "Manuale",
  sotto_totale: "Sotto-totale",
  nota: "Nota",
  separatore: "Separatore",
};

const n = (v: unknown): number => {
  if (v === null || v === undefined || v === "") return 0;
  const x = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return Number.isFinite(x) ? x : 0;
};

// =========================================================================
// Liste / lookups
// =========================================================================

export interface PreventiviFilters {
  search?: string;
  cliente_id?: string | null;
  stato?: StatoPreventivo | null;
  tipo_doc?: TipoDoc | null;
}

export interface PreventivoListItem extends Preventivo {
  cliente: { id: string; ragione_sociale: string } | null;
  cantiere: { id: string; nome: string } | null;
}

export async function fetchPreventivi(f: PreventiviFilters): Promise<PreventivoListItem[]> {
  let q = supabase
    .from("preventivi")
    .select("*, cliente:clienti(id, ragione_sociale), cantiere:cantieri(id, nome)")
    .order("data", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500);
  if (f.cliente_id) q = q.eq("cliente_id", f.cliente_id);
  if (f.stato) q = q.eq("stato", f.stato);
  if (f.tipo_doc) q = q.eq("tipo_doc", f.tipo_doc);
  if (f.search?.trim()) {
    const s = f.search.trim().replace(/[%,]/g, " ");
    q = q.or(`numero.ilike.%${s}%`);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as PreventivoListItem[];
}

export type Cliente = Database["public"]["Tables"]["clienti"]["Row"];
export type Cantiere = Database["public"]["Tables"]["cantieri"]["Row"];
export type Agente = Database["public"]["Tables"]["agenti"]["Row"];

export async function searchClienti(q: string): Promise<Cliente[]> {
  let qb = supabase.from("clienti").select("*").order("ragione_sociale").limit(30);
  if (q.trim()) qb = qb.ilike("ragione_sociale", `%${q.trim()}%`);
  const { data, error } = await qb;
  if (error) throw error;
  return data ?? [];
}

export async function fetchCliente(id: string): Promise<Cliente | null> {
  const { data, error } = await supabase.from("clienti").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchCantieriByCliente(cliente_id: string): Promise<Cantiere[]> {
  const { data, error } = await supabase
    .from("cantieri")
    .select("*")
    .eq("cliente_id", cliente_id)
    .order("nome");
  if (error) throw error;
  return data ?? [];
}

export async function createCantiere(row: Database["public"]["Tables"]["cantieri"]["Insert"]) {
  const { data, error } = await supabase.from("cantieri").insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function fetchAgenti(): Promise<Agente[]> {
  const { data, error } = await supabase.from("agenti").select("*").order("nome");
  if (error) throw error;
  return data ?? [];
}

// =========================================================================
// Preventivo CRUD
// =========================================================================

export interface PreventivoConDettagli extends Preventivo {
  cliente: Cliente | null;
  cantiere: Cantiere | null;
  agente: Agente | null;
  blocchi: BloccoConRighe[];
}

export interface BloccoConRighe extends Blocco {
  righe: (Riga & {
    articolo: {
      id: string;
      cod_gamma: string | null;
      descrizione: string;
      um: string | null;
      peso_unit: number | null;
    } | null;
  })[];
}

const BLOCCHI_SELECT = `
  *,
  righe:righe_preventivo (
    *,
    articolo:articoli (id, cod_gamma, descrizione, um, peso_unit)
  )
`;

export async function fetchPreventivo(id: string): Promise<PreventivoConDettagli> {
  const { data, error } = await supabase
    .from("preventivi")
    .select(
      `*,
       cliente:clienti(*, comune:comuni(nome)),
       cantiere:cantieri(*, comune:comuni(nome)),
       agente:agenti(*),
       blocchi:blocchi_preventivo(${BLOCCHI_SELECT})`,
    )
    .eq("id", id)
    .single();
  if (error) throw error;
  const p = data as unknown as PreventivoConDettagli;
  p.blocchi.sort((a, b) => Number(a.ordine ?? 0) - Number(b.ordine ?? 0));
  for (const b of p.blocchi) {
    b.righe.sort((a, b2) => Number(a.ordine ?? 0) - Number(b2.ordine ?? 0));
  }
  return p;
}

export async function anteprimaProssimoNumero(anno?: number): Promise<string> {
  const a = anno ?? new Date().getFullYear();
  const { data, error } = await supabase.rpc("anteprima_numero_preventivo", { p_anno: a });
  if (error) throw error;
  return `PRV-${data}/${String(a).slice(-2)}`;
}

async function assegnaProssimoNumero(anno: number): Promise<string> {
  const { data, error } = await supabase.rpc("prossimo_numero_preventivo", { p_anno: anno });
  if (error) throw error;
  return `PRV-${data}/${String(anno).slice(-2)}`;
}

/**
 * Crea un preventivo gestendo il conflitto di unicità sul numero:
 * se il numero è già impegnato da un altro utente, riassegna il successivo
 * libero in modo atomico e riprova (fino a 5 tentativi).
 * Ritorna l'eventuale numero riassegnato per consentire all'UI di avvisare.
 */
export async function createPreventivo(
  row: PreventivoInsert,
): Promise<{ preventivo: Preventivo; numeroRiassegnato: string | null }> {
  const anno = new Date().getFullYear();
  let numero = (row.numero ?? "").trim();
  if (!numero) {
    numero = await assegnaProssimoNumero(anno);
  }
  let reassignedTo: string | null = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const payload = { ...row, numero };
    const { data, error } = await supabase
      .from("preventivi")
      .insert(payload)
      .select()
      .single();
    if (!error) {
      return { preventivo: data, numeroRiassegnato: reassignedTo };
    }
    // 23505 = unique_violation
    const isDup =
      error.code === "23505" ||
      /preventivi_numero_unique|duplicate key/i.test(error.message ?? "");
    if (!isDup) {
      console.error("[createPreventivo] Supabase error:", error);
      throw new Error(
        `${error.message}${error.details ? ` — ${error.details}` : ""}${error.hint ? ` (hint: ${error.hint})` : ""}${error.code ? ` [${error.code}]` : ""}`,
      );
    }
    // numero già impegnato → riassegna il successivo e ritenta
    numero = await assegnaProssimoNumero(anno);
    reassignedTo = numero;
  }
  throw new Error("Impossibile assegnare un numero libero dopo 5 tentativi");
}

export async function updatePreventivo(id: string, patch: PreventivoUpdate): Promise<Preventivo> {
  const { data, error } = await supabase
    .from("preventivi")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePreventivo(id: string) {
  const { error } = await supabase.from("preventivi").delete().eq("id", id);
  if (error) throw error;
}

// =========================================================================
// Blocchi CRUD + esplosione kit
// =========================================================================

export async function insertBlocco(row: BloccoInsert): Promise<Blocco> {
  const { data, error } = await supabase
    .from("blocchi_preventivo")
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateBlocco(id: string, patch: BloccoUpdate): Promise<Blocco> {
  const { data, error } = await supabase
    .from("blocchi_preventivo")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteBlocco(id: string) {
  const { error } = await supabase.from("blocchi_preventivo").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Applica lo sconto a piede impostando sconto_perc su TUTTE le righe valorizzate
 * (articolo_singolo, da_kit, manuale) di tutti i blocchi del preventivo, e ricalcola
 * importo di riga e totale di blocco. Costo, vendita lorda e peso restano invariati.
 */
export async function applicaScontoPiedeARighe(
  preventivo_id: string,
  perc: number,
): Promise<void> {
  const sc = Math.max(0, n(perc));
  const { data: blocchi, error: errB } = await supabase
    .from("blocchi_preventivo")
    .select("id, righe:righe_preventivo(*)")
    .eq("preventivo_id", preventivo_id);
  if (errB) throw errB;

  const updates: PromiseLike<unknown>[] = [];
  for (const b of (blocchi ?? []) as unknown as { id: string; righe: Riga[] }[]) {
    for (const r of b.righe ?? []) {
      if (r.tipo_riga !== "articolo_singolo" && r.tipo_riga !== "da_kit" && r.tipo_riga !== "manuale") continue;
      const q = n(r.quantita);
      const p = n(r.prezzo_unit);
      const segno = (r.segno ?? 1) === -1 ? -1 : 1;
      const importo = round2(q * p * (1 - sc / 100) * segno);
      updates.push(
        supabase.from("righe_preventivo").update({ sconto_perc: sc, importo }).eq("id", r.id).then(),
      );
    }
  }
  await Promise.all(updates);

  await Promise.all(
    ((blocchi ?? []) as unknown as { id: string; righe: Riga[] }[]).map((b) => {
      let totale = 0;
      for (const r of b.righe ?? []) {
        if (r.tipo_riga === "nota" || r.tipo_riga === "separatore" || r.tipo_riga === "sotto_totale") continue;
        if (r.tipo_riga === "articolo_singolo" || r.tipo_riga === "da_kit" || r.tipo_riga === "manuale") {
          const q = n(r.quantita);
          const p = n(r.prezzo_unit);
          const segno = (r.segno ?? 1) === -1 ? -1 : 1;
          totale += q * p * (1 - sc / 100) * segno;
        } else {
          totale += n(r.importo);
        }
      }
      return supabase.from("blocchi_preventivo").update({ importo: round2(totale) }).eq("id", b.id).then();
    }),
  );
}

/** Crea un blocco vuoto in fondo al preventivo. */
export async function addBloccoVuoto(preventivo_id: string, ordineNext: number): Promise<Blocco> {
  return insertBlocco({
    preventivo_id,
    descrizione: "Nuovo blocco",
    um_base: "mq",
    quantita_base: 0,
    ordine: ordineNext,
  });
}

/**
 * Crea un blocco a partire da un kit della libreria.
 * Inserisce il blocco e poi esplode i kit_componenti in righe del blocco.
 */
export async function addBloccoDaKit(args: {
  preventivo_id: string;
  kit_id: string;
  quantita_base: number;
  fascia: FasciaListino;
  ordine: number;
}): Promise<Blocco> {
  const kit = await fetchKit(args.kit_id);
  const totali = kit.componenti.reduce(
    (acc, c) => {
      const r = calcolaRigaKit(c, c.articolo, args.fascia);
      acc.prezzo += r.vendita_riga;
      acc.costo += r.costo_riga;
      return acc;
    },
    { prezzo: 0, costo: 0 },
  );

  const blocco = await insertBlocco({
    preventivo_id: args.preventivo_id,
    kit_id: args.kit_id,
    descrizione: kit.nome,
    um_base: kit.um_base,
    quantita_base: args.quantita_base,
    prezzo_um: round2(totali.prezzo),
    importo: round2(totali.prezzo * args.quantita_base),
    note_tecniche: kit.descrizione_tecnica,
    ordine: args.ordine,
  });

  const righeRows: RigaInsert[] = kit.componenti.map((c, idx) => {
    const r = calcolaRigaKit(c, c.articolo, args.fascia);
    const incidenza = r.incidenza_effettiva;
    const quantita = round2(incidenza * args.quantita_base);
    return {
      blocco_id: blocco.id,
      tipo_riga: "da_kit",
      articolo_id: c.articolo_id,
      descrizione: c.articolo?.descrizione ?? c.ruolo ?? null,
      um: c.articolo?.um ?? null,
      incidenza,
      quantita,
      prezzo_unit: r.vendita_unit,
      sconto_perc: 0,
      segno: 1,
      importo: round2(r.vendita_unit * quantita),
      costo: round2(r.costo_unit * quantita),
      vendita: round2(r.vendita_unit * quantita),
      peso: round2((c.articolo?.peso_unit ?? 0) * quantita),
      ordine: idx + 1,
    };
  });
  if (righeRows.length) {
    const { error } = await supabase.from("righe_preventivo").insert(righeRows);
    if (error) throw error;
  }
  return blocco;
}

// =========================================================================
// Righe CRUD
// =========================================================================

export async function insertRiga(row: RigaInsert): Promise<Riga> {
  const { data, error } = await supabase
    .from("righe_preventivo")
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateRiga(id: string, patch: RigaUpdate): Promise<Riga> {
  const { data, error } = await supabase
    .from("righe_preventivo")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRiga(id: string) {
  const { error } = await supabase.from("righe_preventivo").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Quando l'utente cambia la quantità base di un blocco, ricalcola in batch
 * la quantità e gli importi delle righe derivate ('da_kit' e 'articolo_singolo')
 * preservando incidenza, prezzo unitario, sconto, segno e costo/vendita/peso
 * UNITARI (derivati dai valori salvati).
 * Le righe 'manuale', 'nota', 'separatore', 'sotto_totale' non vengono toccate.
 * Aggiorna inoltre il blocco con il nuovo importo totale e prezzo/UM.
 */
export async function ricalcolaBloccoSuNuovaQuantita(
  blocco_id: string,
  nuovaQuantitaBase: number | null,
  righe: Riga[],
): Promise<void> {
  const qBase = n(nuovaQuantitaBase);
  const aggiornate: { id: string; importo: number }[] = [];

  await Promise.all(
    righe.map(async (r) => {
      if (r.tipo_riga !== "da_kit" && r.tipo_riga !== "articolo_singolo") return;
      const inc = r.incidenza == null ? null : n(r.incidenza);
      if (inc == null) return;
      const oldQta = n(r.quantita) || 1;
      const nuovaQta = round2(inc * qBase);
      const prezzo = n(r.prezzo_unit);
      const sc = n(r.sconto_perc);
      const segno = (r.segno ?? 1) === -1 ? -1 : 1;
      const nuovoImporto = round2(prezzo * nuovaQta * (1 - sc / 100) * segno);
      const nuovoCosto = round2((n(r.costo) / oldQta) * nuovaQta);
      const nuovaVendita = round2((n(r.vendita) / oldQta) * nuovaQta);
      const nuovoPeso = round2((n(r.peso) / oldQta) * nuovaQta);
      const { error } = await supabase
        .from("righe_preventivo")
        .update({
          quantita: nuovaQta,
          importo: nuovoImporto,
          costo: nuovoCosto,
          vendita: nuovaVendita,
          peso: nuovoPeso,
        })
        .eq("id", r.id);
      if (error) throw error;
      aggiornate.push({ id: r.id, importo: nuovoImporto });
    }),
  );

  // Somma importi: righe ricalcolate + righe non toccate (manuale ecc.) escluse nota/separatore/sotto_totale
  let totale = 0;
  for (const r of righe) {
    if (r.tipo_riga === "nota" || r.tipo_riga === "separatore" || r.tipo_riga === "sotto_totale") continue;
    if (r.tipo_riga === "da_kit" || r.tipo_riga === "articolo_singolo") {
      const inc = r.incidenza == null ? null : n(r.incidenza);
      if (inc != null) {
        const a = aggiornate.find((x) => x.id === r.id);
        if (a) { totale += a.importo; continue; }
      }
    }
    totale += n(r.importo);
  }
  totale = round2(totale);
  const prezzoUm = qBase > 0 ? round2(totale / qBase) : null;

  const patch: BloccoUpdate = {
    quantita_base: nuovaQuantitaBase,
    importo: totale,
    prezzo_um: prezzoUm,
  };
  const { error } = await supabase.from("blocchi_preventivo").update(patch).eq("id", blocco_id);
  if (error) throw error;
}

export async function reorderRighe(updates: { id: string; ordine: number }[]) {
  await Promise.all(
    updates.map((u) =>
      supabase.from("righe_preventivo").update({ ordine: u.ordine }).eq("id", u.id),
    ),
  );
}

export async function reorderBlocchi(updates: { id: string; ordine: number }[]) {
  await Promise.all(
    updates.map((u) =>
      supabase.from("blocchi_preventivo").update({ ordine: u.ordine }).eq("id", u.id),
    ),
  );
}

// =========================================================================
// Motore di calcolo righe / blocchi / preventivo
// =========================================================================

export interface RigaCalc {
  importo: number;
  costo: number;
  vendita: number;
  margine_perc: number;
  peso: number;
}

/**
 * Calcoli su una riga "tipo Excel".
 * - importo = quantita × prezzo_unit × (1 - sconto/100) × segno (vendita REALE, scontata)
 * - vendita = snapshot lordo (prezzo × qta, senza sconto) — solo informativo
 * - margine % = (importo_scontato - costo) / importo_scontato × 100
 *   Calcolato SULLA VENDITA EFFETTIVA (scontata): se si vende sotto costo il
 *   margine è negativo. Lo sconto a piede è già propagato in sconto_perc, quindi
 *   è incluso automaticamente.
 */
export function calcolaRiga(r: Partial<Riga>): RigaCalc {
  const tipo = r.tipo_riga ?? "manuale";
  if (tipo === "nota" || tipo === "separatore") {
    return { importo: 0, costo: 0, vendita: 0, margine_perc: 0, peso: 0 };
  }
  const segno = (r.segno ?? 1) === -1 ? -1 : 1;
  const q = n(r.quantita);
  const p = n(r.prezzo_unit);
  const sc = n(r.sconto_perc);
  const importo = round2(q * p * (1 - sc / 100) * segno);
  const costo = round2(n(r.costo) || 0);
  const venditaSnapshot = r.vendita == null ? round2(q * p * segno) : round2(n(r.vendita));
  // Margine sulla vendita REALE (scontata), non sul prezzo pieno.
  const margine = importo !== 0 ? ((importo - costo) / importo) * 100 : 0;
  return {
    importo,
    costo,
    vendita: venditaSnapshot,
    margine_perc: round2(margine),
    peso: round2(n(r.peso) || 0),
  };
}

/**
 * Calcola gli "importi visualizzati" per ogni riga del blocco, includendo:
 *  - sub: il valore mostrato per le righe "sotto_totale" (somma delle righe sopra
 *    fino al sotto_totale precedente).
 *  - totale del blocco (somma di tutte le righe non-sotto-totale, escluse nota/separatore).
 */
export interface RigaCalcolata extends RigaCalc {
  /** Valore mostrato in colonna "Importo" — coincide con `importo` per le righe normali,
   *  ma per `sotto_totale` è la somma del segmento sopra. */
  importoEffettivo: number;
}

export function calcolaBlocco(righe: Riga[]): {
  righe: { id: string; calc: RigaCalcolata }[];
  totale: number;
  costo: number;
  peso: number;
} {
  let runningSegment = 0;
  let totaleBlocco = 0;
  let costoBlocco = 0;
  let pesoBlocco = 0;
  const out: { id: string; calc: RigaCalcolata }[] = [];

  for (const r of righe) {
    const c = calcolaRiga(r);
    if (r.tipo_riga === "sotto_totale") {
      out.push({
        id: r.id,
        calc: { ...c, importoEffettivo: round2(runningSegment) },
      });
      runningSegment = 0;
      continue;
    }
    if (r.tipo_riga === "nota" || r.tipo_riga === "separatore") {
      out.push({ id: r.id, calc: { ...c, importoEffettivo: 0 } });
      continue;
    }
    runningSegment += c.importo;
    totaleBlocco += c.importo;
    costoBlocco += c.costo;
    pesoBlocco += c.peso;
    out.push({ id: r.id, calc: { ...c, importoEffettivo: c.importo } });
  }

  return {
    righe: out,
    totale: round2(totaleBlocco),
    costo: round2(costoBlocco),
    peso: round2(pesoBlocco),
  };
}

export interface TotaliPreventivo {
  imponibile: number;        // alias di imponibile_netto (retrocompat)
  imponibile_lordo: number;
  sconto_perc: number;
  importo_sconto: number;
  imponibile_netto: number;
  iva: number;
  totale: number;
}

export function calcolaTotaliPreventivo(
  blocchi: { righe: Riga[]; quantita_base?: number | null; prezzo_um?: number | null; importo?: number | null }[],
  iva_perc = 22,
  sconto_piede_perc = 0,
): TotaliPreventivo {
  let imponibileLordo = 0;
  for (const b of blocchi) {
    if (b.righe?.length) {
      imponibileLordo += calcolaBlocco(b.righe).totale;
    } else if (b.importo != null) {
      imponibileLordo += n(b.importo);
    } else if (b.quantita_base != null && b.prezzo_um != null) {
      imponibileLordo += n(b.quantita_base) * n(b.prezzo_um);
    }
  }
  imponibileLordo = round2(imponibileLordo);
  const scontoPerc = Math.max(0, n(sconto_piede_perc));
  const importoSconto = round2((imponibileLordo * scontoPerc) / 100);
  const imponibileNetto = round2(imponibileLordo - importoSconto);
  const iva = round2((imponibileNetto * n(iva_perc)) / 100);
  return {
    imponibile: imponibileNetto,
    imponibile_lordo: imponibileLordo,
    sconto_perc: scontoPerc,
    importo_sconto: importoSconto,
    imponibile_netto: imponibileNetto,
    iva,
    totale: round2(imponibileNetto + iva),
  };
}


/** Genera un nuovo "ordine" frazionario tra prev e next (per drag&drop senza rinumerare). */
export function fractionalOrder(prev: number | null, next: number | null): number {
  if (prev == null && next == null) return 1;
  if (prev == null) return (next as number) - 1;
  if (next == null) return prev + 1;
  return (prev + next) / 2;
}

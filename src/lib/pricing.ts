/**
 * Motore di calcolo prezzi — UNICA FONTE DI VERITÀ.
 * Usato da: scheda articolo, vista Listini, esplosione kit, righe preventivo.
 *
 * REGOLA UFFICIALE (MADE):
 *   costo_parziale = costo × (1-sc1/100) × (1-sc2/100) × (1-sc3/100) × (1-sc4/100) × (1-sc5/100)
 *   costo_netto    = costo_parziale + trasporto_eur + (costo_parziale × trasporto_perc/100)
 *   prezzo         = costo_netto × (1 + ricarico/100)
 *   margine%       = (prezzo - costo_netto) / prezzo × 100
 *   ricarico%      = (prezzo - costo_netto) / costo_netto × 100
 */

export interface CostoInput {
  costo?: number | string | null;
  sc1?: number | string | null;
  sc2?: number | string | null;
  sc3?: number | string | null;
  sc4?: number | string | null;
  sc5?: number | string | null;
  trasporto_eur?: number | string | null;
  trasporto_perc?: number | string | null;
}

export interface CostoOutput {
  costo_parziale: number;
  costo_netto: number;
}

const n = (v: unknown): number => {
  if (v === null || v === undefined || v === "") return 0;
  const x = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return Number.isFinite(x) ? x : 0;
};

export function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

export function calcCosto(input: CostoInput): CostoOutput {
  const costo = n(input.costo);
  if (!costo) return { costo_parziale: 0, costo_netto: 0 };

  const sc = [input.sc1, input.sc2, input.sc3, input.sc4, input.sc5].map(n);
  let parziale = costo;
  for (const s of sc) parziale = parziale * (1 - s / 100);

  const trasportoEur = n(input.trasporto_eur);
  const trasportoPerc = n(input.trasporto_perc);
  const netto = parziale + trasportoEur + (parziale * trasportoPerc) / 100;

  return {
    costo_parziale: round2(parziale),
    costo_netto: round2(netto),
  };
}

export function prezzoFromRicarico(costoNetto: number, ricarico: number): number {
  return round2(n(costoNetto) * (1 + n(ricarico) / 100));
}

export function ricaricoFromPrezzo(costoNetto: number, prezzo: number): number {
  const c = n(costoNetto);
  if (!c) return 0;
  return round2(((n(prezzo) - c) / c) * 100);
}

export function margineFromPrezzo(costoNetto: number, prezzo: number): number {
  const p = n(prezzo);
  if (!p) return 0;
  return round2(((p - n(costoNetto)) / p) * 100);
}

/** Applica un delta percentuale al ricarico (es. +2 → ricarico+2). */
export function applyRicaricoDelta(costoNetto: number, ricarico: number, delta: number) {
  const newRic = n(ricarico) + n(delta);
  const prezzo = prezzoFromRicarico(costoNetto, newRic);
  return {
    ricarico: round2(newRic),
    prezzo,
    margine: margineFromPrezzo(costoNetto, prezzo),
  };
}

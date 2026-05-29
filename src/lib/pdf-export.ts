import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { PreventivoConDettagli } from "./preventivi-api";
import { calcolaTotaliPreventivo } from "./preventivi-api";
import {
  aggregaMateriali, arricchisciMateriali, arrotondaPerFornitore, buildBlocchiOutput,
  fetchArticoliPerOrdine,
} from "./output-api";

// =========================================================================
// Logo + claim inline (base64) — evita dipendenza da asset esterno
// =========================================================================

const LOGO_MADE_B64 = "data:image/jpeg;base64,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";


const FOOTER_LEGAL =
  "MADE DISTRIBUZIONE S.p.A.  |  Sede Legale: Corso di Porta Nuova 11, 20121 MILANO  |  " +
  "C.F., P.IVA e nr. iscrizione Reg. Imp. di Milano-Monza-Brianza-Lodi 10126430965  |  " +
  "madedistribuzionesrl@pecplus.it  |  REA Milano MI 2507310  |  " +
  "Capitale Sociale € 2.593.000,00 i.v.  |  " +
  "Sede Amministrativa: Via G. Di Vittorio 3, 20003 Casorezzo (MI) — Tel.: 02/90380000 — Fax: 02/90384008  |  " +
  "Sede Operativa: Via Privata Georges Bizet 25, 20092 Cinisello Balsamo (MI) — Tel.: 02/25569828  |  " +
  "Sotto la Direzione e il Coordinamento di Made Italia S.p.A.";

// =========================================================================
// Costanti grafiche MADE
// =========================================================================

const NAVY:      [number, number, number] = [13, 31, 60];
const VERDE:     [number, number, number] = [0, 146, 70];
const ROSSO:     [number, number, number] = [206, 43, 55];
const GRIGIO:    [number, number, number] = [110, 115, 125];
const GRIGIO_LT: [number, number, number] = [245, 246, 248];
const GRIGIO_BD: [number, number, number] = [220, 222, 226];
const BLOCK_BG:  [number, number, number] = [235, 238, 244];
const BANDA_BG:  [number, number, number] = [235, 238, 244];
const LABEL_COL: [number, number, number] = [130, 140, 155];
const COBALT:    [number, number, number] = [38, 95, 176];

const fmtEur = (n: number) =>
  "€ " + n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtNum = (n: number, d = 2) =>
  n.toLocaleString("it-IT", { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtData = (s: string | null | undefined) => {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("it-IT");
};

// =========================================================================
// Header / Footer
// =========================================================================

function drawHeader(doc: jsPDF, titolo: string, prev: PreventivoConDettagli) {
  const w = doc.internal.pageSize.getWidth();

  // ZONA BIANCA: logo sx + titolo dx
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, w, 22, "F");
  try { doc.addImage(LOGO_MADE_B64, "JPEG", 12, 5, 68, 14); } catch { /* fallback */ }
  doc.setFont("helvetica", "bold"); doc.setFontSize(18);
  doc.setTextColor(...NAVY);
  doc.text(titolo.toUpperCase(), w - 14, 13, { align: "right" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(6.5);
  doc.setTextColor(...GRIGIO);
  doc.text("Distribuzione sistemi a secco  |  cartongesso, profili, isolanti, controsoffitti", w - 14, 18.5, { align: "right" });

  // TRICOLORE — 1.2mm
  const segW = (w - 28) / 3;
  doc.setFillColor(...VERDE);      doc.rect(14,            22, segW, 1.2, "F");
  doc.setFillColor(255, 255, 255); doc.rect(14 + segW,     22, segW, 1.2, "F");
  doc.setFillColor(...ROSSO);      doc.rect(14 + segW * 2, 22, segW, 1.2, "F");

  // BANDA GRIGIO CHIARO — 34mm, più spaziosa
  const by = 23.2;
  const bh = 34;
  doc.setFillColor(...BANDA_BG); doc.rect(0, by, w, bh, "F");

  // Cliente sx
  const cli = prev.cliente as (typeof prev.cliente & { comune?: { nome: string } | null }) | null;
  doc.setFont("helvetica", "bold"); doc.setFontSize(5.8);
  doc.setTextColor(...LABEL_COL);
  doc.text("CLIENTE", 14, by + 5);

  doc.setFont("helvetica", "bold"); doc.setFontSize(10.5);
  doc.setTextColor(...NAVY);
  const rs = (cli?.ragione_sociale ?? "—").slice(0, 48);
  doc.text(rs, 14, by + 10.5);

  doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
  doc.setTextColor(...NAVY);
  let yL = by + 15.5;
  if (cli?.piva) {
    doc.text(`P.IVA ${cli.piva}`, 14, yL);
    yL += 4;
  }
  const addr: string[] = [];
  if (cli?.indirizzo) addr.push(cli.indirizzo);
  const loc: string[] = [];
  if (cli?.cap) loc.push(cli.cap);
  if (cli?.comune?.nome) loc.push(cli.comune.nome);
  if (cli?.prov) loc.push(`(${cli.prov})`);
  const locStr = loc.join(" ");
  const addrLine = [addr.join(""), locStr].filter(Boolean).join(" · ");
  if (addrLine) {
    doc.text(addrLine.slice(0, 70), 14, yL);
    yL += 4;
  }
  if (prev.cantiere) {
    const cant = prev.cantiere as typeof prev.cantiere & { indirizzo?: string | null };
    doc.setTextColor(...GRIGIO);
    const ct = `Cantiere: ${cant.nome}${cant.indirizzo ? " — " + cant.indirizzo : ""}`;
    doc.text(ct.slice(0, 78), 14, yL);
  }

  // Metadata dx
  const colDoc  = w - 78;
  const colData = w - 42;
  const colVal  = w - 14;
  const R1 = [
    { lbl: "N° DOCUMENTO", val: String(prev.numero ?? "—"), x: colDoc },
    { lbl: "DATA",         val: fmtData(prev.data),          x: colData },
    { lbl: "VALIDITÀ",     val: fmtData(prev.validita),      x: colVal },
  ];
  const R2 = [
    { lbl: "AGENTE",  val: (prev.agente?.nome ?? "—").slice(0, 22), x: colDoc },
    { lbl: "FILIALE", val: (prev.filiale ?? "—").slice(0, 18),       x: colVal },
  ];
  for (const c of R1) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(5.8); doc.setTextColor(...LABEL_COL);
    doc.text(c.lbl, c.x, by + 5, { align: "right" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...NAVY);
    doc.text(c.val, c.x, by + 11, { align: "right" });
  }
  for (const c of R2) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(5.8); doc.setTextColor(...LABEL_COL);
    doc.text(c.lbl, c.x, by + 19, { align: "right" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...NAVY);
    doc.text(c.val, c.x, by + 25, { align: "right" });
  }
}

function drawFooter(doc: jsPDF) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const pages = doc.getNumberOfPages();
  const FOOTER_H = 20;

  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const isLast = i === pages;

    if (isLast) {
      // Claim testo (helvetica bold) — niente immagine per compatibilità Acrobat
      doc.setFont("helvetica", "bold"); doc.setFontSize(11);
      doc.setTextColor(...COBALT);
      doc.text("IL NUOVO MODO DI COSTRUIRE.", 14, h - FOOTER_H - 4);
      doc.setFont("helvetica", "normal");
    }

    doc.setDrawColor(...GRIGIO_BD); doc.setLineWidth(0.2);
    doc.line(14, h - FOOTER_H + 1, w - 14, h - FOOTER_H + 1);

    doc.setFont("helvetica", "normal"); doc.setFontSize(5.2);
    doc.setTextColor(...GRIGIO);
    const legalW = w - 28;
    const lines = doc.splitTextToSize(FOOTER_LEGAL, legalW);
    doc.text(lines, 14, h - FOOTER_H + 4);

    doc.setFontSize(6);
    doc.text(`Pag. ${i} / ${pages}`, w - 14, h - 5, { align: "right" });
  }
}

function fileName(prev: PreventivoConDettagli, tipo: string, ext = "pdf") {
  const num = (prev.numero ?? "senza-numero").replace(/[^A-Za-z0-9_-]+/g, "_");
  const cli = (prev.cliente?.ragione_sociale ?? "cliente").replace(/[^A-Za-z0-9_-]+/g, "_").slice(0, 30);
  return `${tipo}_${num}_${cli}.${ext}`;
}

// =========================================================================
// 1) PREVENTIVO
// =========================================================================

export async function exportPreventivoPdf(prev: PreventivoConDettagli) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  drawHeader(doc, "Preventivo", prev);

  const blocchi = buildBlocchiOutput(prev);
  const USABLE = w - 28;
  let y = 48;

  for (const b of blocchi) {
    autoTable(doc, {
      startY: y,
      head: [[
        { content: b.rif || "—", styles: { halign: "left", font: "courier", fontStyle: "bold" } },
        { content: b.descrizione, styles: { halign: "left" } },
        { content: `${fmtNum(b.quantita, 2)} ${b.um}`, styles: { halign: "right" } },
        { content: `${fmtEur(b.prezzo_um)} /${b.um}`, styles: { halign: "right" } },
        { content: fmtEur(b.importo), styles: { halign: "right", fontStyle: "bold" } },
      ]],
      body: [],
      theme: "plain",
      headStyles: {
        fillColor: BLOCK_BG,
        textColor: NAVY,
        fontSize: 8.5,
        cellPadding: { top: 2, bottom: 2, left: 2, right: 2 },
        lineColor: GRIGIO_BD,
        lineWidth: 0.15,
      },
      columnStyles: {
        0: { cellWidth: 24 },
        2: { cellWidth: 30 },
        3: { cellWidth: 32 },
        4: { cellWidth: 28 },
      },
      margin: { left: 14, right: 14 },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

    if (b.note_tecniche) {
      doc.setFont("helvetica", "italic"); doc.setFontSize(7.5); doc.setTextColor(...GRIGIO);
      const lines = doc.splitTextToSize(b.note_tecniche, USABLE);
      doc.text(lines, 14, y + 3);
      y += 3 + lines.length * 3.2;
    }

    const body: (string | number)[][] = [];
    for (const r of b.righe) {
      if (r.tipo_riga === "nota" || r.tipo_riga === "separatore" || r.tipo_riga === "sotto_totale") continue;
      body.push([
        r.articolo?.cod_gamma ?? "",
        r.descrizione ?? r.articolo?.descrizione ?? "",
        r.um ?? r.articolo?.um ?? "",
        fmtNum(Number(r.quantita ?? 0), 2),
      ]);
    }
    if (body.length) {
      autoTable(doc, {
        startY: y,
        head: [["Cod. Gamma", "Descrizione", "U.M.", "Quantità"]],
        body,
        theme: "striped",
        headStyles: {
          fillColor: [255, 255, 255] as [number, number, number],
          textColor: GRIGIO,
          fontStyle: "bold",
          fontSize: 6.5,
          lineColor: GRIGIO_BD,
          lineWidth: 0.1,
        },
        bodyStyles: { fontSize: 7.5, textColor: [30, 35, 45] as [number, number, number] },
        alternateRowStyles: { fillColor: GRIGIO_LT },
        columnStyles: {
          0: { cellWidth: 27, font: "courier" },
          2: { cellWidth: 18, halign: "center" },
          3: { cellWidth: 27, halign: "right", font: "courier" },
        },
        margin: { left: 14, right: 14 },
      });
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
    }

    doc.setDrawColor(...GRIGIO_BD); doc.setLineWidth(0.1);
    doc.line(14, y, w - 14, y);
    y += 6;

    if (y > doc.internal.pageSize.getHeight() - 55) {
      doc.addPage(); y = 20;
    }
  }

  if (y > doc.internal.pageSize.getHeight() - 60) { doc.addPage(); y = 20; }
  doc.setDrawColor(...GRIGIO_BD); doc.setLineWidth(0.2);
  doc.line(14, y, w - 14, y);
  y += 5;

  const ivaPerc = Number(prev.iva_perc ?? 22);
  const scontoPiede = Number((prev as unknown as { sconto_piede_perc?: number }).sconto_piede_perc ?? 0);
  // Lo sconto è già applicato dentro le righe (sconto_perc di riga). Non riapplicarlo qui.
  const tot = calcolaTotaliPreventivo(
    prev.blocchi.map((bl) => ({
      righe: bl.righe, quantita_base: bl.quantita_base, prezzo_um: bl.prezzo_um, importo: bl.importo,
    })),
    ivaPerc,
    0,
  );

  const DISCLAIMER =
    "I prezzi si intendono franco filiale MADE — IVA esclusa. " +
    "La vendita è effettuata a confezioni / bancali / pallet interi. " +
    "Validità preventivo come indicato in intestazione. " +
    "Salvo errori ed omissioni.";
  doc.setFont("helvetica", "italic"); doc.setFontSize(6.8); doc.setTextColor(...GRIGIO);
  const discLines = doc.splitTextToSize(DISCLAIMER, 78);
  doc.text(discLines, 14, y + 1);

  const hasSconto = scontoPiede > 0;
  const boxH = hasSconto ? 35 : 28;
  const tw = 80; const tx = w - 14 - tw; const ty = y;
  doc.setDrawColor(...GRIGIO_BD); doc.setLineWidth(0.3);
  doc.rect(tx, ty, tw, boxH, "D");

  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...GRIGIO);
  doc.text("Imponibile", tx + 3, ty + 7);
  doc.setTextColor(...NAVY); doc.text(fmtEur(tot.imponibile_lordo), tx + tw - 4, ty + 7, { align: "right" });

  let cy = ty + 14;
  if (hasSconto) {
    doc.setTextColor(200, 30, 30);
    doc.text(`Sconto applicato −${scontoPiede.toLocaleString("it-IT", { maximumFractionDigits: 2 })}% su righe`, tx + 3, cy);
    cy += 7;
  }

  doc.setTextColor(...GRIGIO);
  doc.text(`IVA ${ivaPerc}%`, tx + 3, cy);
  doc.setTextColor(...NAVY); doc.text(fmtEur(tot.iva), tx + tw - 4, cy, { align: "right" });

  doc.setDrawColor(...GRIGIO_BD); doc.setLineWidth(0.1);
  doc.line(tx + 2, cy + 4.5, tx + tw - 2, cy + 4.5);

  doc.setFillColor(...NAVY); doc.rect(tx, cy + 5.5, tw, 8.5, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(255, 255, 255);
  doc.text("TOTALE", tx + 3, cy + 11.5);
  doc.text(fmtEur(tot.totale), tx + tw - 4, cy + 11.5, { align: "right" });


  drawFooter(doc);
  const name = fileName(prev, "preventivo");
  return { blob: doc.output("blob") as Blob, fileName: name };
}

// =========================================================================
// 2) PROPOSTA RAPIDA
// =========================================================================

export async function exportPropostaRapidaPdf(prev: PreventivoConDettagli) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  drawHeader(doc, "Proposta rapida", prev);

  const blocchi = buildBlocchiOutput(prev);
  const body = blocchi.map((b) => [
    b.rif || "—",
    b.descrizione,
    `${fmtNum(b.quantita, 2)} ${b.um}`,
    `${fmtEur(b.prezzo_um)} /${b.um}`,
    fmtEur(b.importo),
  ]);

  autoTable(doc, {
    startY: 48,
    head: [["Rif.", "Descrizione", "Quantità", "Prezzo unit.", "Importo"]],
    body,
    theme: "striped",
    headStyles: { fillColor: BLOCK_BG, textColor: NAVY, fontStyle: "bold", fontSize: 8, lineColor: GRIGIO_BD, lineWidth: 0.15 },
    bodyStyles: { fontSize: 8.5, textColor: [30, 35, 45] as [number, number, number] },
    alternateRowStyles: { fillColor: GRIGIO_LT },
    styles: { cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 24, font: "courier", fontStyle: "bold" },
      2: { cellWidth: 28, halign: "right" },
      3: { cellWidth: 32, halign: "right", font: "courier" },
      4: { cellWidth: 32, halign: "right", font: "courier", fontStyle: "bold" },
    },
    margin: { left: 14, right: 14 },
  });
  let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  if (y > doc.internal.pageSize.getHeight() - 60) { doc.addPage(); y = 20; }
  doc.setDrawColor(...GRIGIO_BD); doc.setLineWidth(0.2);
  doc.line(14, y, w - 14, y);
  y += 5;

  const ivaPerc = Number(prev.iva_perc ?? 22);
  const scontoPiede = Number((prev as unknown as { sconto_piede_perc?: number }).sconto_piede_perc ?? 0);
  const tot = calcolaTotaliPreventivo(
    prev.blocchi.map((bl) => ({
      righe: bl.righe, quantita_base: bl.quantita_base, prezzo_um: bl.prezzo_um, importo: bl.importo,
    })),
    ivaPerc,
    0,
  );

  const DISCLAIMER =
    "I prezzi si intendono franco filiale MADE — IVA esclusa. " +
    "Validità preventivo come indicato in intestazione. " +
    "Salvo errori ed omissioni.";
  doc.setFont("helvetica", "italic"); doc.setFontSize(6.8); doc.setTextColor(...GRIGIO);
  const discLines = doc.splitTextToSize(DISCLAIMER, 78);
  doc.text(discLines, 14, y + 1);

  const hasSconto = scontoPiede > 0;
  const boxH = hasSconto ? 35 : 28;
  const tw = 80; const tx = w - 14 - tw; const ty = y;
  doc.setDrawColor(...GRIGIO_BD); doc.setLineWidth(0.3);
  doc.rect(tx, ty, tw, boxH, "D");

  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...GRIGIO);
  doc.text("Imponibile", tx + 3, ty + 7);
  doc.setTextColor(...NAVY); doc.text(fmtEur(tot.imponibile_lordo), tx + tw - 4, ty + 7, { align: "right" });

  let cy = ty + 14;
  if (hasSconto) {
    doc.setTextColor(200, 30, 30);
    doc.text(`Sconto applicato −${scontoPiede.toLocaleString("it-IT", { maximumFractionDigits: 2 })}% su righe`, tx + 3, cy);
    cy += 7;
  }

  doc.setTextColor(...GRIGIO);
  doc.text(`IVA ${ivaPerc}%`, tx + 3, cy);
  doc.setTextColor(...NAVY); doc.text(fmtEur(tot.iva), tx + tw - 4, cy, { align: "right" });

  doc.setDrawColor(...GRIGIO_BD); doc.setLineWidth(0.1);
  doc.line(tx + 2, cy + 4.5, tx + tw - 2, cy + 4.5);

  doc.setFillColor(...NAVY); doc.rect(tx, cy + 5.5, tw, 8.5, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(255, 255, 255);
  doc.text("TOTALE", tx + 3, cy + 11.5);
  doc.text(fmtEur(tot.totale), tx + tw - 4, cy + 11.5, { align: "right" });


  drawFooter(doc);
  const name = fileName(prev, "proposta-rapida");
  return { blob: doc.output("blob") as Blob, fileName: name };
}

// =========================================================================
// 3) LISTA MATERIALI
// =========================================================================

export async function exportListaMaterialiPdf(prev: PreventivoConDettagli) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  drawHeader(doc, "Lista materiali", prev);

  const base = aggregaMateriali(prev.blocchi);
  const info = await fetchArticoliPerOrdine(base.map((m) => m.articolo_id));
  const mats = arricchisciMateriali(base, info);

  autoTable(doc, {
    startY: 48,
    head: [["Cod. Gamma", "Descrizione", "U.M.", "Quantità", "Peso (kg)", "Fornitore"]],
    body: mats.map((m) => [
      m.cod_gamma ?? "",
      m.descrizione,
      m.um ?? "",
      fmtNum(m.qta_teorica, 2),
      fmtNum(m.peso_totale, 1),
      m.fornitore_nome ?? "—",
    ]),
    theme: "striped",
    headStyles: { fillColor: BLOCK_BG, textColor: NAVY, fontStyle: "bold", fontSize: 7.5, lineColor: GRIGIO_BD, lineWidth: 0.15 },
    bodyStyles: { fontSize: 8, textColor: [30, 35, 45] as [number, number, number] },
    alternateRowStyles: { fillColor: GRIGIO_LT },
    styles: { cellPadding: 1.6 },
    columnStyles: {
      0: { cellWidth: 26, font: "courier" },
      2: { cellWidth: 14, halign: "center" },
      3: { cellWidth: 22, halign: "right", font: "courier" },
      4: { cellWidth: 22, halign: "right", font: "courier" },
      5: { cellWidth: 36 },
    },
    margin: { left: 14, right: 14 },
  });

  drawFooter(doc);
  const name = fileName(prev, "lista-materiali");
  return { blob: doc.output("blob") as Blob, fileName: name };
}

// =========================================================================
// 4) LISTA MAT. FORNITORE
// =========================================================================

export async function exportListaFornitorePdf(prev: PreventivoConDettagli) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  drawHeader(doc, "Lista mat. fornitore", prev);

  const base = aggregaMateriali(prev.blocchi);
  const info = await fetchArticoliPerOrdine(base.map((m) => m.articolo_id));
  const mats = arricchisciMateriali(base, info);
  const gruppi = arrotondaPerFornitore(mats);

  let y = 48;
  for (const g of gruppi) {
    doc.setFillColor(...BLOCK_BG);
    doc.rect(14, y, doc.internal.pageSize.getWidth() - 28, 7, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...NAVY);
    doc.text(`Fornitore: ${g.fornitore_nome}`, 16, y + 5);
    y += 7;

    autoTable(doc, {
      startY: y,
      head: [["Cod. Gamma", "Descrizione", "U.M.", "Q.tà teorica", "Conf.", "N°", "Q.tà ordine"]],
      body: g.righe.map((r) => [
        r.cod_gamma ?? "",
        r.descrizione,
        r.um ?? "",
        fmtNum(r.qta_teorica, 2),
        r.qta_confezione > 0 ? fmtNum(r.qta_confezione, 2) : "—",
        String(r.n_confezioni),
        fmtNum(r.qta_ordine, 2),
      ]),
      theme: "striped",
      headStyles: { fillColor: [255, 255, 255] as [number, number, number], textColor: GRIGIO, fontStyle: "bold", fontSize: 6.8, lineColor: GRIGIO_BD, lineWidth: 0.1 },
      bodyStyles: { fontSize: 7.5, textColor: [30, 35, 45] as [number, number, number] },
      alternateRowStyles: { fillColor: GRIGIO_LT },
      styles: { cellPadding: 1.6 },
      columnStyles: {
        0: { cellWidth: 24, font: "courier" },
        2: { cellWidth: 14, halign: "center" },
        3: { cellWidth: 22, halign: "right", font: "courier" },
        4: { cellWidth: 18, halign: "right", font: "courier" },
        5: { cellWidth: 12, halign: "right", font: "courier" },
        6: { cellWidth: 24, halign: "right", font: "courier", fontStyle: "bold" },
      },
      margin: { left: 14, right: 14 },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
    if (y > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage();
      y = 20;
    }
  }

  drawFooter(doc);
  const name = fileName(prev, "ordine-fornitore");
  return { blob: doc.output("blob") as Blob, fileName: name };
}

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

const CLAIM_MADE_B64 = "data:image/jpeg;base64,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";

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
const LABEL_COL: [number, number, number] = [160, 195, 235];

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

  // TRICOLORE — solo header, 1.2mm
  const segW = (w - 28) / 3;
  doc.setFillColor(...VERDE);   doc.rect(14,            22, segW, 1.2, "F");
  doc.setFillColor(255, 255, 255); doc.rect(14 + segW,   22, segW, 1.2, "F");
  doc.setFillColor(...ROSSO);   doc.rect(14 + segW * 2, 22, segW, 1.2, "F");

  // BANDA NAVY — 20mm
  const by = 23.2;
  doc.setFillColor(...NAVY); doc.rect(0, by, w, 20, "F");

  // Cliente sx
  doc.setFont("helvetica", "bold"); doc.setFontSize(5.5);
  doc.setTextColor(...LABEL_COL);
  doc.text("CLIENTE", 14, by + 5);
  doc.setFont("helvetica", "bold"); doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  const rs = (prev.cliente?.ragione_sociale ?? "—").slice(0, 38);
  doc.text(rs, 14, by + 10);
  if (prev.cantiere) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(7);
    doc.setTextColor(...LABEL_COL);
    const ct = (prev.cantiere.nome + (prev.cantiere.indirizzo ? " — " + prev.cantiere.indirizzo : "")).slice(0, 48);
    doc.text(ct, 14, by + 16);
  }

  // Metadata — colonne right-aligned per evitare sovrapposizioni
  const colDoc = w - 78;   // N° DOCUMENTO (right edge)
  const colData = w - 42;  // DATA (right edge)
  const colVal = w - 14;   // VALIDITÀ (right edge)
  const R1 = [
    { lbl: "N° DOCUMENTO", val: String(prev.numero ?? "—"), x: colDoc },
    { lbl: "DATA",         val: fmtData(prev.data),          x: colData },
    { lbl: "VALIDITÀ",     val: fmtData(prev.validita),      x: colVal },
  ];
  const R2 = [
    { lbl: "AGENTE",  val: (prev.agente?.nome ?? "—").slice(0, 16), x: colDoc },
    { lbl: "FILIALE", val: (prev.filiale ?? "—").slice(0, 14),       x: colData },
  ];
  for (const c of R1) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(5.5); doc.setTextColor(...LABEL_COL);
    doc.text(c.lbl, c.x, by + 5, { align: "right" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(255, 255, 255);
    doc.text(c.val, c.x, by + 10, { align: "right" });
  }
  for (const c of R2) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(5.5); doc.setTextColor(...LABEL_COL);
    doc.text(c.lbl, c.x, by + 15.5, { align: "right" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(255, 255, 255);
    doc.text(c.val, c.x, by + 20, { align: "right" });
  }
}

function drawFooter(doc: jsPDF) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const pages = doc.getNumberOfPages();
  const FOOTER_H = 20;

  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);

    const claimW = 56;
    const claimH = 22;
    const isLast = i === pages;

    if (isLast) {
      const claimY = h - FOOTER_H - claimH - 4;
      try { doc.addImage(CLAIM_MADE_B64, "JPEG", 14, claimY, claimW, claimH); } catch { /* ignora */ }
    }

    doc.setDrawColor(...GRIGIO_BD); doc.setLineWidth(0.2);
    doc.line(14, h - FOOTER_H + 1, w - 14, h - FOOTER_H + 1);

    doc.setFont("helvetica", "normal"); doc.setFontSize(5.2);
    doc.setTextColor(...GRIGIO);
    // sull'ultima pagina sposto il testo a destra del claim per non sovrapporre
    const legalX = isLast ? 14 + claimW + 6 : 14;
    const legalW = w - legalX - 14;
    const lines = doc.splitTextToSize(FOOTER_LEGAL, legalW);
    doc.text(lines, legalX, h - FOOTER_H + 4);

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
  const tot = calcolaTotaliPreventivo(
    prev.blocchi.map((bl) => ({
      righe: bl.righe, quantita_base: bl.quantita_base, prezzo_um: bl.prezzo_um, importo: bl.importo,
    })),
    ivaPerc,
  );

  const DISCLAIMER =
    "I prezzi si intendono franco filiale MADE — IVA esclusa. " +
    "La vendita è effettuata a confezioni / bancali / pallet interi. " +
    "Validità preventivo come indicato in intestazione. " +
    "Salvo errori ed omissioni.";
  doc.setFont("helvetica", "italic"); doc.setFontSize(6.8); doc.setTextColor(...GRIGIO);
  const discLines = doc.splitTextToSize(DISCLAIMER, 78);
  doc.text(discLines, 14, y + 1);

  const tw = 80; const tx = w - 14 - tw; const ty = y;
  doc.setDrawColor(...GRIGIO_BD); doc.setLineWidth(0.3);
  doc.rect(tx, ty, tw, 28, "D");

  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...GRIGIO);
  doc.text("Totale imponibile", tx + 3, ty + 7);
  doc.setTextColor(...NAVY); doc.text(fmtEur(tot.imponibile), tx + tw - 4, ty + 7, { align: "right" });

  doc.setTextColor(...GRIGIO);
  doc.text(`IVA ${ivaPerc}%`, tx + 3, ty + 14);
  doc.setTextColor(...NAVY); doc.text(fmtEur(tot.iva), tx + tw - 4, ty + 14, { align: "right" });

  doc.setDrawColor(...GRIGIO_BD); doc.setLineWidth(0.1);
  doc.line(tx + 2, ty + 18.5, tx + tw - 2, ty + 18.5);

  doc.setFillColor(...NAVY); doc.rect(tx, ty + 19.5, tw, 8.5, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(255, 255, 255);
  doc.text("TOTALE", tx + 3, ty + 25.5);
  doc.text(fmtEur(tot.totale), tx + tw - 4, ty + 25.5, { align: "right" });

  drawFooter(doc);
  doc.save(fileName(prev, "preventivo"));
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
  const tot = calcolaTotaliPreventivo(
    prev.blocchi.map((bl) => ({
      righe: bl.righe, quantita_base: bl.quantita_base, prezzo_um: bl.prezzo_um, importo: bl.importo,
    })),
    ivaPerc,
  );

  const DISCLAIMER =
    "I prezzi si intendono franco filiale MADE — IVA esclusa. " +
    "Validità preventivo come indicato in intestazione. " +
    "Salvo errori ed omissioni.";
  doc.setFont("helvetica", "italic"); doc.setFontSize(6.8); doc.setTextColor(...GRIGIO);
  const discLines = doc.splitTextToSize(DISCLAIMER, 78);
  doc.text(discLines, 14, y + 1);

  const tw = 80; const tx = w - 14 - tw; const ty = y;
  doc.setDrawColor(...GRIGIO_BD); doc.setLineWidth(0.3);
  doc.rect(tx, ty, tw, 28, "D");

  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...GRIGIO);
  doc.text("Totale imponibile", tx + 3, ty + 7);
  doc.setTextColor(...NAVY); doc.text(fmtEur(tot.imponibile), tx + tw - 4, ty + 7, { align: "right" });

  doc.setTextColor(...GRIGIO);
  doc.text(`IVA ${ivaPerc}%`, tx + 3, ty + 14);
  doc.setTextColor(...NAVY); doc.text(fmtEur(tot.iva), tx + tw - 4, ty + 14, { align: "right" });

  doc.setDrawColor(...GRIGIO_BD); doc.setLineWidth(0.1);
  doc.line(tx + 2, ty + 18.5, tx + tw - 2, ty + 18.5);

  doc.setFillColor(...NAVY); doc.rect(tx, ty + 19.5, tw, 8.5, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(255, 255, 255);
  doc.text("TOTALE", tx + 3, ty + 25.5);
  doc.text(fmtEur(tot.totale), tx + tw - 4, ty + 25.5, { align: "right" });

  drawFooter(doc);
  doc.save(fileName(prev, "proposta-rapida"));
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
  doc.save(fileName(prev, "lista-materiali"));
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
  doc.save(fileName(prev, "ordine-fornitore"));
}

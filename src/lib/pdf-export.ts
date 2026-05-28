import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoUrl from "@/assets/logo-made.png";
import type { PreventivoConDettagli } from "./preventivi-api";
import { calcolaTotaliPreventivo } from "./preventivi-api";
import {
  aggregaMateriali, arricchisciMateriali, arrotondaPerFornitore, buildBlocchiOutput,
  fetchArticoliPerOrdine,
} from "./output-api";

// =========================================================================
// Costanti grafiche MADE
// =========================================================================

const NAVY: [number, number, number] = [13, 31, 60];     // #0d1f3c
const VERDE: [number, number, number] = [0, 146, 70];    // #009246
const ROSSO: [number, number, number] = [206, 43, 55];   // #ce2b37
const GRIGIO: [number, number, number] = [120, 120, 130];
const GRIGIO_LIGHT: [number, number, number] = [240, 242, 245];

const DISCLAIMER =
  "I prezzi si intendono franco filiale MADE — IVA esclusa. La vendita è effettuata a confezioni / bancali / pallet interi. Validità preventivo come indicato in intestazione. Salvo errori ed omissioni.";

const AZIENDA = {
  nome: "Gruppo MADE S.p.A.",
  riga2: "Distribuzione sistemi a secco — cartongesso, profili, isolanti, controsoffitti",
};

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
// Helpers
// =========================================================================

async function loadLogo(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = logoUrl;
  });
}

function drawHeader(doc: jsPDF, titolo: string, prev: PreventivoConDettagli, logo: HTMLImageElement | null) {
  const w = doc.internal.pageSize.getWidth();

  // Banda navy
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, w, 28, "F");

  // Logo
  if (logo) {
    const ratio = logo.width / logo.height;
    const h = 14;
    const lw = h * ratio;
    doc.addImage(logo, "PNG", 14, 7, lw, h);
  } else {
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("MADE", 14, 18);
  }

  // Barre tricolore
  doc.setFillColor(...VERDE); doc.rect(w - 18, 8, 4, 12, "F");
  doc.setFillColor(255, 255, 255); doc.rect(w - 14, 8, 4, 12, "F");
  doc.setFillColor(...ROSSO); doc.rect(w - 10, 8, 4, 12, "F");

  // Titolo
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(titolo.toUpperCase(), w / 2, 14, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(AZIENDA.nome, w / 2, 20, { align: "center" });

  // Box dati cliente
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("CLIENTE", 14, 36);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(prev.cliente?.ragione_sociale ?? "—", 14, 42);
  doc.setFontSize(8);
  doc.setTextColor(...GRIGIO);
  if (prev.cantiere) {
    doc.text(
      `Cantiere: ${prev.cantiere.nome}${prev.cantiere.indirizzo ? " — " + prev.cantiere.indirizzo : ""}`,
      14, 47,
    );
  }

  // Riquadro destra: dati documento
  const x0 = w - 90;
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.3);
  doc.rect(x0, 32, 76, 22);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...NAVY);
  doc.text("N° DOCUMENTO", x0 + 2, 36);
  doc.text("DATA", x0 + 38, 36);
  doc.text("VALIDITÀ", x0 + 56, 36);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(String(prev.numero ?? "—"), x0 + 2, 41);
  doc.text(fmtData(prev.data), x0 + 38, 41);
  doc.text(fmtData(prev.validita), x0 + 56, 41);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("AGENTE", x0 + 2, 48);
  doc.text("FILIALE", x0 + 38, 48);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(prev.agente?.nome ?? "—", x0 + 2, 52);
  doc.text(prev.filiale ?? "—", x0 + 38, 52);
}

function drawFooter(doc: jsPDF, conDisclaimer: boolean) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    if (conDisclaimer && i === pages) {
      doc.setDrawColor(...GRIGIO);
      doc.setLineWidth(0.2);
      doc.line(14, h - 22, w - 14, h - 22);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7);
      doc.setTextColor(...GRIGIO);
      const lines = doc.splitTextToSize(DISCLAIMER, w - 28);
      doc.text(lines, 14, h - 18);
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...GRIGIO);
    doc.text(`Pag. ${i} / ${pages}`, w - 14, h - 8, { align: "right" });
    doc.text(AZIENDA.nome, 14, h - 8);
  }
}

function fileName(prev: PreventivoConDettagli, tipo: string, ext = "pdf") {
  const num = (prev.numero ?? "senza-numero").replace(/[^A-Za-z0-9_-]+/g, "_");
  const cli = (prev.cliente?.ragione_sociale ?? "cliente").replace(/[^A-Za-z0-9_-]+/g, "_").slice(0, 30);
  return `${tipo}_${num}_${cli}.${ext}`;
}

// =========================================================================
// 1) PREVENTIVO (PDF ufficiale)
// =========================================================================

export async function exportPreventivoPdf(prev: PreventivoConDettagli) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const logo = await loadLogo();
  drawHeader(doc, "Preventivo", prev, logo);

  const blocchi = buildBlocchiOutput(prev);
  let y = 60;

  for (const b of blocchi) {
    // Riga capitolato + descrizione
    const body: (string | number)[][] = [];
    for (const r of b.righe) {
      if (r.tipo_riga === "nota" || r.tipo_riga === "separatore" || r.tipo_riga === "sotto_totale") continue;
      const desc = r.descrizione ?? r.articolo?.descrizione ?? "";
      body.push([
        r.articolo?.cod_gamma ?? "",
        desc,
        r.um ?? r.articolo?.um ?? "",
        fmtNum(Number(r.quantita ?? 0), 2),
      ]);
    }

    autoTable(doc, {
      startY: y,
      head: [[
        { content: b.rif || "—", styles: { halign: "left", fillColor: NAVY, textColor: 255, fontStyle: "bold" } },
        { content: b.descrizione, styles: { halign: "left", fillColor: NAVY, textColor: 255, fontStyle: "bold" } },
        { content: `${fmtNum(b.quantita, 2)} ${b.um}`, styles: { halign: "right", fillColor: NAVY, textColor: 255 } },
        { content: `${fmtEur(b.prezzo_um)} /${b.um}`, styles: { halign: "right", fillColor: NAVY, textColor: 255 } },
        { content: fmtEur(b.importo), styles: { halign: "right", fillColor: NAVY, textColor: 255, fontStyle: "bold" } },
      ]],
      body: [],
      theme: "plain",
      styles: { fontSize: 9, cellPadding: 1.6 },
      columnStyles: { 0: { cellWidth: 22 }, 2: { cellWidth: 24 }, 3: { cellWidth: 28 }, 4: { cellWidth: 28 } },
      margin: { left: 14, right: 14 },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 1;

    if (b.note_tecniche) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(...GRIGIO);
      const lines = doc.splitTextToSize(b.note_tecniche, doc.internal.pageSize.getWidth() - 28);
      doc.text(lines, 14, y + 3);
      y += 3 + lines.length * 3.4;
    }

    if (body.length) {
      autoTable(doc, {
        startY: y + 1,
        head: [["Cod. Gamma", "Materiale", "U.M.", "Quantità"]],
        body,
        theme: "striped",
        headStyles: { fillColor: GRIGIO_LIGHT, textColor: NAVY, fontStyle: "bold", fontSize: 8 },
        bodyStyles: { fontSize: 8, textColor: [40, 40, 50] },
        columnStyles: {
          0: { cellWidth: 26, font: "courier" },
          2: { cellWidth: 16, halign: "center" },
          3: { cellWidth: 22, halign: "right", font: "courier" },
        },
        margin: { left: 14, right: 14 },
      });
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
    } else {
      y += 4;
    }

    if (y > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage();
      y = 20;
    }
  }

  // Totali
  const ivaPerc = Number(prev.iva_perc ?? 22);
  const tot = calcolaTotaliPreventivo(
    prev.blocchi.map((bl) => ({
      righe: bl.righe, quantita_base: bl.quantita_base, prezzo_um: bl.prezzo_um, importo: bl.importo,
    })),
    ivaPerc,
  );

  if (y > doc.internal.pageSize.getHeight() - 60) {
    doc.addPage();
    y = 20;
  }

  autoTable(doc, {
    startY: y + 4,
    body: [
      ["Totale imponibile", fmtEur(tot.imponibile)],
      [`IVA ${ivaPerc}%`, fmtEur(tot.iva)],
      [{ content: "TOTALE", styles: { fontStyle: "bold", fillColor: NAVY, textColor: 255 } },
       { content: fmtEur(tot.totale), styles: { fontStyle: "bold", fillColor: NAVY, textColor: 255, halign: "right" } }],
    ],
    theme: "grid",
    styles: { fontSize: 10 },
    columnStyles: { 0: { halign: "right", cellWidth: 130 }, 1: { halign: "right", cellWidth: 50, font: "courier" } },
    margin: { left: doc.internal.pageSize.getWidth() - 14 - 180, right: 14 },
  });

  drawFooter(doc, true);
  doc.save(fileName(prev, "preventivo"));
}

// =========================================================================
// 2) PROPOSTA RAPIDA
// =========================================================================

export async function exportPropostaRapidaPdf(prev: PreventivoConDettagli) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const logo = await loadLogo();
  drawHeader(doc, "Proposta rapida", prev, logo);

  const blocchi = buildBlocchiOutput(prev);
  const body = blocchi.map((b) => [
    b.rif || "—",
    b.descrizione,
    `${fmtNum(b.quantita, 2)} ${b.um}`,
    `${fmtEur(b.prezzo_um)} /${b.um}`,
    fmtEur(b.importo),
  ]);

  autoTable(doc, {
    startY: 60,
    head: [["Rif.", "Descrizione", "Quantità", "Prezzo unit.", "Importo"]],
    body,
    theme: "striped",
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 24, font: "courier", fontStyle: "bold" },
      2: { cellWidth: 28, halign: "right" },
      3: { cellWidth: 32, halign: "right", font: "courier" },
      4: { cellWidth: 32, halign: "right", font: "courier", fontStyle: "bold" },
    },
    margin: { left: 14, right: 14 },
  });
  let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;

  const ivaPerc = Number(prev.iva_perc ?? 22);
  const tot = calcolaTotaliPreventivo(
    prev.blocchi.map((bl) => ({
      righe: bl.righe, quantita_base: bl.quantita_base, prezzo_um: bl.prezzo_um, importo: bl.importo,
    })),
    ivaPerc,
  );
  autoTable(doc, {
    startY: y,
    body: [
      ["Imponibile", fmtEur(tot.imponibile)],
      [`IVA ${ivaPerc}%`, fmtEur(tot.iva)],
      [{ content: "TOTALE", styles: { fontStyle: "bold", fillColor: NAVY, textColor: 255 } },
       { content: fmtEur(tot.totale), styles: { fontStyle: "bold", fillColor: NAVY, textColor: 255, halign: "right" } }],
    ],
    theme: "grid",
    styles: { fontSize: 10 },
    columnStyles: { 0: { halign: "right", cellWidth: 130 }, 1: { halign: "right", cellWidth: 50, font: "courier" } },
    margin: { left: doc.internal.pageSize.getWidth() - 14 - 180, right: 14 },
  });

  drawFooter(doc, true);
  doc.save(fileName(prev, "proposta-rapida"));
}

// =========================================================================
// 3) LISTA MATERIALI
// =========================================================================

export async function exportListaMaterialiPdf(prev: PreventivoConDettagli) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const logo = await loadLogo();
  drawHeader(doc, "Lista materiali", prev, logo);

  const base = aggregaMateriali(prev.blocchi);
  const info = await fetchArticoliPerOrdine(base.map((m) => m.articolo_id));
  const mats = arricchisciMateriali(base, info);

  autoTable(doc, {
    startY: 60,
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
    headStyles: { fillColor: NAVY, textColor: 255 },
    styles: { fontSize: 8, cellPadding: 1.6 },
    columnStyles: {
      0: { cellWidth: 26, font: "courier" },
      2: { cellWidth: 14, halign: "center" },
      3: { cellWidth: 22, halign: "right", font: "courier" },
      4: { cellWidth: 22, halign: "right", font: "courier" },
      5: { cellWidth: 36 },
    },
    margin: { left: 14, right: 14 },
  });

  drawFooter(doc, false);
  doc.save(fileName(prev, "lista-materiali"));
}

// =========================================================================
// 4) LISTA MAT. FORNITORE (conferma d'ordine)
// =========================================================================

export async function exportListaFornitorePdf(prev: PreventivoConDettagli) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const logo = await loadLogo();
  drawHeader(doc, "Lista materiali fornitore", prev, logo);

  const base = aggregaMateriali(prev.blocchi);
  const info = await fetchArticoliPerOrdine(base.map((m) => m.articolo_id));
  const mats = arricchisciMateriali(base, info);
  const gruppi = arrotondaPerFornitore(mats);

  let y = 60;
  for (const g of gruppi) {
    doc.setFillColor(...NAVY);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.rect(14, y, doc.internal.pageSize.getWidth() - 28, 7, "F");
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
      headStyles: { fillColor: GRIGIO_LIGHT, textColor: NAVY, fontStyle: "bold", fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 1.6 },
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

  drawFooter(doc, false);
  doc.save(fileName(prev, "ordine-fornitore"));
}

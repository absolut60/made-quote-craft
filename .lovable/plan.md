
# Fase 1 — Ordini cliente (riuso massimo del preventivo)

## Architettura DB scelta: tabella unica `preventivi` con campo `tipo`

Mantengo il nome `preventivi` (rinominare ora rompe troppi riferimenti: `blocchi_preventivo`, `righe_preventivo`, `allegati_preventivo`, RPC `prossimo_numero_preventivo`, edge function `invia-email-preventivo`, tipi `PreventivoConDettagli`, route `/preventivi/$id`, ecc.). Concettualmente la tabella diventa "documenti" (preventivo + ordine), ma il nome fisico resta `preventivi` per non duplicare/rinominare nulla. Blocchi, righe, allegati, pricing, PDF, email vengono riusati identici.

### Migrazione SQL

```sql
-- 1. Tipo documento
CREATE TYPE public.tipo_documento AS ENUM ('preventivo','ordine');
ALTER TABLE public.preventivi
  ADD COLUMN tipo public.tipo_documento NOT NULL DEFAULT 'preventivo',
  ADD COLUMN preventivo_origine_id uuid NULL
    REFERENCES public.preventivi(id) ON DELETE SET NULL;
CREATE INDEX idx_preventivi_tipo ON public.preventivi(tipo);
CREATE INDEX idx_preventivi_origine ON public.preventivi(preventivo_origine_id);

-- 2. Contatore separato per ordini (riuso stessa tabella `contatori_preventivo`
--    aggiungendo colonna `tipo` come parte della PK)
ALTER TABLE public.contatori_preventivo
  ADD COLUMN tipo public.tipo_documento NOT NULL DEFAULT 'preventivo';
ALTER TABLE public.contatori_preventivo DROP CONSTRAINT contatori_preventivo_pkey;
ALTER TABLE public.contatori_preventivo
  ADD PRIMARY KEY (anno, tipo);

-- 3. Nuove RPC per ordini: ORD-{n}/{aa}, parte da 100 nel 2026 (come preventivi)
CREATE OR REPLACE FUNCTION public.anteprima_numero_ordine(p_anno int) ...
CREATE OR REPLACE FUNCTION public.prossimo_numero_ordine(p_anno int) ...
-- (stessa logica atomica delle funzioni preventivo, ma filtra
--  contatori_preventivo per tipo='ordine' e regex '^ORD-\d+/AA$')
```

Vincolo unicità sul `numero` è già presente (errore 23505 gestito in `createPreventivo`): siccome `PRV-` e `ORD-` hanno prefissi diversi, NON collidono mai, quindi il vincolo unico singolo va bene per entrambe le serie.

## Numerazione

- Preventivi: `PRV-{n}/{aa}` — invariato.
- Ordini: `ORD-{n}/{aa}` — nuova RPC `prossimo_numero_ordine`, contatore separato in `contatori_preventivo (anno, tipo='ordine')`. Stesso meccanismo atomico e retry su unique violation già esistente in `createPreventivo`.

## Codice — riusi e modifiche

### File modificati (riuso)

- **`src/lib/preventivi-api.ts`**
  - Aggiungo campo `tipo` ai tipi (auto-generato da Supabase types) e helper:
    - `anteprimaProssimoNumero(anno, tipo)` → chiama RPC giusta
    - `assegnaProssimoNumero(anno, tipo)` → idem
    - `createPreventivo(row)` legge `row.tipo` (default 'preventivo') per scegliere la serie ORD/PRV
  - `fetchPreventivi(filters)` accetta `tipo?: 'preventivo'|'ordine'` e filtra.

- **`src/components/layout/AppSidebar.tsx`** — aggiungo voce "Ordini" (icona `ShoppingCart`) con link `/ordini`.

- **`src/components/preventivi/NuovoPreventivoDialog.tsx`** — accetta prop `tipo` per cambiare titolo, label, RPC numero, e impostare `tipo` nell'insert.

- **`src/routes/preventivi.$id.tsx`** (editor) — già universale: legge il `tipo` del documento e adatta:
  - titolo pagina e breadcrumb ("Ordine ORD-…/…" vs "Preventivo PRV-…/…")
  - etichette PDF (`pdf-export.ts`) e email (dialog + edge function payload)

- **`src/lib/pdf-export.ts`** — header del PDF usa "Ordine" o "Preventivo" in base a `tipo`.

- **`src/components/preventivi/InviaEmailDialog.tsx`** + edge function `invia-email-preventivo` — oggetto/corpo email parametrizzati per tipo.

- **`src/components/clienti/...`** (scheda cliente, route `clienti.$id.tsx`) — aggiungo tab/sezione "Ordini" che riusa la stessa tabella di Preventivi con filtro `tipo='ordine'`.

### File nuovi

- **`src/routes/ordini.index.tsx`** — wrapper sottile che renderizza la stessa lista di `preventivi.index.tsx` con `tipo='ordine'`. Per minimizzare duplicazione estraggo `PreventiviList` componente condiviso (se non già fatto in `preventivi.index.tsx`, lo refactoro inline mantenendo la route preventivi funzionante).

- **`src/routes/ordini.$id.tsx`** — alias che monta lo stesso component dell'editor preventivo (`preventivi.$id.tsx`). In pratica entrambe le route caricano il documento per id e l'editor è agnostico al tipo. Per semplicità faccio sì che le navigazioni dalla lista Ordini puntino comunque a `/preventivi/$id` (la route è già universale grazie a `tipo`), evitando la duplicazione della route editor. Decisione: **una sola route editor** `/preventivi/$id` che gestisce entrambi i tipi; la lista Ordini linka lì. Se il cliente vuole URL `/ordini/$id`, lo aggiungo come thin wrapper.

## Verifica finale

1. Menu mostra "Preventivi" e "Ordini" separati.
2. `/ordini` lista solo `tipo='ordine'`; `/preventivi` solo `tipo='preventivo'`.
3. "Nuovo ordine" crea documento con `tipo='ordine'`, numero `ORD-100/26`, apre editor identico.
4. PDF e email dell'ordine dicono "Ordine ORD-…/26".
5. Scheda cliente mostra entrambe le sezioni.
6. `preventivo_origine_id` esiste ma resta sempre null in fase 1.

## Nota

Fase 1 di entità abbastanza estesa. Procedo nell'ordine: (1) migrazione DB (richiede approvazione utente), (2) refactor API + componenti, (3) nuove route e voce menu, (4) tab cliente. Confermo l'architettura prima di eseguire la migrazione?

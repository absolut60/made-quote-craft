export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agenti: {
        Row: {
          created_at: string
          filiale: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          filiale?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          filiale?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      articoli: {
        Row: {
          categoria: string | null
          cod_fornitore: string | null
          cod_gamma: string | null
          componente: string | null
          created_at: string
          descrizione: string
          fornitore_id: string | null
          id: string
          note: string | null
          peso_unit: number | null
          qta_cliente: number | null
          qta_fornitore: number | null
          stato: Database["public"]["Enums"]["stato_articolo"]
          tipologia: string | null
          um: string | null
          updated_at: string
        }
        Insert: {
          categoria?: string | null
          cod_fornitore?: string | null
          cod_gamma?: string | null
          componente?: string | null
          created_at?: string
          descrizione: string
          fornitore_id?: string | null
          id?: string
          note?: string | null
          peso_unit?: number | null
          qta_cliente?: number | null
          qta_fornitore?: number | null
          stato?: Database["public"]["Enums"]["stato_articolo"]
          tipologia?: string | null
          um?: string | null
          updated_at?: string
        }
        Update: {
          categoria?: string | null
          cod_fornitore?: string | null
          cod_gamma?: string | null
          componente?: string | null
          created_at?: string
          descrizione?: string
          fornitore_id?: string | null
          id?: string
          note?: string | null
          peso_unit?: number | null
          qta_cliente?: number | null
          qta_fornitore?: number | null
          stato?: Database["public"]["Enums"]["stato_articolo"]
          tipologia?: string | null
          um?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "articoli_fornitore_id_fkey"
            columns: ["fornitore_id"]
            isOneToOne: false
            referencedRelation: "fornitori"
            referencedColumns: ["id"]
          },
        ]
      }
      blocchi_preventivo: {
        Row: {
          created_at: string
          descrizione: string | null
          id: string
          importo: number | null
          kit_id: string | null
          note_tecniche: string | null
          ordine: number
          preventivo_id: string
          prezzo_um: number | null
          quantita_base: number | null
          rif_capitolato: string | null
          um_base: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          descrizione?: string | null
          id?: string
          importo?: number | null
          kit_id?: string | null
          note_tecniche?: string | null
          ordine?: number
          preventivo_id: string
          prezzo_um?: number | null
          quantita_base?: number | null
          rif_capitolato?: string | null
          um_base?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          descrizione?: string | null
          id?: string
          importo?: number | null
          kit_id?: string | null
          note_tecniche?: string | null
          ordine?: number
          preventivo_id?: string
          prezzo_um?: number | null
          quantita_base?: number | null
          rif_capitolato?: string | null
          um_base?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocchi_preventivo_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "kit"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocchi_preventivo_preventivo_id_fkey"
            columns: ["preventivo_id"]
            isOneToOne: false
            referencedRelation: "preventivi"
            referencedColumns: ["id"]
          },
        ]
      }
      cantieri: {
        Row: {
          cap: string | null
          cliente_id: string
          comune_id: string | null
          created_at: string
          id: string
          indirizzo: string | null
          nome: string
          prov: string | null
          updated_at: string
        }
        Insert: {
          cap?: string | null
          cliente_id: string
          comune_id?: string | null
          created_at?: string
          id?: string
          indirizzo?: string | null
          nome: string
          prov?: string | null
          updated_at?: string
        }
        Update: {
          cap?: string | null
          cliente_id?: string
          comune_id?: string | null
          created_at?: string
          id?: string
          indirizzo?: string | null
          nome?: string
          prov?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cantieri_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clienti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cantieri_comune_id_fkey"
            columns: ["comune_id"]
            isOneToOne: false
            referencedRelation: "comuni"
            referencedColumns: ["id"]
          },
        ]
      }
      clienti: {
        Row: {
          agente_id: string | null
          cap: string | null
          comune_id: string | null
          created_at: string
          fascia_listino_default:
            | Database["public"]["Enums"]["fascia_listino"]
            | null
          filiale: string | null
          id: string
          id_cliente: string | null
          indirizzo: string | null
          piva: string | null
          prov: string | null
          ragione_sociale: string
          updated_at: string
        }
        Insert: {
          agente_id?: string | null
          cap?: string | null
          comune_id?: string | null
          created_at?: string
          fascia_listino_default?:
            | Database["public"]["Enums"]["fascia_listino"]
            | null
          filiale?: string | null
          id?: string
          id_cliente?: string | null
          indirizzo?: string | null
          piva?: string | null
          prov?: string | null
          ragione_sociale: string
          updated_at?: string
        }
        Update: {
          agente_id?: string | null
          cap?: string | null
          comune_id?: string | null
          created_at?: string
          fascia_listino_default?:
            | Database["public"]["Enums"]["fascia_listino"]
            | null
          filiale?: string | null
          id?: string
          id_cliente?: string | null
          indirizzo?: string | null
          piva?: string | null
          prov?: string | null
          ragione_sociale?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clienti_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "agenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clienti_comune_id_fkey"
            columns: ["comune_id"]
            isOneToOne: false
            referencedRelation: "comuni"
            referencedColumns: ["id"]
          },
        ]
      }
      comuni: {
        Row: {
          cap: string | null
          codice_istat: string | null
          id: string
          nome: string
          provincia: string | null
        }
        Insert: {
          cap?: string | null
          codice_istat?: string | null
          id?: string
          nome: string
          provincia?: string | null
        }
        Update: {
          cap?: string | null
          codice_istat?: string | null
          id?: string
          nome?: string
          provincia?: string | null
        }
        Relationships: []
      }
      fornitori: {
        Row: {
          created_at: string
          id: string
          note: string | null
          ragione_sociale: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          ragione_sociale: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          ragione_sociale?: string
          updated_at?: string
        }
        Relationships: []
      }
      kit: {
        Row: {
          created_at: string
          descrizione_tecnica: string | null
          famiglia: Database["public"]["Enums"]["kit_famiglia"]
          h_max: number | null
          id: string
          isolante: string | null
          nome: string
          passo: number | null
          passo_um: string | null
          spessore: number | null
          tipo_struttura: string | null
          um_base: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descrizione_tecnica?: string | null
          famiglia?: Database["public"]["Enums"]["kit_famiglia"]
          h_max?: number | null
          id?: string
          isolante?: string | null
          nome: string
          passo?: number | null
          passo_um?: string | null
          spessore?: number | null
          tipo_struttura?: string | null
          um_base?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descrizione_tecnica?: string | null
          famiglia?: Database["public"]["Enums"]["kit_famiglia"]
          h_max?: number | null
          id?: string
          isolante?: string | null
          nome?: string
          passo?: number | null
          passo_um?: string | null
          spessore?: number | null
          tipo_struttura?: string | null
          um_base?: string
          updated_at?: string
        }
        Relationships: []
      }
      kit_componenti: {
        Row: {
          articolo_id: string | null
          created_at: string
          id: string
          incidenza: number | null
          kit_id: string
          lato: number | null
          ordine: number
          ruolo: string | null
          strato: number | null
          tipo_driver: Database["public"]["Enums"]["tipo_driver"] | null
          updated_at: string
          valore_driver: number | null
        }
        Insert: {
          articolo_id?: string | null
          created_at?: string
          id?: string
          incidenza?: number | null
          kit_id: string
          lato?: number | null
          ordine?: number
          ruolo?: string | null
          strato?: number | null
          tipo_driver?: Database["public"]["Enums"]["tipo_driver"] | null
          updated_at?: string
          valore_driver?: number | null
        }
        Update: {
          articolo_id?: string | null
          created_at?: string
          id?: string
          incidenza?: number | null
          kit_id?: string
          lato?: number | null
          ordine?: number
          ruolo?: string | null
          strato?: number | null
          tipo_driver?: Database["public"]["Enums"]["tipo_driver"] | null
          updated_at?: string
          valore_driver?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kit_componenti_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "articoli"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kit_componenti_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "kit"
            referencedColumns: ["id"]
          },
        ]
      }
      listini_acquisto: {
        Row: {
          articolo_id: string
          condizioni: string | null
          costo: number | null
          costo_netto: number | null
          costo_parziale: number | null
          created_at: string
          data_validita: string | null
          id: string
          listino_for: string | null
          note: string | null
          sc1: number | null
          sc2: number | null
          sc3: number | null
          sc4: number | null
          sc5: number | null
          trasporto_eur: number | null
          trasporto_perc: number | null
          updated_at: string
        }
        Insert: {
          articolo_id: string
          condizioni?: string | null
          costo?: number | null
          costo_netto?: number | null
          costo_parziale?: number | null
          created_at?: string
          data_validita?: string | null
          id?: string
          listino_for?: string | null
          note?: string | null
          sc1?: number | null
          sc2?: number | null
          sc3?: number | null
          sc4?: number | null
          sc5?: number | null
          trasporto_eur?: number | null
          trasporto_perc?: number | null
          updated_at?: string
        }
        Update: {
          articolo_id?: string
          condizioni?: string | null
          costo?: number | null
          costo_netto?: number | null
          costo_parziale?: number | null
          created_at?: string
          data_validita?: string | null
          id?: string
          listino_for?: string | null
          note?: string | null
          sc1?: number | null
          sc2?: number | null
          sc3?: number | null
          sc4?: number | null
          sc5?: number | null
          trasporto_eur?: number | null
          trasporto_perc?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listini_acquisto_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "articoli"
            referencedColumns: ["id"]
          },
        ]
      }
      listini_vendita: {
        Row: {
          articolo_id: string
          created_at: string
          fascia: Database["public"]["Enums"]["fascia_listino"]
          id: string
          margine: number | null
          prezzo: number | null
          ricarico: number | null
          updated_at: string
        }
        Insert: {
          articolo_id: string
          created_at?: string
          fascia: Database["public"]["Enums"]["fascia_listino"]
          id?: string
          margine?: number | null
          prezzo?: number | null
          ricarico?: number | null
          updated_at?: string
        }
        Update: {
          articolo_id?: string
          created_at?: string
          fascia?: Database["public"]["Enums"]["fascia_listino"]
          id?: string
          margine?: number | null
          prezzo?: number | null
          ricarico?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listini_vendita_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "articoli"
            referencedColumns: ["id"]
          },
        ]
      }
      preventivi: {
        Row: {
          agente_id: string | null
          cantiere_id: string | null
          cliente_id: string | null
          created_at: string
          data: string
          fascia_listino: Database["public"]["Enums"]["fascia_listino"] | null
          filiale: string | null
          id: string
          iva_importo: number | null
          iva_perc: number | null
          note: string | null
          numero: string | null
          stato: Database["public"]["Enums"]["stato_preventivo"]
          tipo_doc: Database["public"]["Enums"]["tipo_doc_preventivo"]
          totale: number | null
          totale_imponibile: number | null
          updated_at: string
          validita: string | null
        }
        Insert: {
          agente_id?: string | null
          cantiere_id?: string | null
          cliente_id?: string | null
          created_at?: string
          data?: string
          fascia_listino?: Database["public"]["Enums"]["fascia_listino"] | null
          filiale?: string | null
          id?: string
          iva_importo?: number | null
          iva_perc?: number | null
          note?: string | null
          numero?: string | null
          stato?: Database["public"]["Enums"]["stato_preventivo"]
          tipo_doc?: Database["public"]["Enums"]["tipo_doc_preventivo"]
          totale?: number | null
          totale_imponibile?: number | null
          updated_at?: string
          validita?: string | null
        }
        Update: {
          agente_id?: string | null
          cantiere_id?: string | null
          cliente_id?: string | null
          created_at?: string
          data?: string
          fascia_listino?: Database["public"]["Enums"]["fascia_listino"] | null
          filiale?: string | null
          id?: string
          iva_importo?: number | null
          iva_perc?: number | null
          note?: string | null
          numero?: string | null
          stato?: Database["public"]["Enums"]["stato_preventivo"]
          tipo_doc?: Database["public"]["Enums"]["tipo_doc_preventivo"]
          totale?: number | null
          totale_imponibile?: number | null
          updated_at?: string
          validita?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "preventivi_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "agenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preventivi_cantiere_id_fkey"
            columns: ["cantiere_id"]
            isOneToOne: false
            referencedRelation: "cantieri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preventivi_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clienti"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          cognome: string
          created_at: string
          disabled: boolean
          display_name: string | null
          email: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          cognome?: string
          created_at?: string
          disabled?: boolean
          display_name?: string | null
          email?: string | null
          id: string
          nome?: string
          updated_at?: string
        }
        Update: {
          cognome?: string
          created_at?: string
          disabled?: boolean
          display_name?: string | null
          email?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      righe_preventivo: {
        Row: {
          articolo_id: string | null
          blocco_id: string
          costo: number | null
          created_at: string
          descrizione: string | null
          id: string
          importo: number | null
          incidenza: number | null
          margine: number | null
          ordine: number
          peso: number | null
          prezzo_unit: number | null
          quantita: number | null
          ricarico: number | null
          sconto_perc: number | null
          segno: number
          tipo_riga: Database["public"]["Enums"]["tipo_riga_preventivo"]
          um: string | null
          updated_at: string
          vendita: number | null
        }
        Insert: {
          articolo_id?: string | null
          blocco_id: string
          costo?: number | null
          created_at?: string
          descrizione?: string | null
          id?: string
          importo?: number | null
          incidenza?: number | null
          margine?: number | null
          ordine?: number
          peso?: number | null
          prezzo_unit?: number | null
          quantita?: number | null
          ricarico?: number | null
          sconto_perc?: number | null
          segno?: number
          tipo_riga?: Database["public"]["Enums"]["tipo_riga_preventivo"]
          um?: string | null
          updated_at?: string
          vendita?: number | null
        }
        Update: {
          articolo_id?: string | null
          blocco_id?: string
          costo?: number | null
          created_at?: string
          descrizione?: string | null
          id?: string
          importo?: number | null
          incidenza?: number | null
          margine?: number | null
          ordine?: number
          peso?: number | null
          prezzo_unit?: number | null
          quantita?: number | null
          ricarico?: number | null
          sconto_perc?: number | null
          segno?: number
          tipo_riga?: Database["public"]["Enums"]["tipo_riga_preventivo"]
          um?: string | null
          updated_at?: string
          vendita?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "righe_preventivo_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "articoli"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "righe_preventivo_blocco_id_fkey"
            columns: ["blocco_id"]
            isOneToOne: false
            referencedRelation: "blocchi_preventivo"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "commerciale" | "lettura"
      fascia_listino: "A" | "B" | "C" | "SOCI"
      kit_famiglia:
        | "PARETE"
        | "CONTROPARETE"
        | "CTS_CARTONGESSO"
        | "CTS_MODULARE"
        | "VELETTA"
        | "ALTRO"
      stato_articolo: "attivo" | "potenziale"
      stato_preventivo: "bozza" | "inviato" | "confermato"
      tipo_doc_preventivo:
        | "PREVENTIVO"
        | "PROPOSTA_RAPIDA"
        | "LISTA_MATERIALI"
        | "LISTA_MAT_FORNITORE"
      tipo_driver: "CONSUMO" | "PASSO" | "LATI" | "INCIDENZA_FISSA"
      tipo_riga_preventivo:
        | "da_kit"
        | "articolo_singolo"
        | "manuale"
        | "sotto_totale"
        | "nota"
        | "separatore"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "commerciale", "lettura"],
      fascia_listino: ["A", "B", "C", "SOCI"],
      kit_famiglia: [
        "PARETE",
        "CONTROPARETE",
        "CTS_CARTONGESSO",
        "CTS_MODULARE",
        "VELETTA",
        "ALTRO",
      ],
      stato_articolo: ["attivo", "potenziale"],
      stato_preventivo: ["bozza", "inviato", "confermato"],
      tipo_doc_preventivo: [
        "PREVENTIVO",
        "PROPOSTA_RAPIDA",
        "LISTA_MATERIALI",
        "LISTA_MAT_FORNITORE",
      ],
      tipo_driver: ["CONSUMO", "PASSO", "LATI", "INCIDENZA_FISSA"],
      tipo_riga_preventivo: [
        "da_kit",
        "articolo_singolo",
        "manuale",
        "sotto_totale",
        "nota",
        "separatore",
      ],
    },
  },
} as const

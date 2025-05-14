export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      agendamentos: {
        Row: {
          contato_id: string | null
          criado_em: string | null
          descricao: string | null
          fim: string | null
          id: string
          inicio: string
          titulo: string
          usuario_id: string | null
        }
        Insert: {
          contato_id?: string | null
          criado_em?: string | null
          descricao?: string | null
          fim?: string | null
          id?: string
          inicio: string
          titulo: string
          usuario_id?: string | null
        }
        Update: {
          contato_id?: string | null
          criado_em?: string | null
          descricao?: string | null
          fim?: string | null
          id?: string
          inicio?: string
          titulo?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agendamentos_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      "COMPRA APROVADA - KIRVA": {
        Row: {
          Email: string | null
          id: number
          Nome: string | null
          Telefone: string | null
          Valor: string | null
        }
        Insert: {
          Email?: string | null
          id?: number
          Nome?: string | null
          Telefone?: string | null
          Valor?: string | null
        }
        Update: {
          Email?: string | null
          id?: number
          Nome?: string | null
          Telefone?: string | null
          Valor?: string | null
        }
        Relationships: []
      }
      "COMPRA APROVADA - KIWIFY": {
        Row: {
          Email: string | null
          id: number
          Nome: string | null
          Telefone: string | null
          Valor: string | null
        }
        Insert: {
          Email?: string | null
          id?: number
          Nome?: string | null
          Telefone?: string | null
          Valor?: string | null
        }
        Update: {
          Email?: string | null
          id?: number
          Nome?: string | null
          Telefone?: string | null
          Valor?: string | null
        }
        Relationships: []
      }
      contatos: {
        Row: {
          cargo: string | null
          criado_em: string | null
          criado_por: string | null
          email: string | null
          empresa: string | null
          id: string
          nome: string
          tags: string[] | null
          telefone: string | null
        }
        Insert: {
          cargo?: string | null
          criado_em?: string | null
          criado_por?: string | null
          email?: string | null
          empresa?: string | null
          id?: string
          nome: string
          tags?: string[] | null
          telefone?: string | null
        }
        Update: {
          cargo?: string | null
          criado_em?: string | null
          criado_por?: string | null
          email?: string | null
          empresa?: string | null
          id?: string
          nome?: string
          tags?: string[] | null
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contatos_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      conversas: {
        Row: {
          contato_id: string | null
          criado_em: string | null
          id: string
          usuario_id: string | null
        }
        Insert: {
          contato_id?: string | null
          criado_em?: string | null
          id?: string
          usuario_id?: string | null
        }
        Update: {
          contato_id?: string | null
          criado_em?: string | null
          id?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversas_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversas_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      deliveries: {
        Row: {
          address: string
          city: string
          client_name: string
          created_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          order_number: string
          phone: string
          state: string
          status: string
          updated_at: string | null
          zip_code: string
        }
        Insert: {
          address: string
          city: string
          client_name: string
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          order_number: string
          phone: string
          state: string
          status?: string
          updated_at?: string | null
          zip_code: string
        }
        Update: {
          address?: string
          city?: string
          client_name?: string
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          order_number?: string
          phone?: string
          state?: string
          status?: string
          updated_at?: string | null
          zip_code?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      gastos: {
        Row: {
          created_at: string | null
          id: number
          nome: string
          tipo: Database["public"]["Enums"]["tipo"]
          valor: number
        }
        Insert: {
          created_at?: string | null
          id?: never
          nome: string
          tipo: Database["public"]["Enums"]["tipo"]
          valor: number
        }
        Update: {
          created_at?: string | null
          id?: never
          nome?: string
          tipo?: Database["public"]["Enums"]["tipo"]
          valor?: number
        }
        Relationships: []
      }
      leads: {
        Row: {
          created_at: string | null
          id: number | null
          nome: string | null
          number: string | null
          timeout: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number | null
          nome?: string | null
          number?: string | null
          timeout?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number | null
          nome?: string | null
          number?: string | null
          timeout?: string | null
        }
        Relationships: []
      }
      mensagens: {
        Row: {
          autor_id: string | null
          conteudo: string
          conversa_id: string | null
          criada_em: string | null
          id: string
          lida: boolean | null
        }
        Insert: {
          autor_id?: string | null
          conteudo: string
          conversa_id?: string | null
          criada_em?: string | null
          id?: string
          lida?: boolean | null
        }
        Update: {
          autor_id?: string | null
          conteudo?: string
          conversa_id?: string | null
          criada_em?: string | null
          id?: string
          lida?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "conversas"
            referencedColumns: ["id"]
          },
        ]
      }
      "MENSAGENS ENVIADAS - KIRVA": {
        Row: {
          Email: string | null
          Evento: string | null
          id: number
          Nome: string | null
          Telefone: string | null
          Valor: string | null
        }
        Insert: {
          Email?: string | null
          Evento?: string | null
          id?: number
          Nome?: string | null
          Telefone?: string | null
          Valor?: string | null
        }
        Update: {
          Email?: string | null
          Evento?: string | null
          id?: number
          Nome?: string | null
          Telefone?: string | null
          Valor?: string | null
        }
        Relationships: []
      }
      "MENSAGENS ENVIADAS - KIWIFY": {
        Row: {
          Email: string | null
          Evento: string | null
          id: number
          Nome: string | null
          Telefone: string | null
          Valor: string | null
        }
        Insert: {
          Email?: string | null
          Evento?: string | null
          id?: number
          Nome?: string | null
          Telefone?: string | null
          Valor?: string | null
        }
        Update: {
          Email?: string | null
          Evento?: string | null
          id?: number
          Nome?: string | null
          Telefone?: string | null
          Valor?: string | null
        }
        Relationships: []
      }
      route_deliveries: {
        Row: {
          created_at: string | null
          delivery_id: string
          id: string
          route_id: string
          sequence_number: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          delivery_id: string
          id?: string
          route_id: string
          sequence_number: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          delivery_id?: string
          id?: string
          route_id?: string
          sequence_number?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "route_deliveries_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      teste: {
        Row: {
          criado_em: string | null
          descricao: string | null
          id: string
          nome: string | null
        }
        Insert: {
          criado_em?: string | null
          descricao?: string | null
          id?: string
          nome?: string | null
        }
        Update: {
          criado_em?: string | null
          descricao?: string | null
          id?: string
          nome?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          criado_em: string | null
          email: string
          id: string
          nome: string
          tipo: string
        }
        Insert: {
          criado_em?: string | null
          email: string
          id?: string
          nome: string
          tipo: string
        }
        Update: {
          criado_em?: string | null
          email?: string
          id?: string
          nome?: string
          tipo?: string
        }
        Relationships: []
      }
      "X - MENSAGENS FALHA - KIRVA": {
        Row: {
          Cod_boleto: string | null
          Cod_pix: string | null
          Email: string | null
          Evento: string | null
          id: number
          Nome: string | null
          Telefone: string | null
          Valor: string | null
        }
        Insert: {
          Cod_boleto?: string | null
          Cod_pix?: string | null
          Email?: string | null
          Evento?: string | null
          id?: number
          Nome?: string | null
          Telefone?: string | null
          Valor?: string | null
        }
        Update: {
          Cod_boleto?: string | null
          Cod_pix?: string | null
          Email?: string | null
          Evento?: string | null
          id?: number
          Nome?: string | null
          Telefone?: string | null
          Valor?: string | null
        }
        Relationships: []
      }
      "X - MENSAGENS FALHA - KIWIFY": {
        Row: {
          Cod_boleto: string | null
          Cod_pix: string | null
          Email: string | null
          Evento: string | null
          id: number
          Nome: string | null
          Telefone: string | null
          Valor: string | null
        }
        Insert: {
          Cod_boleto?: string | null
          Cod_pix?: string | null
          Email?: string | null
          Evento?: string | null
          id?: number
          Nome?: string | null
          Telefone?: string | null
          Valor?: string | null
        }
        Update: {
          Cod_boleto?: string | null
          Cod_pix?: string | null
          Email?: string | null
          Evento?: string | null
          id?: number
          Nome?: string | null
          Telefone?: string | null
          Valor?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      tipo:
        | "Mercado"
        | "Diversão"
        | "Comida"
        | "Educação"
        | "Assinatura"
        | "Transporte"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      tipo: [
        "Mercado",
        "Diversão",
        "Comida",
        "Educação",
        "Assinatura",
        "Transporte",
      ],
    },
  },
} as const

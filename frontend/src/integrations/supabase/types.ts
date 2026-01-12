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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ab_test_variants: {
        Row: {
          body: string
          created_at: string
          id: string
          step_id: string
          subject: string
          updated_at: string
          variant_name: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          step_id: string
          subject: string
          updated_at?: string
          variant_name?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          step_id?: string
          subject?: string
          updated_at?: string
          variant_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "ab_test_variants_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "campaign_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          created_at: string
          daily_limit: number | null
          email: string
          id: string
          is_connected: boolean | null
          provider: Database["public"]["Enums"]["account_provider"]
          updated_at: string
          user_id: string
          warmup_completed: boolean | null
          warmup_current_limit: number | null
          warmup_enabled: boolean | null
          warmup_increment: number | null
          warmup_start_date: string | null
          warmup_target_limit: number | null
        }
        Insert: {
          created_at?: string
          daily_limit?: number | null
          email: string
          id?: string
          is_connected?: boolean | null
          provider: Database["public"]["Enums"]["account_provider"]
          updated_at?: string
          user_id: string
          warmup_completed?: boolean | null
          warmup_current_limit?: number | null
          warmup_enabled?: boolean | null
          warmup_increment?: number | null
          warmup_start_date?: string | null
          warmup_target_limit?: number | null
        }
        Update: {
          created_at?: string
          daily_limit?: number | null
          email?: string
          id?: string
          is_connected?: boolean | null
          provider?: Database["public"]["Enums"]["account_provider"]
          updated_at?: string
          user_id?: string
          warmup_completed?: boolean | null
          warmup_current_limit?: number | null
          warmup_enabled?: boolean | null
          warmup_increment?: number | null
          warmup_start_date?: string | null
          warmup_target_limit?: number | null
        }
        Relationships: []
      }
      campaign_steps: {
        Row: {
          body: string
          campaign_id: string
          created_at: string
          delay_days: number | null
          id: string
          step_order: number
          subject: string
          updated_at: string
        }
        Insert: {
          body: string
          campaign_id: string
          created_at?: string
          delay_days?: number | null
          id?: string
          step_order: number
          subject: string
          updated_at?: string
        }
        Update: {
          body?: string
          campaign_id?: string
          created_at?: string
          delay_days?: number | null
          id?: string
          step_order?: number
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_steps_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          account_id: string | null
          created_at: string
          daily_limit: number | null
          id: string
          name: string
          schedule_end_hour: number | null
          schedule_start_hour: number | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["campaign_status"] | null
          timezone: string | null
          total_opened: number | null
          total_replied: number | null
          total_sent: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          daily_limit?: number | null
          id?: string
          name: string
          schedule_end_hour?: number | null
          schedule_start_hour?: number | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"] | null
          timezone?: string | null
          total_opened?: number | null
          total_replied?: number | null
          total_sent?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          daily_limit?: number | null
          id?: string
          name?: string
          schedule_end_hour?: number | null
          schedule_start_hour?: number | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"] | null
          timezone?: string | null
          total_opened?: number | null
          total_replied?: number | null
          total_sent?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      email_events: {
        Row: {
          campaign_id: string
          created_at: string
          event_type: string
          id: string
          lead_id: string
          variant_id: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          event_type: string
          id?: string
          lead_id: string
          variant_id?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          event_type?: string
          id?: string
          lead_id?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_events_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "ab_test_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body: string
          created_at: string
          id: string
          name: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          name: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          name?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          campaign_id: string | null
          company: string | null
          created_at: string
          current_step_id: string | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          next_step_due_at: string | null
          status: Database["public"]["Enums"]["lead_status"] | null
          unsubscribe_token: string | null
          updated_at: string
          user_id: string
          variant_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          company?: string | null
          created_at?: string
          current_step_id?: string | null
          email: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          next_step_due_at?: string | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          unsubscribe_token?: string | null
          updated_at?: string
          user_id: string
          variant_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          company?: string | null
          created_at?: string
          current_step_id?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          next_step_due_at?: string | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          unsubscribe_token?: string | null
          updated_at?: string
          user_id?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_current_step_id_fkey"
            columns: ["current_step_id"]
            isOneToOne: false
            referencedRelation: "campaign_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "ab_test_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      warmup_logs: {
        Row: {
          account_id: string
          created_at: string
          daily_limit: number
          emails_sent: number
          id: string
          log_date: string
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          daily_limit: number
          emails_sent?: number
          id?: string
          log_date?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          daily_limit?: number
          emails_sent?: number
          id?: string
          log_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "warmup_logs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      account_provider: "google" | "outlook"
      campaign_status: "draft" | "active" | "paused" | "completed"
      lead_status:
        | "pending"
        | "sent"
        | "opened"
        | "replied"
        | "bounced"
        | "unsubscribed"
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
      account_provider: ["google", "outlook"],
      campaign_status: ["draft", "active", "paused", "completed"],
      lead_status: [
        "pending",
        "sent",
        "opened",
        "replied",
        "bounced",
        "unsubscribed",
      ],
    },
  },
} as const

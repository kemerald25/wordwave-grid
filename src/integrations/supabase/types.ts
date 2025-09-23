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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      auth_sessions: {
        Row: {
          auth_type: string
          created_at: string | null
          expires_at: string
          farcaster_fid: string | null
          id: string
          is_active: boolean | null
          session_token: string
          signature_data: Json | null
          user_id: string | null
          wallet_address: string | null
        }
        Insert: {
          auth_type: string
          created_at?: string | null
          expires_at: string
          farcaster_fid?: string | null
          id?: string
          is_active?: boolean | null
          session_token: string
          signature_data?: Json | null
          user_id?: string | null
          wallet_address?: string | null
        }
        Update: {
          auth_type?: string
          created_at?: string | null
          expires_at?: string
          farcaster_fid?: string | null
          id?: string
          is_active?: boolean | null
          session_token?: string
          signature_data?: Json | null
          user_id?: string | null
          wallet_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auth_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      dictionary_words: {
        Row: {
          created_at: string | null
          definition: string | null
          language: string | null
          word: string
        }
        Insert: {
          created_at?: string | null
          definition?: string | null
          language?: string | null
          word: string
        }
        Update: {
          created_at?: string | null
          definition?: string | null
          language?: string | null
          word?: string
        }
        Relationships: []
      }
      game_moves: {
        Row: {
          chain_valid: boolean | null
          created_at: string | null
          id: string
          is_valid: boolean | null
          normalized_word: string
          player_id: string | null
          points_awarded: number | null
          room_id: string | null
          round_id: string | null
          submitted_at: string
          time_taken_ms: number | null
          user_id: string | null
          validation_reason: string | null
          word: string
        }
        Insert: {
          chain_valid?: boolean | null
          created_at?: string | null
          id?: string
          is_valid?: boolean | null
          normalized_word: string
          player_id?: string | null
          points_awarded?: number | null
          room_id?: string | null
          round_id?: string | null
          submitted_at: string
          time_taken_ms?: number | null
          user_id?: string | null
          validation_reason?: string | null
          word: string
        }
        Update: {
          chain_valid?: boolean | null
          created_at?: string | null
          id?: string
          is_valid?: boolean | null
          normalized_word?: string
          player_id?: string | null
          points_awarded?: number | null
          room_id?: string | null
          round_id?: string | null
          submitted_at?: string
          time_taken_ms?: number | null
          user_id?: string | null
          validation_reason?: string | null
          word?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_moves_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "game_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_moves_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_moves_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "game_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_moves_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      game_players: {
        Row: {
          avatar_url: string | null
          display_name: string
          eliminated_at: string | null
          id: string
          is_active: boolean | null
          joined_at: string | null
          room_id: string | null
          score: number | null
          turn_order: number | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          display_name: string
          eliminated_at?: string | null
          id?: string
          is_active?: boolean | null
          joined_at?: string | null
          room_id?: string | null
          score?: number | null
          turn_order?: number | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          display_name?: string
          eliminated_at?: string | null
          id?: string
          is_active?: boolean | null
          joined_at?: string | null
          room_id?: string | null
          score?: number | null
          turn_order?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_players_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_players_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      game_rooms: {
        Row: {
          created_at: string | null
          current_player_turn: string | null
          current_round: number | null
          finished_at: string | null
          host_id: string | null
          id: string
          last_word: string | null
          max_players: number | null
          name: string
          round_time_seconds: number | null
          rounds: number | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          current_player_turn?: string | null
          current_round?: number | null
          finished_at?: string | null
          host_id?: string | null
          id?: string
          last_word?: string | null
          max_players?: number | null
          name: string
          round_time_seconds?: number | null
          rounds?: number | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          current_player_turn?: string | null
          current_round?: number | null
          finished_at?: string | null
          host_id?: string | null
          id?: string
          last_word?: string | null
          max_players?: number | null
          name?: string
          round_time_seconds?: number | null
          rounds?: number | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_rooms_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      game_rounds: {
        Row: {
          ended_at: string | null
          id: string
          room_id: string | null
          round_number: number
          started_at: string | null
          winner_id: string | null
        }
        Insert: {
          ended_at?: string | null
          id?: string
          room_id?: string | null
          round_number: number
          started_at?: string | null
          winner_id?: string | null
        }
        Update: {
          ended_at?: string | null
          id?: string
          room_id?: string | null
          round_number?: number
          started_at?: string | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_rounds_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_rounds_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboards: {
        Row: {
          average_time_ms: number | null
          best_streak: number | null
          favorite_word: string | null
          id: string
          total_games: number | null
          total_points: number | null
          total_wins: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          average_time_ms?: number | null
          best_streak?: number | null
          favorite_word?: string | null
          id?: string
          total_games?: number | null
          total_points?: number | null
          total_wins?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          average_time_ms?: number | null
          best_streak?: number | null
          favorite_word?: string | null
          id?: string
          total_games?: number | null
          total_points?: number | null
          total_wins?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leaderboards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          farcaster_fid: string | null
          guest_session_id: string | null
          handle: string | null
          id: string
          is_guest: boolean | null
          last_seen: string | null
          supabase_auth_id: string | null
          updated_at: string | null
          wallet_address: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          farcaster_fid?: string | null
          guest_session_id?: string | null
          handle?: string | null
          id?: string
          is_guest?: boolean | null
          last_seen?: string | null
          supabase_auth_id?: string | null
          updated_at?: string | null
          wallet_address?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          farcaster_fid?: string | null
          guest_session_id?: string | null
          handle?: string | null
          id?: string
          is_guest?: boolean | null
          last_seen?: string | null
          supabase_auth_id?: string | null
          updated_at?: string | null
          wallet_address?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_guest_user: {
        Args: { avatar_url?: string; display_name?: string }
        Returns: string
      }
      get_last_char: {
        Args: { word: string }
        Returns: string
      }
      normalize_word: {
        Args: { word: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

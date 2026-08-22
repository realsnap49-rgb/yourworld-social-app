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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      direct_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          media_type: string
          media_url: string | null
          sender_id: string
          thread_id: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          media_type?: string
          media_url?: string | null
          sender_id: string
          thread_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          media_type?: string
          media_url?: string | null
          sender_id?: string
          thread_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      orbit_chat_requests: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          intro: string | null
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          intro?: string | null
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          intro?: string | null
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      orbit_connections: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      orbit_likes: {
        Row: {
          created_at: string
          id: string
          target_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          target_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          target_id?: string
          user_id?: string
        }
        Relationships: []
      }
      orbit_messages: {
        Row: {
          created_at: string
          id: string
          kind: string
          recipient_id: string
          sender_id: string
          text: string | null
          updated_at: string
          url: string | null
          view_once: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          recipient_id: string
          sender_id: string
          text?: string | null
          updated_at?: string
          url?: string | null
          view_once?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          recipient_id?: string
          sender_id?: string
          text?: string | null
          updated_at?: string
          url?: string | null
          view_once?: boolean
        }
        Relationships: []
      }
      orbit_profiles: {
        Row: {
          about: string
          age: number
          city: string
          country: string
          created_at: string
          gender: string
          hobbies: string[]
          looking_for: string
          mood: string | null
          name: string
          orbit_enabled: boolean
          original_photo_privacy: string
          photos: Json
          state: string
          updated_at: string
          user_id: string
          visible: boolean
        }
        Insert: {
          about?: string
          age: number
          city?: string
          country?: string
          created_at?: string
          gender?: string
          hobbies?: string[]
          looking_for?: string
          mood?: string | null
          name: string
          orbit_enabled?: boolean
          original_photo_privacy?: string
          photos?: Json
          state?: string
          updated_at?: string
          user_id: string
          visible?: boolean
        }
        Update: {
          about?: string
          age?: number
          city?: string
          country?: string
          created_at?: string
          gender?: string
          hobbies?: string[]
          looking_for?: string
          mood?: string | null
          name?: string
          orbit_enabled?: boolean
          original_photo_privacy?: string
          photos?: Json
          state?: string
          updated_at?: string
          user_id?: string
          visible?: boolean
        }
        Relationships: []
      }
      orbit_request_messages: {
        Row: {
          created_at: string
          id: string
          kind: string
          request_id: string
          sender_id: string
          text: string | null
          url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          request_id: string
          sender_id: string
          text?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          request_id?: string
          sender_id?: string
          text?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orbit_request_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "orbit_chat_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      orbit_settings: {
        Row: {
          created_at: string
          privacy: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          privacy?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          privacy?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          body: string
          created_at: string
          id: string
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          allow_download: boolean
          audience: string
          audio: string | null
          caption: string
          created_at: string
          hashtags: string[]
          id: string
          kind: string
          link: string | null
          location: string | null
          media_type: string
          media_url: string
          tagged_user_ids: string[]
          updated_at: string
          user_id: string
          viewer_user_ids: string[]
        }
        Insert: {
          allow_download?: boolean
          audience?: string
          audio?: string | null
          caption?: string
          created_at?: string
          hashtags?: string[]
          id?: string
          kind?: string
          link?: string | null
          location?: string | null
          media_type?: string
          media_url?: string
          tagged_user_ids?: string[]
          updated_at?: string
          user_id: string
          viewer_user_ids?: string[]
        }
        Update: {
          allow_download?: boolean
          audience?: string
          audio?: string | null
          caption?: string
          created_at?: string
          hashtags?: string[]
          id?: string
          kind?: string
          link?: string | null
          location?: string | null
          media_type?: string
          media_url?: string
          tagged_user_ids?: string[]
          updated_at?: string
          user_id?: string
          viewer_user_ids?: string[]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          category: string | null
          cover_url: string | null
          created_at: string
          display_name: string | null
          gender: string | null
          id: string
          location: string | null
          updated_at: string
          username: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          category?: string | null
          cover_url?: string | null
          created_at?: string
          display_name?: string | null
          gender?: string | null
          id: string
          location?: string | null
          updated_at?: string
          username?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          category?: string | null
          cover_url?: string | null
          created_at?: string
          display_name?: string | null
          gender?: string | null
          id?: string
          location?: string | null
          updated_at?: string
          username?: string | null
          website?: string | null
        }
        Relationships: []
      }
      thread_participants: {
        Row: {
          created_at: string
          id: string
          thread_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          thread_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          currency: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      burn_view_once: { Args: { _msg_id: string }; Returns: undefined }
      discover_orbit_profiles: {
        Args: { ids?: string[] }
        Returns: {
          about: string
          age: number
          city: string
          country: string
          gender: string
          hobbies: string[]
          looking_for: string
          mood: string
          name: string
          orbit_enabled: boolean
          original_photo_privacy: string
          photos: Json
          state: string
          updated_at: string
          user_id: string
          visible: boolean
        }[]
      }
      get_public_profiles: {
        Args: { ids: string[] }
        Returns: {
          avatar_url: string
          display_name: string
          id: string
          username: string
        }[]
      }
      search_profiles: {
        Args: { search?: string }
        Returns: {
          avatar_url: string
          display_name: string
          id: string
          username: string
        }[]
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

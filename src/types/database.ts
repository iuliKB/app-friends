// Generated from supabase/migrations/0001_init.sql
// Regenerate via: npx supabase gen types typescript --project-id $PROJECT_REF > src/types/database.ts
// after applying the migration to your Supabase project.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          display_name: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
          // Phase 3 v1.3 (migration 0010) — timezone + friend-free toggle
          timezone: string | null;
          notify_friend_free: boolean;
          // Phase 6 v1.4 (migration 0016) — birthday month/day columns
          birthday_month: number | null;
          birthday_day: number | null;
        };
        Insert: {
          id: string;
          username?: string | null;
          display_name?: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
          // Phase 3 v1.3 (migration 0010) — timezone + friend-free toggle
          timezone?: string | null;
          notify_friend_free?: boolean;
          // Phase 6 v1.4 (migration 0016) — birthday month/day columns
          birthday_month?: number | null;
          birthday_day?: number | null;
        };
        Update: {
          id?: string;
          username?: string | null;
          display_name?: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
          // Phase 3 v1.3 (migration 0010) — timezone + friend-free toggle
          timezone?: string | null;
          notify_friend_free?: boolean;
          // Phase 6 v1.4 (migration 0016) — birthday month/day columns
          birthday_month?: number | null;
          birthday_day?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey';
            columns: ['id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      statuses: {
        Row: {
          user_id: string;
          status: Database['public']['Enums']['availability_status'];
          context_tag: string | null;
          updated_at: string;
          // Phase 2 v1.3 (migration 0009) — TTL + heartbeat columns
          status_expires_at: string;
          last_active_at: string;
        };
        Insert: {
          user_id: string;
          status?: Database['public']['Enums']['availability_status'];
          context_tag?: string | null;
          updated_at?: string;
          status_expires_at?: string;
          last_active_at?: string;
        };
        Update: {
          user_id?: string;
          status?: Database['public']['Enums']['availability_status'];
          context_tag?: string | null;
          updated_at?: string;
          status_expires_at?: string;
          last_active_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'statuses_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      friendships: {
        Row: {
          id: string;
          requester_id: string;
          addressee_id: string;
          status: Database['public']['Enums']['friendship_status'];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          requester_id: string;
          addressee_id: string;
          status?: Database['public']['Enums']['friendship_status'];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          requester_id?: string;
          addressee_id?: string;
          status?: Database['public']['Enums']['friendship_status'];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'friendships_requester_id_fkey';
            columns: ['requester_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'friendships_addressee_id_fkey';
            columns: ['addressee_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      plans: {
        Row: {
          id: string;
          created_by: string;
          title: string;
          scheduled_for: string | null;
          location: string | null;
          link_dump: string | null;
          general_notes: string | null;
          created_at: string;
          updated_at: string;
          cover_image_url: string | null;
        };
        Insert: {
          id?: string;
          created_by: string;
          title: string;
          scheduled_for?: string | null;
          location?: string | null;
          link_dump?: string | null;
          general_notes?: string | null;
          created_at?: string;
          updated_at?: string;
          cover_image_url?: string | null;
        };
        Update: {
          id?: string;
          created_by?: string;
          title?: string;
          scheduled_for?: string | null;
          location?: string | null;
          link_dump?: string | null;
          general_notes?: string | null;
          created_at?: string;
          updated_at?: string;
          cover_image_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'plans_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      plan_members: {
        Row: {
          plan_id: string;
          user_id: string;
          rsvp: Database['public']['Enums']['rsvp_status'];
          joined_at: string;
        };
        Insert: {
          plan_id: string;
          user_id: string;
          rsvp?: Database['public']['Enums']['rsvp_status'];
          joined_at?: string;
        };
        Update: {
          plan_id?: string;
          user_id?: string;
          rsvp?: Database['public']['Enums']['rsvp_status'];
          joined_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'plan_members_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'plan_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      dm_channels: {
        Row: {
          id: string;
          user_a: string;
          user_b: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_a: string;
          user_b: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_a?: string;
          user_b?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'dm_channels_user_a_fkey';
            columns: ['user_a'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'dm_channels_user_b_fkey';
            columns: ['user_b'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      push_tokens: {
        Row: {
          id: string;
          user_id: string;
          token: string;
          platform: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          token: string;
          platform: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          token?: string;
          platform?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'push_tokens_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      messages: {
        Row: {
          id: string;
          plan_id: string | null;
          dm_channel_id: string | null;
          sender_id: string;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          plan_id?: string | null;
          dm_channel_id?: string | null;
          sender_id: string;
          body: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          plan_id?: string | null;
          dm_channel_id?: string | null;
          sender_id?: string;
          body?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_dm_channel_id_fkey';
            columns: ['dm_channel_id'];
            isOneToOne: false;
            referencedRelation: 'dm_channels';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      // Phase 3 v1.3 (migration 0010) — outbox table for friend-went-free webhook dispatch
      free_transitions: {
        Row: {
          id: number;
          sender_id: string;
          occurred_at: string;
          context_tag: string | null;
          sent_at: string | null;
          attempts: number;
          last_error: string | null;
        };
        Insert: {
          id?: number;
          sender_id: string;
          occurred_at?: string;
          context_tag?: string | null;
          sent_at?: string | null;
          attempts?: number;
          last_error?: string | null;
        };
        Update: {
          id?: number;
          sender_id?: string;
          occurred_at?: string;
          context_tag?: string | null;
          sent_at?: string | null;
          attempts?: number;
          last_error?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'free_transitions_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      // Phase 3 v1.3 (migration 0010) — rate-limit log for friend-free push decisions
      friend_free_pushes: {
        Row: {
          id: number;
          recipient_id: string;
          sender_id: string;
          sent_at: string;
          suppressed: boolean;
          suppression_reason: string | null;
        };
        Insert: {
          id?: number;
          recipient_id: string;
          sender_id: string;
          sent_at?: string;
          suppressed: boolean;
          suppression_reason?: string | null;
        };
        Update: {
          id?: number;
          recipient_id?: string;
          sender_id?: string;
          sent_at?: string;
          suppressed?: boolean;
          suppression_reason?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'friend_free_pushes_recipient_id_fkey';
            columns: ['recipient_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'friend_free_pushes_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      // Phase 5 v1.4 (migration 0015) — IOU expense splitting tables
      iou_groups: {
        Row: {
          id: string;
          created_by: string;
          title: string;
          total_amount_cents: number;
          split_mode: 'even' | 'custom';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          created_by: string;
          title: string;
          total_amount_cents: number;
          split_mode?: 'even' | 'custom';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          created_by?: string;
          title?: string;
          total_amount_cents?: number;
          split_mode?: 'even' | 'custom';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      iou_members: {
        Row: {
          iou_group_id: string;
          user_id: string;
          share_amount_cents: number;
          settled_at: string | null;
          settled_by: string | null;
        };
        Insert: {
          iou_group_id: string;
          user_id: string;
          share_amount_cents: number;
          settled_at?: string | null;
          settled_by?: string | null;
        };
        Update: {
          iou_group_id?: string;
          user_id?: string;
          share_amount_cents?: number;
          settled_at?: string | null;
          settled_by?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      // Phase 2 v1.3 (migration 0009) — effective status view (security_invoker=true).
      // Encodes the server-side ALIVE/DEAD projection of statuses per D-16.
      effective_status: {
        Row: {
          user_id: string;
          effective_status: Database['public']['Enums']['availability_status'] | null;
          context_tag: string | null;
          status_expires_at: string;
          last_active_at: string;
        };
        Relationships: [];
      };
    };
    Enums: {
      availability_status: 'free' | 'busy' | 'maybe';
      friendship_status: 'pending' | 'accepted' | 'rejected';
      rsvp_status: 'invited' | 'going' | 'maybe' | 'out';
    };
    Functions: {
      is_friend_of: {
        Args: {
          target_user: string;
        };
        Returns: boolean;
      };
      get_friends: {
        Args: Record<string, never>;
        Returns: {
          friend_id: string;
          username: string | null;
          display_name: string;
          avatar_url: string | null;
          friendship_status: Database['public']['Enums']['friendship_status'];
          created_at: string;
        }[];
      };
      get_free_friends: {
        Args: Record<string, never>;
        Returns: {
          friend_id: string;
          username: string | null;
          display_name: string;
          avatar_url: string | null;
          status: Database['public']['Enums']['availability_status'];
          context_tag: string | null;
          status_updated_at: string;
        }[];
      };
      get_or_create_dm_channel: {
        Args: {
          other_user_id: string;
        };
        Returns: string;
      };
      // Phase 4 v1.3 (migration 0011) — viewer-scoped sliding-window streak; SECURITY DEFINER
      get_squad_streak: {
        Args: {
          viewer_id: string;
          tz: string;
        };
        Returns: {
          current_weeks: number;
          best_weeks: number;
        }[];
      };
      // Phase 03 v1.3.5 (migration 0012) — lightweight nudge ping, rate-limited
      send_nudge: {
        Args: {
          receiver_id: string;
        };
        Returns: string;
      };
      // Phase 3 v1.3 (migration 0010) — returns full candidate set for friend-free push
      get_friend_free_candidates: {
        Args: {
          p_sender: string;
        };
        Returns: {
          recipient_id: string;
          notify_friend_free: boolean;
          effective_status: Database['public']['Enums']['availability_status'] | null;
          local_hour: number | null;
          push_tokens: string[];
        }[];
      };
    };
    CompositeTypes: Record<string, never>;
  };
};

// Convenience type aliases for common usage patterns
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];

// Row type aliases for common use
export type Profile = Tables<'profiles'>;
export type Status = Tables<'statuses'>;
export type Friendship = Tables<'friendships'>;
export type Plan = Tables<'plans'>;
export type PlanMember = Tables<'plan_members'>;
export type DmChannel = Tables<'dm_channels'>;
export type Message = Tables<'messages'>;

// Enum type aliases
export type AvailabilityStatus = Enums<'availability_status'>;
export type FriendshipStatus = Enums<'friendship_status'>;
export type RsvpStatus = Enums<'rsvp_status'>;

// Phase 3 v1.3 row-type aliases
export type FreeTransition = Tables<'free_transitions'>;
export type FriendFreePush = Tables<'friend_free_pushes'>;

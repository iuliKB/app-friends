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
          // Phase 11 v1.4 (migration 0017) — birthday year
          birthday_year: number | null;
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
          // Phase 11 v1.4 (migration 0017) — birthday year
          birthday_year?: number | null;
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
          // Phase 11 v1.4 (migration 0017) — birthday year
          birthday_year?: number | null;
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
          // Phase 20 v1.6 (migration 0020) — map lat/lng
          latitude: number | null;
          longitude: number | null;
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
          // Phase 20 v1.6 (migration 0020) — map lat/lng
          latitude?: number | null;
          longitude?: number | null;
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
          // Phase 20 v1.6 (migration 0020) — map lat/lng
          latitude?: number | null;
          longitude?: number | null;
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
          group_channel_id: string | null;  // Phase 11 v1.4 (migration 0017) — group DM channel
          sender_id: string;
          body: string | null;              // Phase 14 v1.4 (migration 0018) — nullable for image-only messages
          created_at: string;
          image_url: string | null;         // Phase 14 v1.4 (migration 0018)
          reply_to_message_id: string | null; // Phase 14 v1.4 (migration 0018)
          message_type: string;             // Phase 14 v1.4 (migration 0018) — 'text' | 'image' | 'poll'
          poll_id: string | null;           // Phase 14 v1.4 (migration 0018)
        };
        Insert: {
          id?: string;
          plan_id?: string | null;
          dm_channel_id?: string | null;
          group_channel_id?: string | null;
          sender_id: string;
          body?: string | null;
          created_at?: string;
          image_url?: string | null;
          reply_to_message_id?: string | null;
          message_type?: string;
          poll_id?: string | null;
        };
        Update: {
          id?: string;
          plan_id?: string | null;
          dm_channel_id?: string | null;
          group_channel_id?: string | null;
          sender_id?: string;
          body?: string | null;
          created_at?: string;
          image_url?: string | null;
          reply_to_message_id?: string | null;
          message_type?: string;
          poll_id?: string | null;
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
      // Phase 11 v1.4 (migration 0017) — wish lists, wish list claims, group channels
      wish_list_items: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          url: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          url?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          url?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      wish_list_claims: {
        Row: {
          item_id: string;
          claimer_id: string;
          created_at: string;
        };
        Insert: {
          item_id: string;
          claimer_id: string;
          created_at?: string;
        };
        Update: {
          item_id?: string;
          claimer_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      group_channels: {
        Row: {
          id: string;
          name: string;
          created_by: string;
          created_at: string;
          // migration 0018 — birthday person reference for in-chat wish list
          birthday_person_id: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          created_by: string;
          created_at?: string;
          birthday_person_id?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          created_by?: string;
          created_at?: string;
          birthday_person_id?: string | null;
        };
        Relationships: [];
      };
      wish_list_votes: {
        Row: {
          item_id: string;
          group_channel_id: string;
          voter_id: string;
          created_at: string;
        };
        Insert: {
          item_id: string;
          group_channel_id: string;
          voter_id: string;
          created_at?: string;
        };
        Update: {
          item_id?: string;
          group_channel_id?: string;
          voter_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      group_channel_members: {
        Row: {
          group_channel_id: string;
          user_id: string;
          joined_at: string;
        };
        Insert: {
          group_channel_id: string;
          user_id: string;
          joined_at?: string;
        };
        Update: {
          group_channel_id?: string;
          user_id?: string;
          joined_at?: string;
        };
        Relationships: [];
      };
      // Phase 15 (migration 0018) — message reactions table
      message_reactions: {
        Row: {
          message_id: string;
          user_id: string;
          emoji: string;
          created_at: string;
        };
        Insert: {
          message_id: string;
          user_id: string;
          emoji: string;
          created_at?: string;
        };
        Update: {
          message_id?: string;
          user_id?: string;
          emoji?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      // Phase 21 v1.6 (migration 0021) — plan gallery
      plan_photos: {
        Row: {
          id: string;
          plan_id: string;
          uploader_id: string;
          storage_path: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          plan_id: string;
          uploader_id: string;
          storage_path: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          plan_id?: string;
          uploader_id?: string;
          storage_path?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'plan_photos_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'plan_photos_uploader_id_fkey';
            columns: ['uploader_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
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
      // Phase 7 v1.4 (migration 0016) — upcoming birthdays for authenticated user's accepted friends
      // Updated in Phase 11 (migration 0017) to include birthday_year
      get_upcoming_birthdays: {
        Args: Record<string, never>;
        Returns: {
          friend_id: string;
          display_name: string;
          avatar_url: string | null;
          birthday_month: number;
          birthday_day: number;
          birthday_year: number | null;
          days_until: number;
        }[];
      };
      // Phase 11 v1.4 (migration 0017) — friends of a target user (for birthday group picker)
      get_friends_of: {
        Args: { p_target_user: string };
        Returns: { friend_id: string; display_name: string; avatar_url: string | null }[];
      };
      // Phase 11 v1.4 (migration 0017) — atomic birthday group channel creation
      create_birthday_group: {
        Args: { p_name: string; p_member_ids: string[] };
        Returns: string;
      };
      // Phase 8 v1.4 (migration 0015) — atomic expense creation RPC; largest-remainder split
      create_expense: {
        Args: {
          p_title: string;
          p_total_amount_cents: number;
          p_participant_ids: string[];
          p_split_mode?: 'even' | 'custom';
          p_custom_cents?: number[] | null;
        };
        Returns: string; // uuid of new iou_groups row
      };
      // Phase 9 v1.4 (migration 0015) — per-friend net balance summary; unsettled balances only
      get_iou_summary: {
        Args: Record<string, never>;
        Returns: {
          friend_id: string;
          display_name: string;
          avatar_url: string | null;
          net_amount_cents: number;
          unsettled_count: number;
        }[];
      };
      // Phase 21 v1.6 (migration 0021) — atomic 10-photo cap check + insert; SECURITY DEFINER
      add_plan_photo: {
        Args: {
          p_plan_id: string;
          p_storage_path: string;
        };
        Returns: undefined;
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

// Phase 8 v1.4 row-type aliases for IOU tables
export type IouGroup = Tables<'iou_groups'>;
export type IouMember = Tables<'iou_members'>;

// Phase 15 v1.4 row-type alias for message reactions
// Note: MessageReaction is already used in src/types/chat.ts for a different (aggregated) shape
export type MessageReactionRow = Tables<'message_reactions'>;

// Phase 21 v1.6 row-type alias for plan_photos
export type PlanPhoto = Tables<'plan_photos'>;

// Phase 21 v1.6 app-layer type for usePlanPhotos hook (D-14)
export type PlanPhotoWithUploader = {
  id: string;
  planId: string;
  uploaderId: string;
  storagePath: string;
  signedUrl: string;       // 1-hour TTL signed URL generated at fetch time
  createdAt: string;
  uploader: {
    displayName: string;
    avatarUrl: string | null;
  };
};

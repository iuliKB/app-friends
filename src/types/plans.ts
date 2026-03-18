export interface Plan {
  id: string;
  created_by: string;
  title: string;
  scheduled_for: string | null;
  location: string | null;
  link_dump: string | null;
  iou_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanMember {
  plan_id: string;
  user_id: string;
  rsvp: 'invited' | 'going' | 'maybe' | 'out';
  joined_at: string;
  profiles: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  };
}

export interface PlanWithMembers extends Plan {
  members: PlanMember[];
}

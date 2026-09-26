export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: "admin" | "manager" | "user";
  whatsapp: string | null;
  created_at?: string;
}

export interface MemberCategory {
  id: string;
  name: string;
  sort_order: number;
}

export interface TeamMember {
  id: string;
  category_id: string;
  name: string;
  tag: string | null;
  role_title: string | null;
  bio: string | null;
  photo_url: string | null;
  socials: Record<string, string>;
  sort_order: number;
  is_active: boolean;
}

export interface TournamentTemplate {
  id: string;
  name: string;
  game: string;
  team_size: number;
  substitutes_max: number;
  max_teams: number;
  entry_fee_inr: number;
  auto_approve: boolean;
  rules_md: string;
}

export interface Tournament {
  id: string;
  slug: string;
  name: string;
  game: string;
  description: string | null;
  team_size: number;
  substitutes_max: number;
  max_teams: number;
  entry_fee_inr: number;
  upi_note: string | null;
  registration_starts_at: string | null;
  registration_ends_at: string | null;
  event_starts_at: string | null;
  event_ends_at: string | null;
  status_override: "upcoming" | "ongoing" | "completed" | null;
  auto_approve: boolean;
  require_verified_uids?: boolean;
  rules_md: string;
  youtube_live_id: string | null;
  vod_url: string | null;
  hero_image_url: string | null;
  whatsapp_group_link: string | null;
  manager_contact: string | null;
  template_id: string | null;
  archived_at: string | null;
  created_at: string;
}

export interface Registration {
  id: string;
  tournament_id: string;
  user_id: string | null;
  guest_name: string | null;
  team_name: string;
  team_tag: string | null;
  whatsapp: string;
  status: "pending" | "approved" | "rejected";
  payment_status: "unpaid" | "pending_review" | "paid";
  payment_note: string | null;
  review_note: string | null;
  duplicate_ign: boolean;
  created_at: string;
  users?: { email: string; full_name: string | null };
  tournaments?: {
    slug: string;
    name: string;
    max_teams: number;
    event_starts_at?: string | null;
    hero_image_url?: string | null;
  };
  registration_players?: RegistrationPlayer[];
}

export interface RegistrationPlayer {
  id?: string;
  registration_id?: string;
  ign: string;
  uid: string;
  player_role: string | null;
  sort_order: number;
  uid_verified?: boolean;
  verified_name?: string | null;
  verified_at?: string | null;
}

export interface VerificationInfo {
  verified: boolean;
  retryable: boolean;
  officialUsername: string | null;
  checkedAt: string;
  message: string | null;
}

export interface TeamPreset {
  id: string;
  user_id: string;
  name: string;
  game: string | null;
  preset_players: PresetPlayer[];
}

export interface PresetPlayer {
  id?: string;
  preset_id?: string;
  ign: string;
  uid: string;
  player_role: string | null;
  sort_order: number;
  verified_at?: string | null;
}

export interface TournamentResult {
  id: string;
  tournament_id: string;
  placement: number;
  team_name: string;
  team_tag: string | null;
  prize: string | null;
  image_url?: string | null;
}

export interface TournamentAward {
  id: string;
  tournament_id: string;
  title: string;
  player_name: string;
  team_name: string | null;
  image_url: string | null;
  sort_order: number;
}

export interface TournamentPhoto {
  id: string;
  tournament_id: string;
  image_url: string;
  caption: string | null;
  sort_order: number;
}

export interface LandingSlide {
  id: string;
  title: string;
  tagline: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
}

export interface ContentBlock {
  id: string;
  kind: "quote" | "tagline" | "block";
  key: string | null;
  body: string;
  is_active: boolean;
  sort_order: number;
}

export interface RoomCredential {
  id: string;
  tournament_id: string;
  scope: "tournament" | "match";
  label: string;
  room_id: string;
  room_password: string;
  reveal_at: string;
  sort_order: number;
}

export interface TemplateTeamUser {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
}
type Role = "admin" | "manager" | "user";

export interface AuditEntry {
  id: number;
  actor: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  summary: string | null;
  at: string;
}

// ============================================================
// Blue Tree Outreach Agent — Type Definitions
// ============================================================

// -----------------------------------------------------------
// Enums
// -----------------------------------------------------------

export type UserRole = 'admin' | 'manager' | 'team_member' | 'client';

export type CampaignType = 'sponsored_link' | 'sales' | 'editorial';

export type CampaignSensitivity = 'low' | 'medium' | 'high' | 'very_high';

export type CampaignStatus = 'active' | 'paused' | 'completed' | 'draft';

export type ThreadStatus =
  | 'new'
  | 'pending_approval'
  | 'approved'
  | 'sent'
  | 'scheduled'
  | 'skipped'
  | 'archived';

export type DraftStatus =
  | 'pending'
  | 'approved'
  | 'revised'
  | 'skipped'
  | 'sent'
  | 'scheduled';

export type RecommendedAction = 'send_now' | 'delay' | 'skip' | 'escalate';

export type FeedbackType =
  | 'confirmed'
  | 'revised'
  | 'skipped'
  | 'delayed'
  | 'reclassified'
  | 'escalated';

export type ProspectStatus =
  | 'new'
  | 'email_generated'
  | 'approved'
  | 'loaded_to_instantly'
  | 'replied'
  | 'converted';

export type OptimizationStatus =
  | 'generated'
  | 'pending_approval'
  | 'approved'
  | 'applied';

export type CampaignAssignmentRole = 'owner' | 'approver' | 'viewer';

export type ApiService = 'instantly' | 'apollo' | 'hubspot' | 'slack';

// -----------------------------------------------------------
// Reply classifications (per campaign type)
// -----------------------------------------------------------

export type SponsoredClassification =
  | 'interested'
  | 'not_interested'
  | 'price_negotiation'
  | 'hard_no';

export type SalesClassification =
  | 'interested'
  | 'meeting_request'
  | 'question_about_services'
  | 'pricing_inquiry'
  | 'not_now_maybe_later'
  | 'hard_no'
  | 'wrong_person'
  | 'auto_reply';

export type EditorialClassification =
  | 'interested_in_topic'
  | 'wants_different_angle'
  | 'interested_different_timeline'
  | 'send_draft'
  | 'no_guest_posts'
  | 'already_covered'
  | 'forward_to_editor'
  | 'relationship_maintenance';

export type ReplyClassification =
  | SponsoredClassification
  | SalesClassification
  | EditorialClassification
  | 'positive_interest'
  | 'soft_maybe'
  | 'question'
  | 'pricing'
  | 'hard_decline'
  | 'out_of_office'
  | 'wrong_person_redirect'
  | 'auto_reply_spam'
  | 'escalation_needed';

// -----------------------------------------------------------
// Database models
// -----------------------------------------------------------

export interface UserProfile {
  id: string;
  full_name: string | null;
  role: UserRole;
  avatar_url: string | null;
  slack_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  type: CampaignType;
  sensitivity: CampaignSensitivity;
  status: CampaignStatus;
  goals: CampaignGoals;
  constraints: CampaignConstraints;
  cadence_rules: CadenceRules;
  tone_guidelines: string | null;
  forbidden_words: string[];
  slack_channel_id: string | null;
  instantly_campaign_ids: string[];
  managed_agent_session_id: string | null;
  polling_interval_minutes: number;
  polling_interval_off_hours: number;
  business_hours_start: string;
  business_hours_end: string;
  business_hours_timezone: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignGoals {
  target_placements?: number;
  target_meetings?: number;
  target_deals?: number;
  target_dr?: number;
  deadline?: string;
  description?: string;
}

export interface CampaignConstraints {
  max_daily_sends?: number;
  blacklisted_publications?: string[];
  blacklisted_domains?: string[];
  require_individual_approval?: boolean;
}

export interface CadenceRules {
  initial_wait_days?: number;
  follow_up_1_days?: number;
  follow_up_2_days?: number;
  follow_up_3_days?: number;
  max_follow_ups?: number;
}

export interface CampaignAssignment {
  campaign_id: string;
  user_id: string;
  role: CampaignAssignmentRole;
  assigned_at: string;
}

export interface Persona {
  id: string;
  pen_name: string;
  email_address: string | null;
  writing_style: string | null;
  example_emails: PersonaEmail[];
  avg_email_length: number | null;
  typical_pitch_structure: string | null;
  follow_up_style: string | null;
  vocabulary_notes: string | null;
  tone_keywords: string[];
  forbidden_patterns: string[];
  performance_stats: PersonaStats;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PersonaEmail {
  subject: string;
  body: string;
  context?: string;
  outcome?: string;
}

export interface PersonaStats {
  reply_rate?: number;
  placement_rate?: number;
  avg_thread_length?: number;
  total_emails_sent?: number;
}

export interface EmailThread {
  id: string;
  instantly_thread_id: string | null;
  campaign_id: string;
  persona_id: string | null;
  contact_email: string | null;
  contact_name: string | null;
  publication_name: string | null;
  publication_dr: number | null;
  publication_vertical: string | null;
  classification: ReplyClassification | null;
  classification_confidence: number | null;
  outcome: string | null;
  status: ThreadStatus;
  thread_data: ThreadMessage[];
  metadata: Record<string, unknown>;
  last_reply_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ThreadMessage {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  sent_at: string;
  direction: 'inbound' | 'outbound';
}

export interface Draft {
  id: string;
  thread_id: string;
  campaign_id: string;
  persona_id: string | null;
  draft_version: number;
  subject_line: string | null;
  body: string;
  classification: string | null;
  recommended_action: RecommendedAction | null;
  recommended_send_time: string | null;
  confidence_score: number | null;
  status: DraftStatus;
  approved_by: string | null;
  approved_at: string | null;
  sent_at: string | null;
  scheduled_for: string | null;
  slack_message_ts: string | null;
  slack_channel_id: string | null;
  agent_context: Record<string, unknown>;
  created_at: string;
}

export interface DraftFeedback {
  id: string;
  draft_id: string;
  thread_id: string | null;
  campaign_id: string | null;
  feedback_type: FeedbackType;
  quality_rating: number | null;
  original_draft: string | null;
  revised_draft: string | null;
  revision_instructions: string | null;
  classification_correction: string | null;
  delay_until: string | null;
  feedback_by: string | null;
  created_at: string;
}

export interface EmailPattern {
  id: string;
  campaign_type: CampaignType;
  persona_id: string | null;
  pattern_type: string;
  pattern_data: Record<string, unknown>;
  success_rate: number | null;
  sample_size: number;
  vertical: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OptimizationCycle {
  id: string;
  campaign_id: string;
  cycle_date: string;
  performance_data: Record<string, unknown>;
  winners: unknown[];
  losers: unknown[];
  new_variants: unknown[];
  retired_variants: unknown[];
  recommendations: string | null;
  status: OptimizationStatus;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
}

export interface Prospect {
  id: string;
  campaign_id: string;
  apollo_contact_id: string | null;
  email: string | null;
  full_name: string | null;
  job_title: string | null;
  company_name: string | null;
  company_size: string | null;
  industry: string | null;
  funding_stage: string | null;
  tech_stack: string[];
  linkedin_url: string | null;
  enrichment_data: Record<string, unknown>;
  web_research: Record<string, unknown>;
  custom_opener: string | null;
  custom_subject_line: string | null;
  status: ProspectStatus;
  created_at: string;
  updated_at: string;
}

export interface BlacklistEntry {
  id: string;
  email: string | null;
  domain: string | null;
  publication_name: string | null;
  reason: string | null;
  added_by: string | null;
  created_at: string;
}

export interface ApiConnection {
  id: string;
  service: ApiService;
  config: Record<string, unknown>;
  is_connected: boolean;
  last_verified_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLogEntry {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

// -----------------------------------------------------------
// Dashboard / UI types
// -----------------------------------------------------------

export interface CampaignMetrics {
  campaign_id: string;
  emails_sent_today: number;
  emails_sent_week: number;
  replies_received_today: number;
  replies_received_week: number;
  positive_reply_rate: number;
  pending_approvals: number;
  placements_secured?: number;
  placements_target?: number;
  meetings_booked?: number;
  deals_closed?: number;
}

export interface DashboardOverview {
  total_pending_approvals: number;
  emails_sent_today: number;
  replies_received_today: number;
  positive_reply_rate_7d: number;
  active_campaigns: CampaignWithMetrics[];
  recent_activity: ActivityItem[];
}

export interface CampaignWithMetrics extends Campaign {
  metrics: CampaignMetrics;
  assignment_count: number;
}

export interface ActivityItem {
  id: string;
  type: 'reply_received' | 'draft_approved' | 'email_sent' | 'campaign_created' | 'escalation' | 'feedback';
  title: string;
  description: string;
  campaign_name: string;
  campaign_type: CampaignType;
  persona_name?: string;
  timestamp: string;
}

export interface SlackNotification {
  thread_id: string;
  campaign_name: string;
  campaign_type: CampaignType;
  contact_name: string;
  publication_name?: string;
  publication_dr?: number;
  persona_name?: string;
  incoming_message: string;
  suggested_response: string;
  classification: ReplyClassification;
  confidence: number;
  recommended_action: RecommendedAction;
}

// -----------------------------------------------------------
// Campaign health status (for dashboard cards)
// -----------------------------------------------------------

export type HealthStatus = 'on_track' | 'needs_attention' | 'behind';

export function getCampaignHealth(campaign: CampaignWithMetrics): HealthStatus {
  const { goals } = campaign;
  const { metrics } = campaign;

  if (!goals.target_placements && !goals.target_meetings && !goals.target_deals) {
    return 'on_track';
  }

  const target = goals.target_placements ?? goals.target_meetings ?? goals.target_deals ?? 0;
  const achieved = metrics.placements_secured ?? metrics.meetings_booked ?? metrics.deals_closed ?? 0;

  if (!goals.deadline) {
    return achieved >= target ? 'on_track' : 'needs_attention';
  }

  const now = new Date();
  const deadline = new Date(goals.deadline);
  const elapsed = now.getTime() - new Date(campaign.created_at).getTime();
  const total = deadline.getTime() - new Date(campaign.created_at).getTime();
  const timeProgress = Math.min(elapsed / total, 1);
  const goalProgress = target > 0 ? achieved / target : 1;

  if (goalProgress >= timeProgress * 0.9) return 'on_track';
  if (goalProgress >= timeProgress * 0.6) return 'needs_attention';
  return 'behind';
}

// -----------------------------------------------------------
// Constants
// -----------------------------------------------------------

export const CAMPAIGN_TYPE_LABELS: Record<CampaignType, string> = {
  sponsored_link: 'Sponsored Link',
  sales: 'Sales',
  editorial: 'Editorial',
};

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  active: 'Active',
  paused: 'Paused',
  completed: 'Completed',
  draft: 'Draft',
};

export const SENSITIVITY_LABELS: Record<CampaignSensitivity, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  very_high: 'Very High',
};

export const CLASSIFICATION_LABELS: Record<string, string> = {
  positive_interest: 'Positive Interest',
  soft_maybe: 'Soft Maybe / Timing',
  question: 'Question',
  pricing: 'Pricing Inquiry',
  hard_decline: 'Hard Decline',
  out_of_office: 'Out of Office',
  wrong_person_redirect: 'Wrong Person',
  auto_reply_spam: 'Auto-reply / Spam',
  escalation_needed: 'Escalation Needed',
  interested_in_topic: 'Interested in Topic',
  wants_different_angle: 'Wants Different Angle',
  interested_different_timeline: 'Different Timeline',
  send_draft: 'Send Me a Draft',
  no_guest_posts: 'No Guest Posts',
  already_covered: 'Already Covered',
  forward_to_editor: 'Forward to Editor',
  relationship_maintenance: 'Relationship Maintenance',
  interested: 'Interested',
  meeting_request: 'Meeting Request',
  question_about_services: 'Question About Services',
  pricing_inquiry: 'Pricing Inquiry',
  not_now_maybe_later: 'Not Now, Maybe Later',
  hard_no: 'Hard No',
  wrong_person: 'Wrong Person',
  auto_reply: 'Auto-reply',
  not_interested: 'Not Interested',
  price_negotiation: 'Price Negotiation',
};

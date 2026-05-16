export type HarassmentRiskLevel = 'none' | 'low' | 'medium' | 'high';

export type HarassmentType =
  | 'stress_release'
  | 'misunderstanding'
  | 'aggressive'
  | 'distorted_justice'
  | 'persistent_attachment'
  | 'other';

export type HarassmentCategory =
  | 'abusive_language'
  | 'threat'
  | 'coercive_demand'
  | 'repeated_or_persistent'
  | 'personal_attack'
  | 'discriminatory_or_sexual'
  | 'normal_complaint';

export type HarassmentAssessment = {
  level: HarassmentRiskLevel;
  label: string;
  harassmentType: HarassmentType;
  harassmentTypeLabel: string;
  categories: HarassmentCategory[];
  reasons: string[];
  recommendedAction: string;
};

export type ChatApiResponse = {
  answer: string;
  harassmentAssessment: HarassmentAssessment;
};

export type InquiryStatus = 'new' | 'in_progress' | 'escalated' | 'resolved' | 'on_hold';

export type InquiryRecord = {
  id: number;
  user_name: string | null;
  email: string | null;
  ip_address: string | null;
  user_agent: string | null;
  message: string;
  answer: string | null;
  provider: string;
  model: string;
  risk_level: HarassmentRiskLevel;
  harassment_type: HarassmentType;
  harassment_categories: HarassmentCategory[];
  assessment_reasons: string[];
  recommended_action: string | null;
  status: InquiryStatus;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
};

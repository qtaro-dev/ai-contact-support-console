import type { HarassmentRiskLevel } from '@/app/types';

export const chatUiText = {
  headerTitle: 'AI問い合わせ対応支援ツール',
  headerDescription: 'ローカルLLMを使った問い合わせ対応デモ',
  connectionLabel: 'Ollama接続 / ローカル実行',
  inputTitle: '問い合わせ入力',
  inputDescription: 'お名前とメールアドレスは任意です。問い合わせ内容を入力してください。',
  userNameLabel: 'お名前',
  userNamePlaceholder: 'お名前を入力してください',
  emailLabel: 'メールアドレス',
  emailPlaceholder: 'メールアドレスを入力してください',
  messageLabel: '問い合わせ内容',
  inputPlaceholder: '質問を入力してください',
  emailValidationMessage: 'メールアドレスの形式を確認してください。',
  sendingLabel: '送信中...',
  submitLabel: '送信',
  answerCardTitle: 'AI回答案',
  questionLabel: '質問',
  aiAnswerLabel: 'AI回答',
  emptyAnswerLabel: 'まだ回答はありません',
  historyTitle: '問い合わせ履歴',
  historyEmptyLabel: '問い合わせ履歴はまだありません',
  selectedInquiryEmptyLabel: '左の履歴から問い合わせを選択してください',
  harassmentCardTitle: 'カスハラリスク判定',
  assessmentLabel: '判定',
  riskLevelLabel: 'リスクレベル',
  harassmentTypeLabel: '推定タイプ',
  categoryLabel: 'カテゴリ',
  reasonsLabel: '理由',
  recommendedActionLabel: '推奨対応',
  noCategoryLabel: '該当なし',
  riskHistoryLabel: 'リスク',
  requestErrorPrefix: 'エラー',
  requestFailedMessage: 'ローカルLLMからの回答取得に失敗しました'
};

export const adminUiText = {
  title: '問い合わせ管理',
  description: '過去の問い合わせ、カスハラリスク、推定タイプ、対応状況を確認できます。',
  warning: '開発用管理画面です。本番公開前に認証を追加してください。',
  emptyMessage: '問い合わせ記録はまだありません。',
  unavailableMessage: 'Supabase接続情報が未設定のため、問い合わせ一覧を表示できません。',
  createdAtLabel: '作成日時',
  userNameLabel: 'お名前',
  emailLabel: 'メールアドレス',
  ipAddressLabel: 'IPアドレス',
  messageLabel: '問い合わせ内容',
  riskLevelLabel: 'リスクレベル',
  harassmentTypeLabel: '推定タイプ',
  statusLabel: '対応状況',
  answerLabel: 'AI回答',
  unknownLabel: '未取得',
  noNameLabel: '未入力',
  noEmailLabel: '未入力',
  noAnswerLabel: '回答なし'
};

export const riskLevelLabels: Record<HarassmentRiskLevel, string> = {
  none: '通常',
  low: '低',
  medium: '中',
  high: '高'
};

export const riskLevelStyles: Record<HarassmentRiskLevel, string> = {
  none: 'border-slate-200 bg-slate-50 text-slate-700',
  low: 'border-blue-200 bg-blue-50 text-blue-800',
  medium: 'border-amber-200 bg-amber-50 text-amber-800',
  high: 'border-red-300 bg-red-50 text-red-800'
};

export const riskBadgeStyles: Record<HarassmentRiskLevel, string> = {
  none: 'bg-slate-100 text-slate-700',
  low: 'bg-blue-100 text-blue-800',
  medium: 'bg-amber-100 text-amber-800',
  high: 'bg-red-100 text-red-800'
};

export const inquiryStatusLabels = {
  new: '新規',
  in_progress: '対応中',
  escalated: '上長共有',
  resolved: '解決済み',
  on_hold: '保留'
} as const;

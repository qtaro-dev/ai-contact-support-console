import type {
  HarassmentAssessment,
  HarassmentCategory,
  HarassmentRiskLevel,
  HarassmentType
} from '@/app/types';

type ScoreKey =
  | 'complaint'
  | 'unfairDemand'
  | 'aggressive'
  | 'obsession'
  | 'sexual'
  | 'selfHarm';

type ScoreMap = Record<ScoreKey, number>;

type Signal = {
  key: ScoreKey;
  score: number;
  category: HarassmentCategory;
  reason: string;
  patterns: RegExp[];
};

type LevelContent = {
  label: string;
  recommendedAction: string;
};

type AssessmentDecision = {
  level: HarassmentRiskLevel;
  harassmentType: HarassmentType;
  recommendedAction: string;
};

export const harassmentCategoryLabels: Record<HarassmentCategory, string> = {
  abusive_language: '暴言・侮辱',
  threat: '脅迫・危害示唆',
  coercive_demand: '不当要求',
  repeated_or_persistent: '強い執着',
  personal_attack: '個人攻撃',
  discriminatory_or_sexual: '性的・卑わい表現',
  strong_complaint: '強い苦情',
  aggressive_behavior: '威圧・攻撃',
  self_harm: '自傷・自死示唆',
  normal_complaint: '通常の苦情'
};

export const harassmentTypeLabels: Record<HarassmentType, string> = {
  stress_release: 'ストレス発散タイプ',
  misunderstanding: '思い込み・勘違いタイプ',
  aggressive: '攻撃的タイプ',
  distorted_justice: 'ゆがんだ正義感タイプ',
  persistent_attachment: '強い執着タイプ',
  other: 'その他'
};

const recommendedActions: Record<
  'normal' | 'complaint' | 'unfairDemand' | 'aggressive' | 'obsession' | 'sexual' | 'selfHarm',
  string
> = {
  normal: '通常の問い合わせとして対応してください。必要に応じて内容を記録してください。',
  complaint: '事実確認を行い、冷静な文面で対応してください。やり取りは記録してください。',
  unfairDemand:
    '要求内容を記録し、対応範囲を明確にしてください。金銭補償などは管理者確認に回してください。',
  aggressive:
    '対応者の安全を優先し、単独対応を避けてください。必要に応じて対応を中断し、管理者確認に回してください。',
  obsession:
    '対応窓口と対応頻度を整理し、記録を残してください。必要に応じて管理者が対応方針を決めてください。',
  sexual: '通常対応は行わず、内容を記録したうえで管理者確認に回してください。',
  selfHarm:
    '安全確認を優先してください。緊急性がある場合は、周囲の人や公的相談窓口、緊急窓口へつなぐ対応を検討してください。'
};

const levelContent: Record<HarassmentRiskLevel, LevelContent> = {
  none: {
    label: '通常問い合わせ',
    recommendedAction: recommendedActions.normal
  },
  low: {
    label: '注意問い合わせ',
    recommendedAction: recommendedActions.complaint
  },
  medium: {
    label: '要注意',
    recommendedAction: recommendedActions.aggressive
  },
  high: {
    label: '高リスク',
    recommendedAction: recommendedActions.aggressive
  }
};

const defaultReasons: Record<HarassmentRiskLevel, string> = {
  none: '威圧、暴言、脅迫、不当要求に該当する強い表現は検出されていません。',
  low: '強い不満表現がありますが、脅迫や明確な暴言は検出されていません。',
  medium: '対応者が注意して扱うべき強い要求や攻撃的な表現が含まれています。',
  high: '安全確認や組織的な対応が必要になり得る高リスク表現が含まれています。'
};

const signals: Signal[] = [
  {
    key: 'selfHarm',
    score: 5,
    category: 'self_harm',
    reason: '自傷・自死を示唆する表現が含まれています。',
    patterns: [
      /死にたい|自殺|自死|消えたい|自分を傷つけ|自傷|リストカット|命を絶つ|生きていたくない|もう無理/
    ]
  },
  {
    key: 'aggressive',
    score: 5,
    category: 'threat',
    reason: '危害・放火を示唆する脅迫表現が含まれています。',
    patterns: [
      /殺す|刺す|殴る|壊す|燃やす|放火|火(?:を)?つける|火つける|危害/,
      /ただじゃおかない|痛い目|報復|消えろ/
    ]
  },
  {
    key: 'sexual',
    score: 4,
    category: 'discriminatory_or_sexual',
    reason: '性的・卑わいな表現が含まれています。',
    patterns: [
      /sex|セックス|おまんこ|まんこ|ちんちん|ちんこ|陰部|性器|裸|脱げ|性的|卑猥|わいせつ/
    ]
  },
  {
    key: 'obsession',
    score: 3,
    category: 'repeated_or_persistent',
    reason: '「毎日何度でも連絡」など、継続的な接触を示す表現が含まれています。',
    patterns: [
      /毎日(?:何度でも)?連絡|何度でも連絡|何回でも送る|何度も送る|電話し続ける|メールし続ける/,
      /返事が来るまで|対応するまで|出るまで|納得するまで/
    ]
  },
  {
    key: 'obsession',
    score: 2,
    category: 'repeated_or_persistent',
    reason: '「必ず対応」「逃げるな」など、強い返答要求や拘束につながる表現が含まれています。',
    patterns: [/逃げ(?:るな|ずに)|必ず対応|絶対に対応|無視するな(?!ら)|返事を(?:しろ|ください|寄こせ)/]
  },
  {
    key: 'unfairDemand',
    score: 2,
    category: 'coercive_demand',
    reason: '「全額返金」「迷惑料」など、通常範囲を超える金銭要求が含まれています。',
    patterns: [
      /全額返金|全額返せ|返金しろ|迷惑料|慰謝料|補償しろ|補償|金を払え|支払って(?:ください|下さい)?/,
      /誠意を見せろ|無料にしろ|タダにしろ/
    ]
  },
  {
    key: 'unfairDemand',
    score: 2,
    category: 'coercive_demand',
    reason: '「公表します」「拡散する」「晒す」など、社会的圧力を示す表現が含まれています。',
    patterns: [
      /対応しないなら(?:公表|拡散|晒)/,
      /公表します|公表する|拡散する|晒す|晒します|SNSに書く|口コミに書く|消費者庁に言う|訴える/
    ]
  },
  {
    key: 'aggressive',
    score: 2,
    category: 'aggressive_behavior',
    reason: '「店舗に行く」「直接行く」など、対面での圧力につながる表現が含まれています。',
    patterns: [/(?:店|店舗|会社|事務所|本社)に行(?:く|って)|直接行く|乗り込む/]
  },
  {
    key: 'aggressive',
    score: 2,
    category: 'aggressive_behavior',
    reason: '「大声で抗議」「責任者を出せ」など、対面での威圧につながる表現が含まれています。',
    patterns: [/大声で抗議|怒鳴る|責任者を(?:出せ|出して|すぐに出|.*出してください)|上を(?:出せ|出して)|抗議します/]
  },
  {
    key: 'aggressive',
    score: 3,
    category: 'abusive_language',
    reason: '暴言や侮辱的、攻撃的な表現が含まれています。',
    patterns: [
      /ふざけ(?:るな|んな)|このやろ(?:う|ー)|コノヤロー|くそ|クソ|てめ(?:え|ー)|お前/,
      /バカ|馬鹿|アホ|無能|クズ|頭おかしい|プロ失格/
    ]
  },
  {
    key: 'complaint',
    score: 1,
    category: 'strong_complaint',
    reason: '「何度問い合わせても」「返事がない」など、強い不満や苦情を示す表現が含まれています。',
    patterns: [/何度問い合わせても|返事がな(?:い|く)|対応が遅い|困っています|困ります/]
  },
  {
    key: 'complaint',
    score: 1,
    category: 'strong_complaint',
    reason: '「早急に」「至急」など、急ぎの対応を求める圧力表現が含まれています。',
    patterns: [/早急|至急|すぐに確認|すぐ連絡|直ちに|今すぐ/]
  },
  {
    key: 'complaint',
    score: 1,
    category: 'normal_complaint',
    reason: '不満や苦情を示す表現が含まれています。',
    patterns: [/不満|苦情|クレーム|納得できない|届いていません|届かない|壊れている|不具合/]
  }
];

const scoreRank: ScoreKey[] = [
  'selfHarm',
  'aggressive',
  'sexual',
  'obsession',
  'unfairDemand',
  'complaint'
];

const createEmptyScores = (): ScoreMap => ({
  complaint: 0,
  unfairDemand: 0,
  aggressive: 0,
  obsession: 0,
  sexual: 0,
  selfHarm: 0
});

const hasHighHarmSignal = (scores: ScoreMap) => scores.selfHarm > 0 || scores.aggressive >= 5;

const choosePrimaryScore = (scores: ScoreMap): ScoreKey | null => {
  for (const key of scoreRank) {
    if (scores[key] > 0) {
      return key;
    }
  }

  return null;
};

const decideAssessment = (scores: ScoreMap): AssessmentDecision => {
  if (scores.selfHarm > 0) {
    return {
      level: 'high',
      harassmentType: 'other',
      recommendedAction: recommendedActions.selfHarm
    };
  }

  if (scores.aggressive >= 5) {
    return {
      level: 'high',
      harassmentType: 'aggressive',
      recommendedAction: recommendedActions.aggressive
    };
  }

  if (scores.sexual > 0) {
    return {
      level: 'medium',
      harassmentType: scores.aggressive > 0 ? 'aggressive' : 'other',
      recommendedAction: recommendedActions.sexual
    };
  }

  if (scores.obsession >= 3) {
    return {
      level: 'medium',
      harassmentType: 'persistent_attachment',
      recommendedAction: recommendedActions.obsession
    };
  }

  if (scores.unfairDemand >= 4) {
    return {
      level: 'medium',
      harassmentType: 'distorted_justice',
      recommendedAction: recommendedActions.unfairDemand
    };
  }

  if (scores.aggressive >= 4) {
    return {
      level: 'medium',
      harassmentType: 'aggressive',
      recommendedAction: recommendedActions.aggressive
    };
  }

  if (scores.unfairDemand > 0) {
    return {
      level: 'low',
      harassmentType: 'distorted_justice',
      recommendedAction: recommendedActions.unfairDemand
    };
  }

  if (scores.aggressive > 0) {
    return {
      level: 'low',
      harassmentType: 'aggressive',
      recommendedAction: recommendedActions.aggressive
    };
  }

  if (scores.complaint >= 2) {
    return {
      level: 'low',
      harassmentType: 'stress_release',
      recommendedAction: recommendedActions.complaint
    };
  }

  if (scores.complaint > 0) {
    return {
      level: 'low',
      harassmentType: 'other',
      recommendedAction: recommendedActions.normal
    };
  }

  return {
    level: 'none',
    harassmentType: 'other',
    recommendedAction: recommendedActions.normal
  };
};

const normalizeMessage = (message: string) => message.normalize('NFKC').toLowerCase();

export const assessCustomerHarassment = (message: string): HarassmentAssessment => {
  const normalizedMessage = normalizeMessage(message);
  const scores = createEmptyScores();
  const categories = new Set<HarassmentCategory>();
  const reasons = new Set<string>();

  for (const signal of signals) {
    if (!signal.patterns.some((pattern) => pattern.test(normalizedMessage))) {
      continue;
    }

    scores[signal.key] += signal.score;
    categories.add(signal.category);
    reasons.add(signal.reason);
  }

  const decision = decideAssessment(scores);
  const primaryScore = choosePrimaryScore(scores);

  if (categories.size === 0) {
    categories.add('normal_complaint');
  }

  if (decision.level === 'none' && primaryScore === null) {
    reasons.add(defaultReasons.none);
  }

  if (decision.level !== 'none' && reasons.size === 0) {
    reasons.add(defaultReasons[decision.level]);
  }

  if (hasHighHarmSignal(scores) || categories.size > 1) {
    categories.delete('normal_complaint');
  }

  return {
    level: decision.level,
    label: levelContent[decision.level].label,
    harassmentType: decision.harassmentType,
    harassmentTypeLabel: harassmentTypeLabels[decision.harassmentType],
    categories: Array.from(categories),
    reasons: Array.from(reasons),
    recommendedAction: decision.recommendedAction
  };
};

import type {
  HarassmentAssessment,
  HarassmentCategory,
  HarassmentRiskLevel,
  HarassmentType
} from '@/app/types';

type Rule = {
  category: HarassmentCategory;
  level: Exclude<HarassmentRiskLevel, 'none'>;
  patterns: RegExp[];
  reason: string;
  score: number;
};

type LevelContent = {
  label: string;
  recommendedAction: string;
};

type HarassmentTypeRule = {
  type: HarassmentType;
  patterns: RegExp[];
  score: number;
};

export const harassmentCategoryLabels: Record<HarassmentCategory, string> = {
  abusive_language: '暴言・侮辱',
  threat: '脅迫・危害示唆',
  coercive_demand: '不当要求',
  repeated_or_persistent: '執拗な要求',
  personal_attack: '個人攻撃',
  discriminatory_or_sexual: '差別的・性的発言',
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

const levelContent: Record<HarassmentRiskLevel, LevelContent> = {
  none: {
    label: '通常問い合わせ',
    recommendedAction: '通常の問い合わせとして対応してください。必要に応じて内容を記録してください。'
  },
  low: {
    label: '注意問い合わせ',
    recommendedAction: '通常対応を継続しつつ、表現が強くなる場合は記録を残してください。'
  },
  medium: {
    label: '要注意',
    recommendedAction: '会話内容を記録し、必要に応じて上長へ共有してください。単独判断を避けてください。'
  },
  high: {
    label: '高リスク',
    recommendedAction:
      '対応を中断できる状態を確保し、上長や関係部署へ速やかに共有してください。危害示唆がある場合は安全確保を優先してください。'
  }
};

const defaultReasons: Record<HarassmentRiskLevel, string> = {
  none: '威圧、暴言、脅迫、不当要求に該当する強い表現は検出されていません。',
  low: '強い不満表現がありますが、脅迫や明確な暴言は検出されていません。',
  medium: '対応者が注意して扱うべき強い要求や攻撃的な表現が含まれています。',
  high: '安全確保や組織的な対応が必要になり得る高リスク表現が含まれています。'
};

const rules: Rule[] = [
  {
    category: 'threat',
    level: 'high',
    score: 8,
    reason: '危害・放火を示唆する脅迫表現が含まれています。',
    patterns: [
      /殺す|刺す|殴る|壊す|燃やす|放火|火(?:を)?つける/,
      /危害|報復|ただじゃおかない|覚えてろ|痛い目/,
      /家まで行く|会社に行く|店に行ってやる/
    ]
  },
  {
    category: 'discriminatory_or_sexual',
    level: 'high',
    score: 7,
    reason: '差別的または性的な発言に該当し得る表現が含まれています。',
    patterns: [/差別|人種|障害者|国籍|外国人/, /性的|セクハラ|裸|下着|抱け|触らせろ/]
  },
  {
    category: 'coercive_demand',
    level: 'high',
    score: 7,
    reason: '土下座など、過度で不当な要求に該当し得る表現が含まれています。',
    patterns: [/土下座|誠意を見せろ|今すぐ謝罪しろ|謝罪文を書け/]
  },
  {
    category: 'personal_attack',
    level: 'high',
    score: 6,
    reason: '従業員個人への攻撃や名指し攻撃に該当し得る表現が含まれています。',
    patterns: [/担当者を出せ|責任者を出せ|お前個人|名前を晒す|顔を晒す|SNSに晒す|ネットに晒す/]
  },
  {
    category: 'abusive_language',
    level: 'high',
    score: 8,
    reason: '暴言や侮辱的、攻撃的な表現が含まれています。',
    patterns: [
      /(?:てめ(?:え|ー)|お前).*(?:ふざけ(?:るな|んな)|このやろ(?:う|ー)|コノヤロー|くそ|クソ)/,
      /(?:ふざけ(?:るな|んな)).*(?:このやろ(?:う|ー)|コノヤロー|くそ|クソ)/
    ]
  },
  {
    category: 'abusive_language',
    level: 'medium',
    score: 5,
    reason: '暴言や侮辱的、攻撃的な表現が含まれています。',
    patterns: [
      /バカ|馬鹿|アホ|無能|クズ|最低|くそ|クソ|使えない|頭おかしい/,
      /ふざけ(?:るな|んな)/,
      /このやろ(?:う|ー)|コノヤロー|てめ(?:え|ー)|お前/
    ]
  },
  {
    category: 'coercive_demand',
    level: 'medium',
    score: 4,
    reason: '返金、補償、謝罪などの強い要求が含まれています。',
    patterns: [/返金しろ|全額返せ|補償しろ|慰謝料|賠償|無料にしろ|詫びろ/]
  },
  {
    category: 'repeated_or_persistent',
    level: 'medium',
    score: 3,
    reason: '繰り返し連絡や長時間拘束を示唆する表現が含まれています。',
    patterns: [/何度も|毎日連絡|何回でも|出るまで|納得するまで|長時間|一日中|しつこく/]
  },
  {
    category: 'normal_complaint',
    level: 'low',
    score: 1,
    reason: '不満や苦情を示す表現が含まれています。',
    patterns: [/困っている|困ります|不満|苦情|クレーム|納得できない|遅い|届かない|壊れている|不具合/]
  }
];

const harassmentTypeRules: HarassmentTypeRule[] = [
  {
    type: 'aggressive',
    score: 5,
    patterns: [
      /殺す|刺す|殴る|壊す|燃やす|放火|火(?:を)?つける/,
      /危害|報復|ただじゃおかない|覚えてろ|痛い目/,
      /バカ|馬鹿|アホ|無能|クズ|最低|くそ|クソ|使えない|頭おかしい/,
      /ふざけ(?:るな|んな)/,
      /このやろ(?:う|ー)|コノヤロー|てめ(?:え|ー)|お前/
    ]
  },
  {
    type: 'persistent_attachment',
    score: 4,
    patterns: [
      /何度も|毎日連絡|何回でも|出るまで|納得するまで|長時間|一日中|しつこく/,
      /担当者を出せ|責任者を出せ|名前を晒す|SNSに晒す|ネットに晒す/
    ]
  },
  {
    type: 'distorted_justice',
    score: 3,
    patterns: [
      /正義|当然|社会のため|謝罪すべき|プロ失格|許されない|常識だ|責任を取れ/,
      /会社としておかしい|企業として失格/
    ]
  },
  {
    type: 'misunderstanding',
    score: 3,
    patterns: [
      /絶対に間違っている|そちらのミスに決まっている|嘘をついている/,
      /聞いていない|説明されていない|勝手に|だまされた|騙された/
    ]
  },
  {
    type: 'stress_release',
    score: 2,
    patterns: [/イライラ|むかつく|腹が立つ|最悪|不満|愚痴|もう嫌|ありえない/]
  }
];

const levelRank: Record<HarassmentRiskLevel, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3
};

const scoreToLevel = (score: number, matchedHighestLevel: HarassmentRiskLevel): HarassmentRiskLevel => {
  if (levelRank[matchedHighestLevel] >= levelRank.high || score >= 8) {
    return 'high';
  }

  if (levelRank[matchedHighestLevel] >= levelRank.medium || score >= 4) {
    return 'medium';
  }

  if (score > 0) {
    return 'low';
  }

  return 'none';
};

const inferHarassmentType = (message: string): HarassmentType => {
  const typeScores = new Map<HarassmentType, number>();

  for (const rule of harassmentTypeRules) {
    if (!rule.patterns.some((pattern) => pattern.test(message))) {
      continue;
    }

    typeScores.set(rule.type, (typeScores.get(rule.type) ?? 0) + rule.score);
  }

  let selectedType: HarassmentType = 'other';
  let selectedScore = 0;

  for (const [type, score] of typeScores) {
    if (score > selectedScore) {
      selectedType = type;
      selectedScore = score;
    }
  }

  return selectedType;
};

export const assessCustomerHarassment = (message: string): HarassmentAssessment => {
  const normalizedMessage = message.normalize('NFKC');
  const categories = new Set<HarassmentCategory>();
  const reasons = new Set<string>();
  let score = 0;
  let matchedHighestLevel: HarassmentRiskLevel = 'none';

  for (const rule of rules) {
    if (!rule.patterns.some((pattern) => pattern.test(normalizedMessage))) {
      continue;
    }

    categories.add(rule.category);
    reasons.add(rule.reason);
    score += rule.score;

    if (levelRank[rule.level] > levelRank[matchedHighestLevel]) {
      matchedHighestLevel = rule.level;
    }
  }

  const level = scoreToLevel(score, matchedHighestLevel);
  const harassmentType = inferHarassmentType(normalizedMessage);

  if (categories.size === 0) {
    categories.add('normal_complaint');
  }

  if (reasons.size === 0) {
    reasons.add(defaultReasons[level]);
  }

  return {
    level,
    label: levelContent[level].label,
    harassmentType,
    harassmentTypeLabel: harassmentTypeLabels[harassmentType],
    categories: Array.from(categories),
    reasons: Array.from(reasons),
    recommendedAction: levelContent[level].recommendedAction
  };
};

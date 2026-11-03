# AI Contact Support Console

日本語の問い合わせに対する回答案と、正規表現によるカスタマーハラスメントのリスク評価を表示するNext.js / TypeScript製のデモです。デモ回答は外部AIサービスやAPIキーなしで動作します。既存のOllama連携も残しています。

## 機能と制約

- 問い合わせフォーム、回答案、問い合わせ履歴、リスク・カテゴリ・検出理由・推奨対応を表示します。
- 問い合わせ履歴はブラウザーのReact状態のみです。再読み込みで消え、サーバーやDBには永続保存されません。
- 任意の氏名・メールは入力検証されますが保存されず、モデルにも送られません。実在する個人情報はデモに入力しないでください。
- `/admin`は固定のモックデータです。送信された問い合わせとは連動しません。`/settings`は環境変数の閲覧専用です。
- リスク評価は語句の一致による参考情報です。正当な苦情、法的権利の行使、引用、否定、文脈を理解していません。誤検知・見逃しがあり、カスハラの確定や自動処分に使用せず、人が最終確認してください。
- 回答は参考案です。Ollamaのシステムプロンプトは、プロンプトインジェクションや誤った回答を完全に防ぐものではありません。

## ローカルのデモ起動

検証環境：Windows、Node.js 22.18.0、npm 10.9.3。Next.jsの最低要件はNode.js 20.9ですが、このリポジトリの検証にはNode.js 22系を使用しています。

```powershell
npm ci
$env:AI_PROVIDER = 'demo'
npm run dev -- --hostname 127.0.0.1
```

ブラウザーで `http://127.0.0.1:3000` を開きます。シェルで設定した環境変数はそのプロセスと子プロセスに限定されます。既定のAIプロバイダーは引き続き`ollama`です。デモでは必ず`AI_PROVIDER=demo`を明示してください。デモモードの回答生成はOllamaにも外部AIサービスにも接続しません。

本番ビルドを単一プロセスのローカル環境で確認する場合：

```powershell
$env:AI_PROVIDER = 'demo'
npm run build
$env:SECURITY_STORE = 'memory'
$env:SECURITY_SINGLE_PROCESS = 'true'
npm run start -- --hostname 127.0.0.1
```

`memory`は単一Node.jsプロセスだけを保護します。複数プロセス、複数インスタンス、サーバーレスで使用しないでください。Vercel（`VERCEL=1`）ではローカル用の明示設定があっても`memory`を拒否します。本番のSecure Cookieを使う管理者認証はHTTPSで運用してください。

## 環境変数

設定はシェル、ローカルの`.env.local`、またはホスティング環境の設定画面で指定します。秘密情報の値をソース、ログ、PRへ記載しないでください。`.env`と`.env.*`はGit対象外です。

| 変数 | 説明 |
|---|---|
| `AI_PROVIDER` | `demo`または`ollama`。既定`ollama`。公開デモでは`demo`を明示 |
| `AI_MAX_OUTPUT_CHARS` | 回答表示上限。既定500、100～1000へ制限 |
| `OLLAMA_API_BASE` | Ollama接続先。`OLLAMA_API_URL`より優先 |
| `OLLAMA_API_URL` | 互換用の接続先。両方未設定なら`http://localhost:11434` |
| `OLLAMA_MODEL` | 既定`qwen2.5-coder:7b`。モデル導入・起動は利用者側の別作業 |
| `ADMIN_PASSWORD` | 管理者の共有パスワード。未設定ではログイン不可。十分に強い値を環境側で管理 |
| `ADMIN_SESSION_SECRET` | 32文字以上の署名鍵。未設定・短い場合はセッションを発行しない |
| `SECURITY_STORE` | `redis`または`memory`。本番の既定`redis`、開発の既定`memory` |
| `SECURITY_REDIS_REST_URL` | 優先設定系統のRedis RESTエンドポイント。HTTPS必須。同じ系統のトークンと対で設定 |
| `SECURITY_REDIS_REST_TOKEN` | 優先設定系統のRedis RESTトークン。読み書きとEVALが可能な権限が必要 |
| `KV_REST_API_URL` | 上記2変数が両方とも未登録の場合だけ使用する、Upstash連携のREST URL |
| `KV_REST_API_TOKEN` | 同じKV系統の書き込み可能なRESTトークン。URLと対で使用 |
| `SECURITY_SINGLE_PROCESS` | 単一プロセスの本番相当ローカル検証で`memory`を使う場合だけ`true`。Vercelでは許可されない |
| `APP_ORIGIN` | 任意の固定公開origin（例：`https://your-domain.example`）。未設定時はリクエストのHostを使用。入口側でHostを検証すること |

全インスタンスで同一のRedisデータベース、署名鍵、管理者パスワードを使用してください。ステージングと本番は別のRedisデータベースへ分離してください。

Redis設定は系統ごとに選択します。`SECURITY_REDIS_REST_URL`または`SECURITY_REDIS_REST_TOKEN`が一つでも登録されていれば、両方とも同じ系統から取得します。片方だけ、空文字、空白だけの設定は503で拒否し、有効なKV系統があっても迂回しません。両方が未登録の場合のみ`KV_REST_API_URL`と`KV_REST_API_TOKEN`の対を使用します。`KV_REST_API_READ_ONLY_TOKEN`、`KV_URL`、`REDIS_URL`はこのRESTストアの接続情報として使用しません。読み取り専用トークンではセッション・制限の書き込みができません。

VercelのPreviewとProductionでは、環境変数の適用先を分けて設定してください。PreviewにはProductionとは別のRedisデータベースと管理者認証情報を使い、`APP_ORIGIN`も検証に使用するPreviewの正規HTTPS URLへ合わせます。Production側の変数をPreviewのために上書きしないでください。Previewのデプロイ保護は維持し、認証された状態で検証します。既存Redisの利用可否、料金、契約の確認が済むまで、新しいサービスの作成や接続は行わないでください。

## 公開デモの構成

1. `AI_PROVIDER=demo`を設定します。Ollamaサービスは公開デモの前提条件ではありません。
2. `SECURITY_STORE=redis`とRedis RESTのURL・書き込み可能トークンを同じ系統で設定します。VercelのUpstash連携が`KV_REST_API_URL`と`KV_REST_API_TOKEN`を登録している場合、`SECURITY_REDIS_REST_*`の両方を未登録にしてその対を利用できます。Redis EVALによる原子的処理で全インスタンスの回数・同時処理枠を共有します。
3. HTTPS、正規Hostの制限、適切な本文サイズ・接続数・リクエスト時間制限を入口のプロキシ／ホスティング側にも設定します。アプリ内制限だけで接続レベルのDoSは防げません。
4. 管理画面を利用する場合だけ認証情報を設定します。固定デモデータの展示用共有認証であり、個人別アカウント・MFA・権限管理は実装していません。
5. 共有ストアの障害・設定不足時、APIは503を返し、認可は失敗します。保護を解除して処理を継続しません。

Upstash互換RESTサービスへの実デプロイは別途必要です。ローカルRedisの統合テストは、プロバイダー固有の認証・TLS・リージョン・割当上限の検証を代替しません。データの巻き戻りや任意のキー削除がないようRedisの運用・認証情報も保護してください。

## API・認証の保護

制限値は`lib/securityPolicy.ts`、表示・エラー文言は`lib/chatUiText.ts`に集約しています。

- `POST /api/chat`はJSONオブジェクトのみ受け付けます。本文は最大4000 UTF-16コード単位、リクエスト全体は32 KiB。任意の氏名は100、メールは254コード単位以内です。未知の項目や不正型は400、サイズ超過は413、非対応Content-Typeは415を返します。
- 頻度はサイト全体でチャット60回／分、ログイン10回／15分です。成功・失敗・不正入力も消費し、上限時は429とRetry-Afterを返します。偽装可能なIPヘッダーを識別に使いません。
- チャットの同時処理は全体で4件、本文読み取りは5秒、処理期限は25秒。混雑時は503、タイムアウト時は504を返します。Redisの処理枠は35秒で失効し、異常終了後も残り続けません。
- この共有割当は公開デモ用の保守的な制限です。一人の連続利用で他の利用者や管理者も一時的に制限される可能性があります。実運用では入口のWAF／利用者別制限を組み合わせてください。
- OllamaはタイムアウトとAbortSignal、`num_predict=512`、応答サイズ128 KiBを設定します。クライアント切断による中断はOllama側の計算停止を保証しないため、将来のOllama運用ではサーバー側にも計算資源制限が必要です。
- エラーは`{ error, code }`形式に統一し、内部例外、接続先、モデル名、スタックトレースは返しません。サーバーログは固定の障害イベント識別子のみで、問い合わせ・氏名・メール・Cookie・認証情報・モデル応答全文を出力しません。
- ログイン転送先は`/admin`または`/settings`だけです。バックスラッシュやエンコードされた変形を含む他の値は`/admin`へフォールバックします。
- CookieはHttpOnly、SameSite=Lax、12時間、本番はSecureです。署名に加えてランダムセッションIDの有効記録を共有ストアで確認します。ログアウト時は記録を削除し、コピー済みCookieも失効します。
- パスワードまたは署名鍵の変更でも既存Cookieは無効になります。旧署名のみのCookieは受け付けません。`memory`ではプロセス再起動時にも全セッションが失効します。
- Proxyだけでなく、管理画面・設定画面のデータ取得側でも認可します。OriginとSec-Fetch-Siteで異なるサイトからのブラウザーPOSTを拒否します。ヘッダーのない直接クライアントも回数・サイズ制限の対象です。

## 検証

```powershell
npm ci
npm run lint
npm run typecheck
npm test
$env:AI_PROVIDER = 'demo'
npm run build
npm audit
npm audit --omit=dev
```

自動テストはNode.js標準のテストランナーと開発依存`tsx`を使用します。デモ時の外部fetch禁止、入力・サイズ・頻度・同時処理・時間制限、ログイン、転送先、Cookie改ざん、ログアウト後の失効、エラー情報の保護、正規表現の誤検知・見逃し例を検証します。Ollama接続契約のテストはfetchモックのみで、モデルのダウンロード・起動・推論を行いません。

Redisの任意の統合テストにはDockerが必要です。テスト専用コンテナーを使用し、既存Redisを指定しないでください。

```powershell
docker run --detach --rm --name ai-console-security-qa redis:8-alpine
$env:REDIS_TEST_CONTAINER = 'ai-console-security-qa'
npm run test:redis
docker stop ai-console-security-qa
```

ポートは公開しません。ローカルRESTアダプター経由で実際のRedis EVALを実行し、独立クライアント間での回数・処理枠共有と失効を検証します。環境変数なしの`test:redis`はスキップされるため、成功件数を確認してください。

## 依存関係の評価（2026-11-04）

Next.jsとeslint-config-nextを16.2.6から16.4.4へ更新し、既存範囲内の推移依存を更新しました。React / React DOMは19.2.4を維持しています。Next.jsのpeer要件と整合しています。

| audit | 修正前 | 修正後 |
|---|---:|---:|
| Critical | 1 | 0 |
| High | 8 | 0 |
| Moderate | 16 | 16 |
| Low | 1 | 0 |

`npm audit --omit=dev`は検出0件です。主な推移依存はsharp 0.34.5→0.35.5、source-map-js 1.2.1→1.2.2、brace-expansion 1.1.14→1.1.21 / 5.0.6→5.0.12、Next.js内PostCSS 8.4.31→8.5.23です。テスト用にtsx 4.23.15を開発依存へ追加しています。

残存は開発依存minimatchの`GHSA-g3hv-75wg-m249`（CVE-2026-118764）とESLint系への波及です。告知では攻撃者が制御するglobとoptimizationLevel >= 2でCPU／メモリー消費が増加します。アプリの問い合わせ入力はglobとして処理されません。npmはminimatch <11.0.1を広く検出していますが、現行ESLint系は旧メジャーを要求します。API互換性が異なる11系の強制overrideや、auditが提示する旧ESLintへのダウングレードは実施していません。開発時も信頼できないglobや設定を実行せず、上流の互換更新を追跡してください。ESLint 9系は保守終了のため、プラグイン互換性を確認する後続更新が必要です。

対象Windows RCEの修正済み範囲への更新は行っていますが、実際の攻撃コードは実行していません。audit件数は依存元への波及を含み、独立した攻撃経路の数ではありません。検出件数だけで安全性を断定しないでください。

参考：
- [Next.js Windows RCE](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36)
- [Proxy bypass: 単一i18n localeなどの条件あり](https://github.com/vercel/next.js/security/advisories/GHSA-6gpp-xcg3-4w24)
- [SVG Image Optimization RCE: glibc Linuxなどの条件あり](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw)
- [minimatch advisory](https://github.com/isaacs/minimatch/security/advisories/GHSA-g3hv-75wg-m249)
- [ESLint version support](https://eslint.org/version-support/)

今回の主な検証対象はデモモードです。Ollamaの実通信・モデル推論の正常動作は未検証です。

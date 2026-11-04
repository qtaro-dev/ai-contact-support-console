# AI Contact Support Console

日本語の問い合わせに対するAI回答案と、カスタマーハラスメント（カスハラ）リスク判定を表示するNext.js / TypeScript製の問い合わせ対応デモです。公開サイトは外部AIサービス・Redis・データベース不要のデモモードで動作し、LAN内では既存のOllama連携によるローカルLLMモードも利用できます（実モデルでの通信は未検証）。リスク判定は正規表現による参考情報であり、最終判断は人が行います。

**[公開デモを開く](https://ai-contact-support-console.vercel.app/)**

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
npm run start -- --hostname 127.0.0.1
```

本番のSecure Cookieを使う管理者認証はHTTPSで運用してください。Redis・DB・外部ストレージは不要です。

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
| `APP_ORIGIN` | 任意の固定公開origin（例：`https://your-domain.example`）。未設定時はリクエストのHostを使用。入口側でHostを検証すること |

## 公開デモとLAN内ローカル版

- Vercel Production／Previewは既存の`AI_PROVIDER=demo`を使用します。外部AIや自宅LAN内のOllamaには接続しません。Vercel Hobbyの無料枠内で運用し、新規DB・有料サービスは導入しません。
- LAN内ローカル版は既存の`AI_PROVIDER=ollama`、`OLLAMA_API_BASE`／`OLLAMA_API_URL`、`OLLAMA_MODEL`で接続先とモデルを指定します。接続設定・モデル選択方式は従来どおりです。Redisなしで利用できます。
- 管理画面を使う場合は`ADMIN_PASSWORD`と32文字以上の`ADMIN_SESSION_SECRET`を設定します。公開版はHTTPSで運用し、必要に応じて`APP_ORIGIN`を正規の公開originへ固定します。
- 旧Redis関連環境変数が残っていてもコードは参照しません。既存Upstashリソースはアプリの動作に不要ですが、今回削除しません。

## API・認証の保護

制限値は`lib/securityPolicy.ts`、表示・エラー文言は`lib/chatUiText.ts`に集約しています。

- `POST /api/chat`はJSONオブジェクトのみ受け付けます。本文は最大4000 UTF-16コード単位、リクエスト全体は32 KiB。任意の氏名は100、メールは254コード単位以内です。未知の項目や不正型は400、サイズ超過は413、非対応Content-Typeは415を返します。
- 共有ストアを使わないため、アプリによる共有レート制限・共有同時処理上限はありません。複数インスタンス間で回数や処理枠を保証する構成ではありません。
- 本文読み取りは5秒、処理期限は25秒。タイムアウト時は504を返します。入力サイズ・処理時間の制限は維持します。
- OllamaはタイムアウトとAbortSignal、`num_predict=512`、応答サイズ128 KiBを設定します。クライアント切断による中断はOllama側の計算停止を保証しないため、将来のOllama運用ではサーバー側にも計算資源制限が必要です。
- エラーは`{ error, code }`形式に統一し、内部例外、接続先、モデル名、スタックトレースは返しません。サーバーログは固定の障害イベント識別子のみで、問い合わせ・氏名・メール・Cookie・認証情報・モデル応答全文を出力しません。
- ログイン転送先は`/admin`または`/settings`だけです。バックスラッシュやエンコードされた変形を含む他の値は`/admin`へフォールバックします。
- CookieはHttpOnly、SameSite=Lax、12時間、本番はSecureです。共有ストアを使わず署名と有効期限で検証します。ログアウト時はブラウザーのCookieを削除します。コピー済みCookieのサーバー側即時失効は保証されず、有効期限まで再利用できる場合があります。
- パスワードまたは署名鍵を変更すると既存Cookieは無効になります。プロセスの再起動だけでは署名Cookieは失効しません。
- Proxyだけでなく、管理画面・設定画面のデータ取得側でも認可します。OriginとSec-Fetch-Siteで異なるサイトからのブラウザーPOSTを拒否します。Originのない直接クライアントは許可されますが、入力・サイズ・時間の制限は適用されます。

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

自動テストはNode.js標準のテストランナーと開発依存`tsx`を使用します。デモ時の外部fetch禁止、入力・サイズ・時間制限、ログイン、転送先、Cookie改ざん、ログアウト時のCookie削除と署名Cookieの制約、エラー情報の保護、正規表現の誤検知・見逃し例を検証します。Ollama接続契約のテストはfetchモックのみで、モデルのダウンロード・起動・推論を行いません。

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

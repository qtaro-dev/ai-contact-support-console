# AI Contact Support Console

日本語の問い合わせ対応を支援する、Next.js / TypeScript製のポートフォリオ作品です。問い合わせに対する回答案の表示と、カスタマーハラスメント（カスハラ）のリスク判定を組み合わせています。

**[公開デモを試す](https://ai-contact-support-console.vercel.app/)**

## 主な機能

- 問い合わせの入力と回答案の表示
- 正規表現によるカスハラリスク・カテゴリ・検出理由・推奨対応の表示
- 画面内の問い合わせ履歴の確認
- 管理者画面（固定モックデータを使用。実際の問い合わせとは連動しません）

## 公開デモとローカルLLM

| 動作モード | 回答の仕組み | 利用場所 |
| --- | --- | --- |
| 公開デモ（`demo`） | 判定結果に対応する定型文。**LLMによる文章生成ではありません** | Vercelの公開サイト |
| ローカルLLM（`ollama`） | OllamaのチャットAPIに問い合わせを送り、回答案を生成する実装 | Ollamaへ接続できるローカル環境 |

公開サイトは`demo`固定で、外部AI・Ollama・Redis・DBを使用しません。**公開サイトの画面からOllamaモードに切り替える機能はありません。** モードの選択は、アプリを動かす**サーバー側**の環境変数`AI_PROVIDER`で行います。

OllamaのAPI呼び出し処理とモックテストはありますが、**実際のOllamaモデルを使った接続・推論は未検証**です。実モデルで動くことを保証する記述はしていません。

## ローカル起動（Windows / PowerShell）

Node.jsとnpmを用意し、リポジトリのフォルダーで実行してください。

### 1. デモモードで起動

```powershell
npm ci
$env:AI_PROVIDER = 'demo'
npm run dev -- --hostname 127.0.0.1
```

ブラウザーで `http://127.0.0.1:3000` を開きます。デモモードはOllama不要です。

### 2. Ollamaモードの接続設定（実モデルでの動作は未検証）

このリポジトリのコードは、Next.jsサーバーからOllamaの `POST /api/chat` を呼び出します。**環境変数だけを切り替えても、Ollama本体が動作していて、指定モデルが利用可能でなければ回答は得られません。**

1. [Ollama公式サイト](https://ollama.com/)からWindows版をインストールし、Ollamaが動作していることを確認します。
2. PowerShellで `ollama list` を実行し、利用できるモデル名を確認します。
3. Next.jsを動かすPCから `http://localhost:11434/api/tags` にアクセスできることを確認します。同じPCであれば次のコマンドで確認できます。

```powershell
Invoke-RestMethod http://localhost:11434/api/tags
```

4. **デモモードのNext.jsを停止してから**、同じプロジェクトのPowerShellで以下を実行します。`OLLAMA_MODEL`には `ollama list` で確認したモデル名を設定してください。

```powershell
$env:AI_PROVIDER = 'ollama'
$env:OLLAMA_API_BASE = 'http://localhost:11434'
$env:OLLAMA_MODEL = '<ollama listで確認したモデル名>'
npm run dev -- --hostname 127.0.0.1
```

5. `http://127.0.0.1:3000` から問い合わせを送信します。**この操作の実機での成功は未確認**です。

`localhost`は**Next.jsサーバー自身**を指します。Ollamaを別のLAN内PCで動かす場合は、そのPCの接続先URLを`OLLAMA_API_BASE`へ設定し、Ollama側の待受アドレス・ファイアウォール等も別途設定する必要があります。LANへの公開設定は安全性を確認してから行ってください。**Vercel公開版から自宅LANのOllamaへ接続する構成ではありません。**

> モードを変える際は、起動中のNext.jsを停止し、環境変数を設定したうえで再起動してください。ブラウザーの表示を切り替えるだけでは変更されません。

関連資料：[Ollama Windows](https://docs.ollama.com/windows) / [Ollama Chat API](https://docs.ollama.com/api/chat) / [Next.js 環境変数](https://nextjs.org/docs/app/guides/environment-variables)

## 注意事項と制約

- リスク判定は**正規表現による参考情報**です。文脈を正確に理解するものではなく、誤判定があり得ます。カスハラの確定や処分の自動判断には使わず、人が確認してください。
- 回答案も参考用です。デモに実在する個人情報を入力しないでください。
- 問い合わせ履歴はブラウザー内の一時的な状態で、再読み込みすると消えます。DB等への永続保存はありません。
- 管理者認証には署名Cookieを使用します。ログアウト後もコピー済みCookieが有効期限内に再利用される可能性があります。共有レート制限はありません。
- 入力検証・サイズ制限・Origin検証・タイムアウト・内部情報非開示などを実装していますが、無欠陥や完全な安全性を保証するものではありません。

## 開発・確認用コマンド

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

ローカルLLMの実通信は未検証です。利用前にOllama側のモデル・接続条件を確認してください。

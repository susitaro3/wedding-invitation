# 結婚式Web招待状システム (GitHub Pages + Googleスプレッドシート連携)

GitHub Pages上で動作する、エレガントでレスポンシブな結婚式Web招待状システムです。  
GoogleスプレッドシートおよびGoogle Apps Script (GAS) をバックエンドとして使用し、招待客ごとにユニークなトークン（URLパラメータ）でゲスト情報（お名前、事前に登録したご家族・代理出席者等）を自動読み込み・初期表示します。

---

## 🌟 特長・機能

- **トークン識別 & 画面描画時データ自動取得**:
  - URLの `?token=XXX` パラメータから個別のゲスト情報をGoogleスプレッドシートより取得。
  - お名前（姓・名）、ふりがな、新郎側/新婦側区分、年齢区分が自動表示されます。
- **事前定義代理出席者（PredefinedProxies）の独立テーブル化**:
  - 招待主以外の事前定義ご家族・代理出席者は、専用の `PredefinedProxies` シートで管理。
  - トークンに紐づく同伴者様のお名前・年齢区分が画面上にダイナミックに一覧表示され、出欠チェックを選択できます。
- **出欠に応じた表示切り替え**:
  - 「ご出席」を選択した場合：連絡先、住所、アレルギー、同伴者入力欄を表示。
  - 「ご欠席」を選択した場合：住所・アレルギー等の詳細欄を自動で非表示化（お名前とメッセージのみ保持）。
- **郵便番号住所自動入力**:
  - zipcloud API連携により、郵便番号入力（7桁）からワンタップで住所を自動補完（完全無料）。
- **送信前確認モーダル**:
  - 送信間違いを防止するエレガントな確認モーダル表示。
- **完全無料・サーバーレス**:
  - ホスティングは GitHub Pages、データベースは Google スプレッドシートを使用するため維持費が無料です。

---

## 📁 ディレクトリ構造

```text
結婚新規招待状v2/
├── index.html        # メインWebページ（ヒーローセクション、フォーム、モーダル等）
├── css/
│   └── style.css     # レスポンシブスタイリング（結婚式向けエレガントテーマ）
├── js/
│   ├── config.js     # 基本設定（GAS Web App URL、新郎新婦名、挙式日時・場所等）
│   └── app.js        # メインアプリケーションロジック（API連携、自動補完、フォーム制御）
├── gas/
│   ├── Code.gs       # Google Apps Script コード（doGet / doPost API）
│   └── README.md     # スプレッドシート作成・GASデプロイ詳細ガイド（3シート構成）
└── README.md         # 本ファイル（全体運用・GitHub Pages公開手順ガイド）
```

---

## 🚀 セットアップ・デプロイ手順

### STEP 1: Googleスプレッドシート & GASのデプロイ
1. Googleスプレッドシートを作成し、`Tokens` シート、`PredefinedProxies` シート、`Responses` シートの3つを用意します。
2. `gas/Code.gs` をApps Scriptエディタにコピー＆ペーストし、ウェブアプリとして全員（Anyone）アクセス権でデプロイします。
3. 詳細なスプレッドシートの列名やGASデプロイ手順は **[`gas/README.md`](gas/README.md)** をご覧ください。

### STEP 2: `js/config.js` の編集
`js/config.js` を開き、GASデプロイ時に発行された **ウェブアプリURL** および式情報を設定します。

```javascript
const CONFIG = {
  GAS_WEB_APP_URL: "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec",
  GROOM_NAME: "新郎 太郎",
  BRIDE_NAME: "新婦 花子",
  WEDDING_DATE: "2026年10月10日（土）",
  RECEPTION_TIME: "開場 11:30 / 挙式 12:00 / 披露宴 13:00",
  VENUE_NAME: "グランドホテル東京 鳳凰の間",
  VENUE_ADDRESS: "東京都千代田区1-1-1",
  RESPONSE_DEADLINE: "2026年9月1日（火）"
};
```

### STEP 3: GitHub Pages への公開
1. 本リポジトリのコードを GitHub の新規リポジトリにプッシュします。
2. GitHub リポジトリの **Settings > Pages** を開きます。
3. **Build and deployment** の Source に `Deploy from a branch` を選択します。
4. Branch に `main` (または `master`) / `/ (root)` を選択して **Save** します。
5. 数分後、`https://<your-github-username>.github.io/<repository-name>/` のURLで公開されます。

---

## 💌 各招待客への招待状URL配布方法

Googleスプレッドシートの `Tokens` シートのA列に登録したトークン文字列（例: `guest-yamada`）を使用し、以下のようなURLを作成してLINEやメールで案内します：

```text
https://<your-github-username>.github.io/<repository-name>/?token=guest-yamada
```

招待客がこのURLを開くと、自動的に該当する招待客とそのご家族（`PredefinedProxies` シートに登録された代理出席者データ）がセットされた状態で招待状画面が表示されます。

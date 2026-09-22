# Googleスプレッドシート & Google Apps Script (GAS) 設定ガイド

結婚式Web招待状バックエンドとして使用するGoogleスプレッドシートとGoogle Apps Scriptの設定手順です。

---

## ⚡ ワンクリック自動シート作成機能 (おすすめ)

`gas/Code.gs` には、必要なシートを1発で自動生成・デザイン整形・サンプル設定する `createWeddingSheets` 関数が含まれています。

### 自動作成手順：
1. 新しいGoogleスプレッドシートを作成します。
2. 上部メニュー **「拡張機能」>「Apps Script」** を開きます。
3. `Code.gs` の内容を消去し、プロジェクトの `gas/Code.gs` をすべて貼り付けて保存します。
4. エディタ上部の**関数選択ドロップダウン**（`doGet` や `doPost` と並んでいる部分）で **`createWeddingSheets`** を選択し、**「実行」** ボタンを押します。
5. アクセス許可ポップアップが表示された場合は承認してください。
6. 一瞬で **`Tokens`**、**`PredefinedProxies`**（ProxyId付き）、**`Responses`** の3つのシートが背景色付き・ヘッダー固定・サンプルデータ入りで自動構築されます！

---

## 1. 手動で作成する場合のテーブル構成 (3シート構成)

### ① `Tokens` シート（招待主ゲスト管理）
トークンを発行する主ゲスト（本招待客）情報を管理します。

| 列 | ヘッダー名 | 説明 | 例 |
|---|---|---|---|
| A | `Token` | 一意のトークン文字列 | `sample-guest-001` |
| B | `LastName` | 姓 | `山田` |
| C | `FirstName` | 名 | `太郎` |
| D | `KanaLastName` | せい (よみがな) | `やまだ` |
| E | `KanaFirstName` | めい (よみがな) | `たろう` |
| F | `Side` | 新郎側 / 新婦側 | `新郎側` |
| G | `AgeCategory` | 年齢区分 | `大人` （または `子供`, `幼児`） |
| H | `Email` | メールアドレス (任意) | `taro@example.com` |
| I | `Status` | 回答状況 (自動更新されます) | `未回答` / `出席` / `欠席` |

---

### ② `PredefinedProxies` シート（事前定義代理出席者・ご家族管理）
管理者側で事前にトークンに紐づけて定義する代理出席者・同伴者の専用テーブルです。各代理出席者を一意に特定するために **`ProxyId` 列（A列）** を備えています。

| 列 | ヘッダー名 | 説明 | 例 |
|---|---|---|---|
| A | `ProxyId` | 代理出席者管理キー【NEW!】 | `proxy-001` |
| B | `Token` | 紐づけるTokensシートのToken | `sample-guest-001` |
| C | `LastName` | 姓 | `山田` |
| D | `FirstName` | 名 | `花子` |
| E | `KanaLastName` | せい (よみがな) | `やまだ` |
| F | `KanaFirstName` | めい (よみがな) | `はなこ` |
| G | `Side` | 新郎側 / 新婦側 | `新郎側` |
| H | `AgeCategory` | 年齢区分 | `大人` （または `子供`, `幼児`） |
| I | `Email` | メールアドレス (任意) | `hanako@example.com` |

---

### ③ `Responses` シート（回答保存用）
フォームからの回答データが自動記録されます。

| 列 | ヘッダー名 |
|---|---|
| A | `Timestamp` |
| B | `Token` |
| C | `Attendance` |
| D | `LastName` |
| E | `FirstName` |
| F | `KanaLastName` |
| G | `KanaFirstName` |
| H | `Side` |
| I | `AgeCategory` |
| J | `Email` |
| K | `PostalCode` |
| L | `Address` |
| M | `Building` |
| N | `Phone` |
| O | `Allergies` |
| P | `PredefinedProxiesResponse` |
| Q | `AdditionalProxies` |
| R | `Message` |

---

## 2. Google Apps Script (GAS) のデプロイ手順

1. Apps Script エディタの右上にある **「デプロイ」>「新しいデプロイ」** をクリックします。
2. 種類で **「ウェブアプリ」** を選択し、以下の通り設定します：
   - **実行するユーザー**: `自分`
   - **アクセスできるユーザー**: `全員` (**Anyone**) ※非常に重要です！
3. 発行された **「ウェブアプリ URL」** をコピーし、`js/config.js` の `GAS_WEB_APP_URL` に設定してください。

# GitHub Pages + Google スプレッドシート + Gmail

招待ページは GitHub Pages で公開し、回答はスプレッドシートに保存、受付完了メールは Gmail から送る構成です。通常の結婚式規模なら無料で運用できます。

## 1. Google側を設定する

1. 新しい Google スプレッドシートを作成し、**拡張機能 → Apps Script** を開きます。
2. `Code.gs` と `appsscript.json` の内容を貼り付けます。
3. エディタ上部の関数選択で **`setup`** を選んでから、一度だけ実行して権限を許可します。`doGet` や `doPost` はエディタから実行せず、Webアプリへのアクセス時に自動で実行されます。`Guests` と `Responses` シートができます。
4. `Guests` に招待者を登録します。

| Token | GuestName | Email | PredefinedProxies | Notes |
| --- | --- | --- | --- | --- |
| 8dQpK2zL7m | 山田 太郎 | taro@example.com | 山田 花子、山田 次郎 | 家族招待 |

`Token` は招待者ごとに異なる、推測されにくい文字列にしてください。`PredefinedProxies` は読点・カンマ・改行で複数名を区切れます。

5. **デプロイ → 新しいデプロイ → ウェブアプリ** を選択し、実行ユーザーは「自分」、アクセスできるユーザーは「全員」にします。発行された **`/exec` URL** を控えます。

## 2. GitHub Pages を公開する

1. GitHub に公開リポジトリを作り、`index.html` と `config.js` だけをリポジトリ直下に置きます。
2. `config.js` の `PASTE_YOUR...` を、先ほどの Apps Script `/exec` URL に差し替えてコミットします。
3. リポジトリの **Settings → Pages** で `Deploy from a branch` と `main / (root)` を選びます。
4. 数分後に表示される Pages URL を確認します。

## 3. 個別URLを送る

`https://ユーザー名.github.io/リポジトリ名/?id=8dQpK2zL7m`

同じURLでの再回答は最新の内容で上書きされます。`Email` 列のある招待者には、スクリプトをデプロイしたGoogleアカウントから完了メールを送ります。

## 注意

- 回答期限は仮で **2026年12月31日** です。`Code.gs` 冒頭の `replyDeadline` を更新してください。
- `Guests`、`Responses`、Apps Scriptの編集権限はGitHubに置かないでください。
- URLのTokenは招待者の識別子です。長いランダム文字列にし、URLの転送には注意してください。
- GitHub Pagesから招待情報を表示するため、Google公式で案内されている読み取り専用JSONPを使用しています。回答の個人情報はURLには載せず、フォームPOSTで送信します。

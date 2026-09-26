/**
 * 結婚式招待状Webアプリ - 設定ファイル
 * Apps Script をウェブアプリとしてデプロイした後、取得した /exec URL を apiUrl に設定してください。
 */
window.WEDDING_CONFIG = {
  // Google Apps Script Web App URL (/exec)
  apiUrl: 'PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE',

  // 式場・イベント基本情報 (GASから読み込めない場合のフォールバック値)
  groom: '小泉竜馬',
  bride: '大西美保夏',
  eventDate: '2027年2月11日（木・祝）',
  venue: 'カサ・デ・アンジェラ青山',
  venueAddress: '東京都港区南青山2-22-16',
  replyDeadline: '2026年12月31日'
};

// 互換性のための定義
window.WEDDING_API_URL = window.WEDDING_CONFIG.apiUrl;

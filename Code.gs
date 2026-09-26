/**
 * 結婚式招待状 Webアプリ - GAS バックエンド
 */
const CONFIG = {
  spreadsheetId: '', // 空欄の場合はこのスクリプトがバインドされたスプレッドシートを使用します
  groom: '小泉竜馬',
  bride: '大西美保夏',
  eventDate: '2027年2月11日（木・祝）',
  venue: 'カサ・デ・アンジェラ青山',
  replyDeadline: '2026年12月31日',
  replyToEmail: '',
  notificationEmails: '' // 主催者への通知先メールアドレス（カンマ区切りで複数指定可）
};

const VERSION = '2.0.0';

// シートのヘッダー定義
const GUEST_HEADERS = ['Token', 'LastName', 'FirstName', 'LastNameKana', 'FirstNameKana', 'Email', 'Phone', 'Notes', 'CreatedAt'];
const PREDEFINED_PROXY_HEADERS = ['Token', 'ProxyId', 'LastName', 'FirstName', 'LastNameKana', 'FirstNameKana', 'Side', 'AgeCategory', 'Allergies', 'Note'];
const RESPONSE_HEADERS = ['SubmittedAt', 'Token', 'GuestName', 'Email', 'Attendance', 'LastName', 'FirstName', 'LastNameKana', 'FirstNameKana', 'Side', 'AgeCategory', 'PostalCode', 'Address', 'Building', 'Phone', 'Allergies', 'PredefinedProxiesResponse', 'AdditionalProxies', 'Message', 'MailSentAt', 'MailError', 'HostNotificationError'];
const LOG_HEADERS = ['Timestamp', 'Level', 'Token', 'Message', 'Data'];

/**
 * 初期セットアップ関数
 * スプレッドシートに必要なシートおよびヘッダーを作成します。
 */
function setup() {
  const ss = spreadsheet_();
  sheet_(ss, 'Guests', GUEST_HEADERS);
  sheet_(ss, 'PredefinedProxies', PREDEFINED_PROXY_HEADERS);
  sheet_(ss, 'Responses', RESPONSE_HEADERS);
  sheet_(ss, 'Logs', LOG_HEADERS);
  SpreadsheetApp.flush();
}

/**
 * GET リクエスト処理 (JSONPによる招待データ取得)
 */
function doGet(e) {
  if (!e || !e.parameter) {
    return ContentService.createTextOutput('招待状ページからご利用ください。');
  }

  const callback = callback_(e.parameter.callback || 'callback');
  const token = String(e.parameter.id || e.parameter.token || '').trim();
  let out;

  try {
    if (!token) {
      throw new Error('招待URLのパラメータ（ID）が見つかりません。');
    }

    // GAS上で管理されている Guests シートと照合
    const guest = findGuest_(token);
    if (!guest) {
      throw new Error('指定された招待URL（トークン）は登録されていません。URLをご確認ください。');
    }

    // トークンに紐づく事前定義代理出席者を PredefinedProxies シートから取得
    const predefinedProxies = findPredefinedProxies_(token);

    out = {
      ok: true,
      guest: guest,
      predefinedProxies: predefinedProxies,
      eventInfo: {
        groom: CONFIG.groom,
        bride: CONFIG.bride,
        eventDate: CONFIG.eventDate,
        venue: CONFIG.venue,
        replyDeadline: CONFIG.replyDeadline
      },
      version: VERSION
    };
  } catch (error) {
    out = {
      ok: false,
      message: error.message
    };
  }

  return ContentService
    .createTextOutput(callback + '(' + JSON.stringify(out) + ')')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

/**
 * POST リクエスト処理 (出欠回答の保存)
 */
function doPost(e) {
  let payload;
  try {
    const payloadStr = (e.parameter && e.parameter.payload) || (e.postData && e.postData.contents) || '{}';
    payload = JSON.parse(payloadStr);
    log_('INFO', payload.token || '', 'Received response submission', payloadStr);
  } catch (parseErr) {
    log_('ERROR', '', 'Failed to parse POST payload', String(parseErr));
    return createResponse_({ ok: false, message: 'データの送信形式が正しくありません。' });
  }

  let result;
  try {
    result = saveResponse_(payload);
  } catch (err) {
    log_('ERROR', payload.token || '', 'Error in saveResponse_', String(err.message || err));
    result = { ok: false, message: String(err.message || err) };
  }
  result.version = VERSION;
  return createResponse_(result);
}

/**
 * Web Appレスポンス作成
 */
function createResponse_(result) {
  return HtmlService.createHtmlOutput(
    '<script>window.top.postMessage(' + JSON.stringify({ type: 'wedding-response', result: result }) + ',"*");</script>'
  ).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * 回答保存処理
 */
function saveResponse_(form) {
  const token = String(form.token || '').trim();
  if (!token) throw new Error('招待URLが正しくありません。');

  // GAS上の Guests シートとトークン照合
  const guest = findGuest_(token);
  if (!guest) throw new Error('指定された招待URL（トークン）は無効です。');

  if (!form.attendance) throw new Error('出欠を選択してください。');

  const isAttending = form.attendance === '出席';
  const p = profile_(form.profile || {});
  const message = text_(form.message);
  const additionalProxies = isAttending ? text_(form.additionalProxies) : '';
  const predefinedProxiesResponse = isAttending && form.predefinedProxiesResponse ? JSON.stringify(form.predefinedProxiesResponse) : '';

  const guestName = (p.lastName + ' ' + p.firstName).trim() || guest.name || 'ゲスト';
  const email = p.email || guest.email || '';

  const sh = spreadsheet_().getSheetByName('Responses');
  if (!sh) throw new Error('Responses シートが見つかりません。setupを実行してください。');
  const h = headers_(sh);

  const rowData = RESPONSE_HEADERS.map(k => {
    if (k === 'SubmittedAt') return new Date();
    if (k === 'Token') return token;
    if (k === 'GuestName') return guestName;
    if (k === 'Email') return email;
    if (k === 'Attendance') return form.attendance;
    if (isAttending) {
      if (k === 'LastName') return p.lastName;
      if (k === 'FirstName') return p.firstName;
      if (k === 'LastNameKana') return p.lastNameKana;
      if (k === 'FirstNameKana') return p.firstNameKana;
      if (k === 'Side') return p.side;
      if (k === 'AgeCategory') return p.ageCategory;
      if (k === 'PostalCode') return p.postalCode;
      if (k === 'Address') return p.address;
      if (k === 'Building') return p.building;
      if (k === 'Phone') return p.phone;
      if (k === 'Allergies') return p.allergies;
      if (k === 'PredefinedProxiesResponse') return predefinedProxiesResponse;
      if (k === 'AdditionalProxies') return additionalProxies;
    }
    if (k === 'Message') return message;
    return '';
  });

  sh.appendRow(rowData);
  const row = sh.getLastRow();

  let emailSent = false;
  let mailError = '';
  let hostError = '';

  // ゲストへの送信完了メール
  if (email) {
    try {
      sendGuestMail_(guestName, email, form.attendance, p, additionalProxies, message);
      if (h['MailSentAt']) sh.getRange(row, h['MailSentAt']).setValue(new Date());
      emailSent = true;
    } catch (err) {
      mailError = String(err.message || err);
      if (h['MailError']) sh.getRange(row, h['MailError']).setValue(mailError.slice(0, 500));
    }
  }

  // 主催者（新郎新婦）への通知メール
  try {
    sendHostMail_(guestName, email, form.attendance, p, additionalProxies, message);
  } catch (err) {
    hostError = String(err.message || err);
    if (h['HostNotificationError']) sh.getRange(row, h['HostNotificationError']).setValue(hostError.slice(0, 500));
  }

  log_('INFO', token, 'Successfully saved response for ' + guestName, '');
  SpreadsheetApp.flush();

  return { ok: true, emailSent: emailSent };
}

/**
 * ゲスト検索 (Guests シートからトークンで照合)
 */
function findGuest_(token) {
  const sh = spreadsheet_().getSheetByName('Guests');
  if (!sh || sh.getLastRow() < 2) return null;
  const h = headers_(sh);
  const t = String(token || '').trim();
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getDisplayValues();

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const val = k => h[k] ? r[h[k] - 1] : '';
    const rowToken = String(val('Token')).trim();
    if (rowToken === t) {
      const lastName = val('LastName');
      const firstName = val('FirstName');
      const guestName = (lastName + ' ' + firstName).trim() || val('GuestName') || 'ご招待ゲスト';
      return {
        row: i + 2,
        token: t,
        name: guestName,
        email: val('Email'),
        phone: val('Phone'),
        profile: {
          lastName: lastName,
          firstName: firstName,
          lastNameKana: val('LastNameKana'),
          firstNameKana: val('FirstNameKana'),
          email: val('Email'),
          phone: val('Phone')
        }
      };
    }
  }
  return null;
}

/**
 * 事前定義代理出席者の取得 (PredefinedProxies シートからトークンで照合)
 */
function findPredefinedProxies_(token) {
  const sh = spreadsheet_().getSheetByName('PredefinedProxies');
  if (!sh || sh.getLastRow() < 2) return [];
  const h = headers_(sh);
  const t = String(token || '').trim();
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getDisplayValues();
  const list = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const val = k => h[k] ? r[h[k] - 1] : '';
    if (String(val('Token')).trim() === t) {
      list.push({
        proxyId: val('ProxyId') || ('proxy_' + (i + 1)),
        lastName: val('LastName'),
        firstName: val('FirstName'),
        lastNameKana: val('LastNameKana'),
        firstNameKana: val('FirstNameKana'),
        side: val('Side'),
        ageCategory: val('AgeCategory'),
        allergies: val('Allergies'),
        note: val('Note')
      });
    }
  }
  return list;
}

/**
 * ゲスト宛送信完了メール
 */
function sendGuestMail_(name, email, attendance, p, additionalProxies, message) {
  const body = [
    name + ' 様',
    '',
    'ご回答ありがとうございました。結婚式へのご案内に関するご回答を受け付けました。',
    '',
    '----------------------------------------',
    '■ ご回答内容',
    '・出欠：' + attendance,
    attendance === '出席' ? '・お名前：' + p.lastName + ' ' + p.firstName : '',
    attendance === '出席' ? '・よみがな：' + p.lastNameKana + ' ' + p.firstNameKana : '',
    attendance === '出席' ? '・区分：' + (p.side || '') + ' / ' + (p.ageCategory || '') : '',
    attendance === '出席' ? '・ご住所：〒' + p.postalCode + ' ' + p.address + ' ' + p.building : '',
    attendance === '出席' ? '・お電話番号：' + p.phone : '',
    attendance === '出席' && p.allergies ? '・アレルギー・食事制限：' + p.allergies : '',
    attendance === '出席' && additionalProxies ? '・追加代理出席者：\n' + additionalProxies : '',
    message ? '・メッセージ：\n' + message : '',
    '----------------------------------------',
    '',
    '■ 開催概要',
    '日時：' + CONFIG.eventDate,
    '会場：' + CONFIG.venue,
    '',
    '新郎：' + CONFIG.groom,
    '新婦：' + CONFIG.bride
  ].filter(line => line !== null && line !== undefined).join('\n');

  const options = CONFIG.replyToEmail ? { replyTo: CONFIG.replyToEmail } : {};
  MailApp.sendEmail(email, '【結婚式ご案内】ご回答を受け付けました', body, options);
}

/**
 * 主催者通知メール
 */
function sendHostMail_(name, email, attendance, p, additionalProxies, message) {
  const emails = String(CONFIG.notificationEmails || '')
    .split(',')
    .map(x => x.trim())
    .filter(x => x && x !== 'your-notification-address@example.com');

  if (emails.length === 0) return;

  const body = [
    '結婚式招待状への登録・更新がありました。',
    '',
    '・氏名：' + name,
    '・出欠：' + attendance,
    '・メールアドレス：' + email,
    attendance === '出席' ? '・よみがな：' + p.lastNameKana + ' ' + p.firstNameKana : '',
    attendance === '出席' ? '・区分：' + p.side + ' / ' + p.ageCategory : '',
    attendance === '出席' ? '・住所：〒' + p.postalCode + ' ' + p.address + ' ' + p.building : '',
    attendance === '出席' ? '・電話番号：' + p.phone : '',
    attendance === '出席' ? '・アレルギー：' + (p.allergies || 'なし') : '',
    attendance === '出席' && additionalProxies ? '・追加代理出席者：\n' + additionalProxies : '',
    '・メッセージ：' + (message || 'なし')
  ].join('\n');

  MailApp.sendEmail(emails.join(','), '【結婚式招待状】回答通知 (' + name + ' 様)', body);
}

/**
 * プロフィールオブジェクトのトリム＆整形
 */
function profile_(p) {
  p = p || {};
  return {
    lastName: text_(p.lastName),
    firstName: text_(p.firstName),
    lastNameKana: text_(p.lastNameKana),
    firstNameKana: text_(p.firstNameKana),
    side: text_(p.side),
    ageCategory: text_(p.ageCategory),
    email: text_(p.email).toLowerCase(),
    postalCode: text_(p.postalCode),
    address: text_(p.address),
    building: text_(p.building),
    phone: text_(p.phone),
    allergies: text_(p.allergies)
  };
}

/**
 * ログ記録
 */
function log_(level, token, msg, data) {
  try {
    const ss = spreadsheet_();
    let sh = ss.getSheetByName('Logs');
    if (!sh) {
      sh = ss.insertSheet('Logs');
      sh.appendRow(LOG_HEADERS);
    }
    sh.appendRow([new Date(), level, token, msg, String(data || '').slice(0, 5000)]);
    SpreadsheetApp.flush();
  } catch (e) {
    console.error('Logging error: ' + e.message);
  }
}

function spreadsheet_() {
  return CONFIG.spreadsheetId ? SpreadsheetApp.openById(CONFIG.spreadsheetId) : SpreadsheetApp.getActiveSpreadsheet();
}

function sheet_(ss, n, hs) {
  let s = ss.getSheetByName(n);
  if (!s) {
    s = ss.insertSheet(n);
    s.appendRow(hs);
  } else {
    const current = headers_(s);
    hs.forEach(h => {
      if (!current[h]) {
        s.getRange(1, s.getLastColumn() + 1).setValue(h);
      }
    });
  }
  s.getRange(1, 1, 1, s.getLastColumn()).setFontWeight('bold').setBackground('#f4e8ea');
  s.setFrozenRows(1);
  return s;
}

function headers_(s) {
  const o = {};
  const col = s.getLastColumn();
  if (col < 1) return o;
  const values = s.getRange(1, 1, 1, col).getDisplayValues()[0];
  values.forEach((x, i) => {
    const key = String(x || '').replace(new RegExp('[\\r\\n\\t ]+', 'g'), '');
    if (key) o[key] = i + 1;
  });
  return o;
}

function callback_(n) {
  if (!new RegExp('^[A-Za-z_$][A-Za-z0-9_$]{0,64}$').test(String(n || ''))) {
    throw new Error('不正なコールバック名です。');
  }
  return n;
}

function text_(v) {
  return String(v || '').trim().slice(0, 1000);
}

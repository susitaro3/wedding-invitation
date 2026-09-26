/**
 * 結婚式Web招待状 Google Apps Script (GAS) バックエンド処理
 *
 * 【スプレッドシートの構造】
 * 1. シート名: "Tokens" （招待主ゲストデータ）
 *    列構成: A:Token, B:LastName, C:FirstName, D:KanaLastName, E:KanaFirstName, F:Side, G:AgeCategory, H:Email, I:Status, J:PostalCode, K:Address, L:Building, M:Phone
 *
 * 2. シート名: "PredefinedProxies" （事前定義代理出席者テーブル）
 *    列構成: A:ProxyId, B:Token, C:LastName, D:FirstName, E:KanaLastName, F:KanaFirstName, G:Side, H:AgeCategory, I:Email, J:Status, K:Allergies, L:SameAddress, M:PostalCode, N:Address, O:Building, P:Phone
 *
 * 3. シート名: "Responses" （回答履歴データ保存用）
 *    列構成: A:Timestamp, B:Token, C:Attendance, D:LastName, E:FirstName, F:KanaLastName, G:KanaFirstName, H:Side, I:AgeCategory, J:Email, K:PostalCode, L:Address, M:Building, N:Phone, O:Allergies, P:PredefinedProxiesResponse, Q:AdditionalProxies, R:Message
 */

/**
 * 🚀 スプレッドシート自動初期化・シート生成関数
 */
function createWeddingSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Tokens シートの生成・初期化
  var tokensSheet = ss.getSheetByName('Tokens') || ss.getSheetByName('tokens');
  if (!tokensSheet) {
    tokensSheet = ss.insertSheet('Tokens');
  } else {
    tokensSheet.clear();
  }
  var tokensHeaders = [
    'Token', 'LastName', 'FirstName', 'KanaLastName', 'KanaFirstName',
    'Side', 'AgeCategory', 'Email', 'Status',
    'PostalCode', 'Address', 'Building', 'Phone'
  ];
  tokensSheet.appendRow(tokensHeaders);
  formatHeaderRow(tokensSheet, tokensHeaders.length, '#3a506b');

  // サンプル主ゲストデータ
  tokensSheet.appendRow([
    'sample-guest-01', '山田', '太郎', 'やまだ', 'たろう',
    '新郎側', '大人', 'yamada@example.com', '未回答',
    '', '', '', ''
  ]);
  tokensSheet.appendRow([
    'sample-guest-02', '佐藤', '花子', 'さとう', 'はなこ',
    '新婦側', '大人', 'sato@example.com', '未回答',
    '', '', '', ''
  ]);

  // 2. PredefinedProxies シートの生成・初期化
  var proxySheet = ss.getSheetByName('PredefinedProxies') || ss.getSheetByName('predefinedproxies');
  if (!proxySheet) {
    proxySheet = ss.insertSheet('PredefinedProxies');
  } else {
    proxySheet.clear();
  }
  var proxyHeaders = [
    'ProxyId', 'Token', 'LastName', 'FirstName', 'KanaLastName', 'KanaFirstName',
    'Side', 'AgeCategory', 'Email', 'Status', 'Allergies',
    'SameAddress', 'PostalCode', 'Address', 'Building', 'Phone'
  ];
  proxySheet.appendRow(proxyHeaders);
  formatHeaderRow(proxySheet, proxyHeaders.length, '#5bc0be');

  // サンプル事前定義代理出席者データ
  proxySheet.appendRow([
    'proxy-sample-01', 'sample-guest-01', '山田', '花子', 'やまだ', 'はなこ',
    '新郎側', '大人', 'hanako@example.com', '未回答', '',
    'はい', '', '', '', ''
  ]);
  proxySheet.appendRow([
    'proxy-sample-02', 'sample-guest-01', '山田', '一郎', 'やまだ', 'いちろう',
    '新郎側', '子供', '', '未回答', '',
    'はい', '', '', '', ''
  ]);

  // 3. Responses シートの生成・初期化
  var responseSheet = ss.getSheetByName('Responses') || ss.getSheetByName('responses');
  if (!responseSheet) {
    responseSheet = ss.insertSheet('Responses');
  } else {
    responseSheet.clear();
  }
  var responseHeaders = [
    'Timestamp', 'Token', 'Attendance', 'LastName', 'FirstName',
    'KanaLastName', 'KanaFirstName', 'Side', 'AgeCategory', 'Email',
    'PostalCode', 'Address', 'Building', 'Phone', 'Allergies',
    'PredefinedProxiesResponse', 'AdditionalProxies', 'Message'
  ];
  responseSheet.appendRow(responseHeaders);
  formatHeaderRow(responseSheet, responseHeaders.length, '#6fffe9');

  // 不要なデフォルトシートの削除
  var defaultSheet = ss.getSheetByName('シート1') || ss.getSheetByName('Sheet1');
  if (defaultSheet && ss.getSheets().length > 1) {
    try {
      ss.deleteSheet(defaultSheet);
    } catch (e) {
      // 無視
    }
  }

  Logger.log('スプレッドシートの生成と初期化が完了いたしました。');
}

/**
 * 📧 メール送信機能のテスト・承認用関数 (MailApp.sendEmail 利用)
 */
function testSendEmail() {
  var sendto = '';
  try {
    sendto = Session.getEffectiveUser().getEmail();
  } catch (e) {
    sendto = '';
  }

  var ui;
  try {
    ui = SpreadsheetApp.getUi();
  } catch (e2) {
    ui = null;
  }

  if (ui) {
    try {
      var promptResult = ui.prompt(
        'テストメール送信',
        'テストメールの送信先アドレスを入力してください（ご自身のメールアドレス）:',
        ui.ButtonSet.OK_CANCEL
      );

      if (promptResult.getSelectedButton() === ui.Button.OK) {
        var inputEmail = promptResult.getResponseText().trim();
        if (inputEmail) {
          sendto = inputEmail;
        }
      } else {
        return; // キャンセルされた場合
      }
    } catch (e3) {
      // UIが利用できない環境
    }
  }

  if (!sendto) {
    sendto = 'yamada@example.com';
  }

  var title = '【送信テスト】結婚式招待状 メール機能テスト';
  var body = 'これは結婚式Web招待状の自動返信メール送信機能のテストです。\nこのメールが届いていれば、GASのメール送信権限設定は正常に完了しています。';

  try {
    MailApp.sendEmail(sendto, title, body);
    Logger.log('MailApp.sendEmail success: ' + sendto);
    if (ui) ui.alert('【送信成功】\n' + sendto + ' 宛てにテストメールを送信いたしました。\n受信トレイ（または迷惑メールフォルダ）をご確認ください。');
  } catch (err) {
    Logger.log('送信エラー: ' + err.toString());
    if (ui) ui.alert('【送信エラー】メール送信に失敗しました:\n' + err.toString());
  }
}

/**
 * ヘッダー行のスタイル装飾ヘルパー
 */
function formatHeaderRow(sheet, colCount, headerBgColor) {
  var headerRange = sheet.getRange(1, 1, 1, colCount);
  headerRange.setBackground(headerBgColor)
             .setFontColor('#ffffff')
             .setFontWeight('bold')
             .setHorizontalAlignment('center');
  sheet.setFrozenRows(1);
}

/**
 * シートの1行目(ヘッダー)から列名と列インデックス(1-indexed)のマップを取得する動的ヘルパー
 */
function getHeaderColumnMap(sheet) {
  var map = {};
  if (!sheet) return map;
  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) return map;

  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  for (var c = 0; c < headers.length; c++) {
    if (headers[c]) {
      var key = headers[c].toString().trim().toLowerCase();
      map[key] = c + 1; // 1-indexed
    }
  }
  return map;
}

/**
 * シート名をあいまい検索で取得するヘルパー
 */
function getSheetByNameLoose(ss, name) {
  var target = name.toLowerCase().trim();
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getName().toLowerCase().trim() === target) {
      return sheets[i];
    }
  }
  return null;
}

/**
 * ⚡ 高速読み込み用ヘルパー: 空白行を除外し、有効データ行のみを取得する
 */
function getActiveSheetValues(sheet) {
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 1 || lastCol < 1) return [];
  return sheet.getRange(1, 1, lastRow, lastCol).getValues();
}

// ==========================================================================
// Web API (doGet / doPost) 処理
// ==========================================================================

function doGet(e) {
  var callback = e && e.parameter ? e.parameter.callback : null;

  // 🚀 サーバーサイド郵便番号住所検索アクション (CORS完全回避)
  if (e && e.parameter && e.parameter.action === 'postal') {
    var searchZip = e.parameter.zip ? e.parameter.zip.replace(/[^\d]/g, '') : '';
    return handlePostalCodeSearch(searchZip, callback);
  }

  try {
    var token = e && e.parameter ? e.parameter.token : null;
    if (!token) {
      return responseJSON({ success: false, error: 'トークンが指定されていません。' }, callback);
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var tokenSheet = getSheetByNameLoose(ss, 'Tokens');
    if (!tokenSheet) {
      return responseJSON({ success: false, error: 'Tokensシートが見つかりません。「createWeddingSheets」を実行してシートを作成してください。' }, callback);
    }

    var tokenMap = getHeaderColumnMap(tokenSheet);
    var tokenData = getActiveSheetValues(tokenSheet);
    var guestInfo = null;

    var colToken = (tokenMap['token'] || 1) - 1;
    var colLastName = (tokenMap['lastname'] || 2) - 1;
    var colFirstName = (tokenMap['firstname'] || 3) - 1;
    var colKanaLastName = (tokenMap['kanalastname'] || 4) - 1;
    var colKanaFirstName = (tokenMap['kanafirstname'] || 5) - 1;
    var colSide = (tokenMap['side'] || 6) - 1;
    var colAgeCategory = (tokenMap['agecategory'] || 7) - 1;
    var colEmail = (tokenMap['email'] || 8) - 1;
    var colStatus = (tokenMap['status'] || 9) - 1;
    var colPostal = (tokenMap['postalcode'] || 10) - 1;
    var colAddress = (tokenMap['address'] || 11) - 1;
    var colBuilding = (tokenMap['building'] || 12) - 1;
    var colPhone = (tokenMap['phone'] || 13) - 1;

    // ヘッダー行(0)をスキップしてTokens検索
    for (var i = 1; i < tokenData.length; i++) {
      var row = tokenData[i];
      if (row[colToken] && row[colToken].toString().trim() === token.trim()) {
        guestInfo = {
          token: row[colToken].toString().trim(),
          lastName: row[colLastName] ? row[colLastName].toString() : '',
          firstName: row[colFirstName] ? row[colFirstName].toString() : '',
          kanaLastName: row[colKanaLastName] ? row[colKanaLastName].toString() : '',
          kanaFirstName: row[colKanaFirstName] ? row[colKanaFirstName].toString() : '',
          side: row[colSide] ? row[colSide].toString() : '新郎側',
          ageCategory: row[colAgeCategory] ? row[colAgeCategory].toString() : '大人',
          email: row[colEmail] ? row[colEmail].toString() : '',
          status: row[colStatus] ? row[colStatus].toString() : '未回答',
          postalCode: row[colPostal] ? row[colPostal].toString() : '',
          address: row[colAddress] ? row[colAddress].toString() : '',
          building: row[colBuilding] ? row[colBuilding].toString() : '',
          phone: row[colPhone] ? row[colPhone].toString() : ''
        };
        break;
      }
    }

    if (!guestInfo) {
      return responseJSON({ success: false, error: '無効なトークンです。招待状URLをご確認ください。' }, callback);
    }

    // PredefinedProxies シートから一致する代理出席者リストを取得
    var proxySheet = getSheetByNameLoose(ss, 'PredefinedProxies');
    var predefinedProxies = [];

    if (proxySheet) {
      var proxyMap = getHeaderColumnMap(proxySheet);
      var proxyData = getActiveSheetValues(proxySheet);

      var pColProxyId = (proxyMap['proxyid'] || 1) - 1;
      var pColToken = (proxyMap['token'] || 2) - 1;
      var pColLastName = (proxyMap['lastname'] || 3) - 1;
      var pColFirstName = (proxyMap['firstname'] || 4) - 1;
      var pColKanaLastName = (proxyMap['kanalastname'] || 5) - 1;
      var pColKanaFirstName = (proxyMap['kanafirstname'] || 6) - 1;
      var pColSide = (proxyMap['side'] || 7) - 1;
      var pColAgeCategory = (proxyMap['agecategory'] || 8) - 1;
      var pColEmail = (proxyMap['email'] || 9) - 1;
      var pColStatus = (proxyMap['status'] || 10) - 1;
      var pColAllergies = (proxyMap['allergies'] || 11) - 1;
      var pColSameAddress = (proxyMap['sameaddress'] || 12) - 1;
      var pColPostal = (proxyMap['postalcode'] || 13) - 1;
      var pColAddress = (proxyMap['address'] || 14) - 1;
      var pColBuilding = (proxyMap['building'] || 15) - 1;
      var pColPhone = (proxyMap['phone'] || 16) - 1;

      for (var p = 1; p < proxyData.length; p++) {
        var pRow = proxyData[p];
        if (pRow[pColToken] && pRow[pColToken].toString().trim() === token.trim()) {
          predefinedProxies.push({
            proxyId: pRow[pColProxyId] ? pRow[pColProxyId].toString().trim() : ('proxy_' + p),
            token: token.trim(),
            lastName: pRow[pColLastName] ? pRow[pColLastName].toString() : '',
            firstName: pRow[pColFirstName] ? pRow[pColFirstName].toString() : '',
            kanaLastName: pRow[pColKanaLastName] ? pRow[pColKanaLastName].toString() : '',
            kanaFirstName: pRow[pColKanaFirstName] ? pRow[pColKanaFirstName].toString() : '',
            side: pRow[pColSide] ? pRow[pColSide].toString() : '新郎側',
            ageCategory: pRow[pColAgeCategory] ? pRow[pColAgeCategory].toString() : '大人',
            email: pRow[pColEmail] ? pRow[pColEmail].toString() : '',
            status: pRow[pColStatus] ? pRow[pColStatus].toString() : '未回答',
            allergies: pRow[pColAllergies] ? pRow[pColAllergies].toString() : '',
            sameAddress: (pRow[pColSameAddress] ? pRow[pColSameAddress].toString() : 'はい') !== 'いいえ',
            postalCode: pRow[pColPostal] ? pRow[pColPostal].toString() : '',
            address: pRow[pColAddress] ? pRow[pColAddress].toString() : '',
            building: pRow[pColBuilding] ? pRow[pColBuilding].toString() : '',
            phone: pRow[pColPhone] ? pRow[pColPhone].toString() : '',
            fullName: (pRow[pColLastName] ? pRow[pColLastName].toString() : '') + ' ' + (pRow[pColFirstName] ? pRow[pColFirstName].toString() : '')
          });
        }
      }
    }

    // 過去の回答データを取得（もしあれば）
    var responseSheet = getSheetByNameLoose(ss, 'Responses');
    var existingResponse = null;

    if (responseSheet) {
      var respData = getActiveSheetValues(responseSheet);
      for (var j = respData.length - 1; j >= 1; j--) {
        var rRow = respData[j];
        if (rRow[1] && rRow[1].toString().trim() === token.trim()) {
          existingResponse = {
            timestamp: rRow[0],
            attendance: rRow[2] ? rRow[2].toString() : '',
            lastName: rRow[3] ? rRow[3].toString() : '',
            firstName: rRow[4] ? rRow[4].toString() : '',
            kanaLastName: rRow[5] ? rRow[5].toString() : '',
            kanaFirstName: rRow[6] ? rRow[6].toString() : '',
            side: rRow[7] ? rRow[7].toString() : '',
            ageCategory: rRow[8] ? rRow[8].toString() : '',
            email: rRow[9] ? rRow[9].toString() : '',
            postalCode: rRow[10] ? rRow[10].toString() : '',
            address: rRow[11] ? rRow[11].toString() : '',
            building: rRow[12] ? rRow[12].toString() : '',
            phone: rRow[13] ? rRow[13].toString() : '',
            allergies: rRow[14] ? rRow[14].toString() : '',
            predefinedProxiesResponse: rRow[15] ? rRow[15].toString() : '',
            additionalProxies: rRow[16] ? rRow[16].toString() : '',
            message: rRow[17] ? rRow[17].toString() : ''
          };
          break;
        }
      }
    }

    return responseJSON({
      success: true,
      data: {
        guest: guestInfo,
        predefinedProxies: predefinedProxies,
        existingResponse: existingResponse
      }
    }, callback);

  } catch (err) {
    return responseJSON({ success: false, error: 'サーバー処理中にエラーが発生しました: ' + err.toString() }, callback);
  }
}

/**
 * 🚀 Googleクラウドサーバー側で実行する郵便番号住所自動検索関数 (CORSブロック100%回避)
 */
function handlePostalCodeSearch(zip, callback) {
  if (!zip || zip.length !== 7) {
    return responseJSON({ success: false, error: '郵便番号は7桁の数字で入力してください。' }, callback);
  }

  // 1. zipcloud API 検索 (サーバー間通信)
  try {
    var response = UrlFetchApp.fetch('https://zipcloud.ibsnet.co.jp/api/search?zip=' + zip, { muteHttpExceptions: true });
    if (response.getResponseCode() === 200) {
      var data = JSON.parse(response.getContentText());
      if (data && data.status === 200 && data.results && data.results.length > 0) {
        var res = data.results[0];
        var fullAddr = (res.address1 || '') + (res.address2 || '') + (res.address3 || '');
        return responseJSON({ success: true, address: fullAddr }, callback);
      }
    }
  } catch (e1) {
    Logger.log('zipcloud UrlFetchApp failed: ' + e1.toString());
  }

  // 2. ZipAddress API フォールバック (サーバー間通信)
  try {
    var response2 = UrlFetchApp.fetch('https://api.zipaddress.net/?zip=' + zip, { muteHttpExceptions: true });
    if (response2.getResponseCode() === 200) {
      var data2 = JSON.parse(response2.getContentText());
      if (data2 && data2.code === 200 && data2.data && data2.data.fullAddress) {
        return responseJSON({ success: true, address: data2.data.fullAddress }, callback);
      }
    }
  } catch (e2) {
    Logger.log('ZipAddress UrlFetchApp failed: ' + e2.toString());
  }

  return responseJSON({ success: false, error: '該当する住所が見つかりませんでした。' }, callback);
}

function doPost(e) {
  try {
    var contents = e.postData ? e.postData.contents : null;
    if (!contents) {
      return responseJSON({ success: false, error: '送信データがありません。' });
    }

    var payload = JSON.parse(contents);
    var token = payload.token;

    if (!token) {
      return responseJSON({ success: false, error: 'トークンがありません。' });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var tokenSheet = getSheetByNameLoose(ss, 'Tokens');
    var responseSheet = getSheetByNameLoose(ss, 'Responses');

    if (!tokenSheet || !responseSheet) {
      return responseJSON({ success: false, error: '必要なシート（TokensまたはResponses）が見つかりません。' });
    }

    // トークンの有効性確認 & Tokensシートの直接更新
    var tokenMap = getHeaderColumnMap(tokenSheet);
    var tokenData = getActiveSheetValues(tokenSheet);
    var colToken = (tokenMap['token'] || 1) - 1;
    var tokenRowIndex = -1;

    for (var i = 1; i < tokenData.length; i++) {
      if (tokenData[i][colToken] && tokenData[i][colToken].toString().trim() === token.trim()) {
        tokenRowIndex = i + 1; // 1-indexed
        break;
      }
    }

    if (tokenRowIndex === -1) {
      return responseJSON({ success: false, error: '無効なトークンです。' });
    }

    // 送信パラメーター
    var timestamp = new Date();
    var attendance = payload.attendance || '';
    var lastName = payload.lastName || '';
    var firstName = payload.firstName || '';
    var kanaLastName = payload.kanaLastName || '';
    var kanaFirstName = payload.kanaFirstName || '';
    var side = payload.side || '';
    var ageCategory = payload.ageCategory || '';
    var email = payload.email || '';
    var postalCode = payload.postalCode || '';
    var address = payload.address || '';
    var building = payload.building || '';
    var phone = payload.phone || '';
    var allergies = payload.allergies || '';

    // 生のデータオブジェクト配列を保持
    var rawPredefinedProxiesObj = payload.predefinedProxiesResponse;
    var predefinedProxiesFormattedText = formatPredefinedProxiesResponse(rawPredefinedProxiesObj);
    var additionalProxies = formatAdditionalProxies(payload.additionalProxies);
    var message = payload.message || '';

    // Responses シート（履歴）への追加
    var proxiesResponseToStore = typeof rawPredefinedProxiesObj === 'object'
      ? JSON.stringify(rawPredefinedProxiesObj)
      : predefinedProxiesFormattedText;

    responseSheet.appendRow([
      timestamp,
      token,
      attendance,
      lastName,
      firstName,
      kanaLastName,
      kanaFirstName,
      side,
      ageCategory,
      email,
      postalCode,
      address,
      building,
      phone,
      allergies,
      proxiesResponseToStore,
      additionalProxies,
      message
    ]);

    // 🚀 Tokens シート（主ゲストマスター）を動的ヘッダー列指定で直接更新！
    if (tokenMap['lastname'] && lastName) tokenSheet.getRange(tokenRowIndex, tokenMap['lastname']).setValue(lastName);
    if (tokenMap['firstname'] && firstName) tokenSheet.getRange(tokenRowIndex, tokenMap['firstname']).setValue(firstName);
    if (tokenMap['kanalastname'] && kanaLastName) tokenSheet.getRange(tokenRowIndex, tokenMap['kanalastname']).setValue(kanaLastName);
    if (tokenMap['kanafirstname'] && kanaFirstName) tokenSheet.getRange(tokenRowIndex, tokenMap['kanafirstname']).setValue(kanaFirstName);
    if (tokenMap['side'] && side) tokenSheet.getRange(tokenRowIndex, tokenMap['side']).setValue(side);
    if (tokenMap['agecategory'] && ageCategory) tokenSheet.getRange(tokenRowIndex, tokenMap['agecategory']).setValue(ageCategory);
    if (tokenMap['email'] && email) tokenSheet.getRange(tokenRowIndex, tokenMap['email']).setValue(email);
    if (tokenMap['status']) tokenSheet.getRange(tokenRowIndex, tokenMap['status']).setValue(attendance);
    if (tokenMap['postalcode']) tokenSheet.getRange(tokenRowIndex, tokenMap['postalcode']).setValue(postalCode);
    if (tokenMap['address']) tokenSheet.getRange(tokenRowIndex, tokenMap['address']).setValue(address);
    if (tokenMap['building']) tokenSheet.getRange(tokenRowIndex, tokenMap['building']).setValue(building);
    if (tokenMap['phone']) tokenSheet.getRange(tokenRowIndex, tokenMap['phone']).setValue(phone);

    // 🚀 PredefinedProxies シート（同伴者マスター）の該当行を動的ヘッダー列指定で直接更新！
    try {
      updatePredefinedProxiesSheet(ss, token, rawPredefinedProxiesObj, payload);
    } catch (proxyErr) {
      Logger.log('updatePredefinedProxiesSheet error: ' + proxyErr.toString());
    }

    // スプレッドシートへの書込み内容を確定
    SpreadsheetApp.flush();

    // 📧 回答受付完了の自動確認メール送信！
    var emailResult = 'Not attempted';
    try {
      emailResult = sendConfirmationEmail(payload);
    } catch (emailErr) {
      Logger.log('sendConfirmationEmail error: ' + emailErr.toString());
      emailResult = 'Error: ' + emailErr.toString();
    }

    return responseJSON({
      success: true,
      message: 'ご回答ありがとうございます。回答を送信・保存いたしました。',
      emailStatus: emailResult
    });

  } catch (err) {
    return responseJSON({ success: false, error: '保存処理中にエラーが発生しました: ' + err.toString() });
  }
}

/**
 * 🚀 回答登録完了時の自動確認メール送信処理 (MailApp.sendEmail(sendto, title, body) 利用)
 */
function sendConfirmationEmail(payload) {
  if (!payload || !payload.email || !payload.email.trim()) return 'No recipient email specified';

  var sendto = payload.email.trim();
  var attendanceStatus = payload.attendance || '未回答';
  var lastName = payload.lastName || '';
  var firstName = payload.firstName || '';
  var guestName = (lastName + ' ' + firstName).trim();

  var groomName = '新郎 太郎';
  var brideName = '新婦 花子';
  var weddingDate = '2026年10月10日（土）';
  var receptionTime = '開場 11:30 / 挙式 12:00 / 披露宴 13:00';
  var venueName = 'グランドホテル東京 鳳凰の間';
  var venueAddress = '東京都千代田区1-1-1';

  var title = '【ご回答完了】結婚式のご案内 - ' + groomName + ' & ' + brideName;

  var body = guestName + ' 様\n\n' +
    'このたびはWeb招待状のご回答をいただき、誠にありがとうございます。\n' +
    '送信いただきましたご回答内容を下記の通りお受けいたしました。\n\n' +
    '--------------------------------------------------\n' +
    '【ご回答内容】\n' +
    '・ご出欠：' + attendanceStatus + '\n' +
    '・お名前：' + guestName + '（' + (payload.kanaLastName || '') + ' ' + (payload.kanaFirstName || '') + ' 様）\n';

  if (attendanceStatus === '出席') {
    body += '・メールアドレス：' + sendto + '\n' +
      '・ご住所：〒' + (payload.postalCode || '') + ' ' + (payload.address || '') + ' ' + (payload.building || '') + '\n' +
      '・お電話番号：' + (payload.phone || '') + '\n';

    if (payload.allergies) {
      body += '・アレルギー等：' + payload.allergies + '\n';
    }

    var formattedProxies = formatPredefinedProxiesResponse(payload.predefinedProxiesResponse);
    if (formattedProxies) {
      body += '\n【ご同伴者様】\n' + formattedProxies + '\n';
    }
  }

  if (payload.message) {
    body += '\n【メッセージ】\n' + payload.message + '\n';
  }

  body += '\n--------------------------------------------------\n' +
    '【挙式・披露宴のご案内】\n' +
    '・日時：' + weddingDate + '\n' +
    '・時間：' + receptionTime + '\n' +
    '・場所：' + venueName + '\n' +
    '・住所：' + venueAddress + '\n' +
    '--------------------------------------------------\n\n' +
    '皆様にお会いできますことを、心より楽しみにしております。\n\n' +
    groomName + ' & ' + brideName;

  // ご指示の通り MailApp.sendEmail(sendto, title, body) を直接使用
  try {
    MailApp.sendEmail(sendto, title, body);
    Logger.log('MailApp.sendEmail success: ' + sendto);
    return 'Sent via MailApp to ' + sendto;
  } catch (err) {
    Logger.log('MailApp.sendEmail error: ' + err.toString());
    try {
      GmailApp.sendEmail(sendto, title, body);
      return 'Sent via GmailApp to ' + sendto;
    } catch (err2) {
      return 'Failed: ' + err2.toString();
    }
  }
}

/**
 * 🚀 PredefinedProxies シートの該当行をユーザー入力内容でダイレクト更新する関数
 */
function updatePredefinedProxiesSheet(ss, token, proxiesResponse, mainPayload) {
  if (!proxiesResponse) return;

  var proxySheet = getSheetByNameLoose(ss, 'PredefinedProxies');
  if (!proxySheet) return;

  var proxiesList = proxiesResponse;
  if (typeof proxiesResponse === 'string') {
    try {
      proxiesList = JSON.parse(proxiesResponse);
    } catch (e) {
      return;
    }
  }

  if (!Array.isArray(proxiesList)) return;

  var proxyMap = getHeaderColumnMap(proxySheet);
  var proxyData = getActiveSheetValues(proxySheet);

  var colProxyId = (proxyMap['proxyid'] || 1) - 1;
  var colToken = (proxyMap['token'] || 2) - 1;
  var colLastName = (proxyMap['lastname'] || 3) - 1;
  var colFirstName = (proxyMap['firstname'] || 4) - 1;

  for (var i = 0; i < proxiesList.length; i++) {
    var item = proxiesList[i];
    if (!item) continue;

    var targetProxyId = item.proxyId ? item.proxyId.toString().trim() : '';
    var targetLastName = item.lastName ? item.lastName.toString().trim() : '';
    var targetFirstName = item.firstName ? item.firstName.toString().trim() : '';

    var targetRowNum = -1;

    // 1. まず ProxyId で精密マッチング検索 (A列)
    if (targetProxyId) {
      for (var p = 1; p < proxyData.length; p++) {
        var rowProxyId = proxyData[p][colProxyId] ? proxyData[p][colProxyId].toString().trim() : '';
        if (rowProxyId && rowProxyId === targetProxyId) {
          targetRowNum = p + 1;
          break;
        }
      }
    }

    // 2. もし ProxyId でマッチしない場合、Token + 氏名でフォールバックマッチング
    if (targetRowNum === -1 && token) {
      for (var p2 = 1; p2 < proxyData.length; p2++) {
        var rowToken = proxyData[p2][colToken] ? proxyData[p2][colToken].toString().trim() : '';
        var rowLn = proxyData[p2][colLastName] ? proxyData[p2][colLastName].toString().trim() : '';
        var rowFn = proxyData[p2][colFirstName] ? proxyData[p2][colFirstName].toString().trim() : '';

        if (rowToken === token.trim() && (rowLn === targetLastName || rowFn === targetFirstName)) {
          targetRowNum = p2 + 1;
          break;
        }
      }
    }

    if (targetRowNum !== -1) {
      // 動的ヘッダー列番号に基づいてセルをダイレクト書き込み
      if (proxyMap['lastname'] && item.lastName !== undefined) proxySheet.getRange(targetRowNum, proxyMap['lastname']).setValue(item.lastName);
      if (proxyMap['firstname'] && item.firstName !== undefined) proxySheet.getRange(targetRowNum, proxyMap['firstname']).setValue(item.firstName);
      if (proxyMap['kanalastname'] && item.kanaLastName !== undefined) proxySheet.getRange(targetRowNum, proxyMap['kanalastname']).setValue(item.kanaLastName);
      if (proxyMap['kanafirstname'] && item.kanaFirstName !== undefined) proxySheet.getRange(targetRowNum, proxyMap['kanafirstname']).setValue(item.kanaFirstName);
      if (proxyMap['agecategory'] && item.ageCategory !== undefined) proxySheet.getRange(targetRowNum, proxyMap['agecategory']).setValue(item.ageCategory);
      if (proxyMap['status']) proxySheet.getRange(targetRowNum, proxyMap['status']).setValue(item.attending ? '出席' : '欠席');
      if (proxyMap['allergies'] && item.allergies !== undefined) proxySheet.getRange(targetRowNum, proxyMap['allergies']).setValue(item.allergies);

      var isSame = item.sameAddress !== false;
      if (proxyMap['sameaddress']) proxySheet.getRange(targetRowNum, proxyMap['sameaddress']).setValue(isSame ? 'はい' : 'いいえ');

      if (isSame) {
        if (mainPayload) {
          if (proxyMap['postalcode']) proxySheet.getRange(targetRowNum, proxyMap['postalcode']).setValue(mainPayload.postalCode || '');
          if (proxyMap['address']) proxySheet.getRange(targetRowNum, proxyMap['address']).setValue(mainPayload.address || '');
          if (proxyMap['building']) proxySheet.getRange(targetRowNum, proxyMap['building']).setValue(mainPayload.building || '');
          if (proxyMap['phone']) proxySheet.getRange(targetRowNum, proxyMap['phone']).setValue(mainPayload.phone || '');
        }
      } else {
        if (proxyMap['postalcode'] && item.postalCode !== undefined) proxySheet.getRange(targetRowNum, proxyMap['postalcode']).setValue(item.postalCode);
        if (proxyMap['address'] && item.address !== undefined) proxySheet.getRange(targetRowNum, proxyMap['address']).setValue(item.address);
        if (proxyMap['building'] && item.building !== undefined) proxySheet.getRange(targetRowNum, proxyMap['building']).setValue(item.building);
        if (proxyMap['phone'] && item.phone !== undefined) proxySheet.getRange(targetRowNum, proxyMap['phone']).setValue(item.phone);
      }
    } else {
      // 🚀 新規追加の同伴者様の場合は PredefinedProxies シートへ行追加！
      var maxCol = proxySheet.getLastColumn() || 16;
      var newProxyRow = [];
      for (var c = 0; c < maxCol; c++) {
        newProxyRow.push('');
      }

      var genProxyId = targetProxyId || ('proxy_dyn_' + Date.now() + '_' + i);

      if (proxyMap['proxyid']) newProxyRow[proxyMap['proxyid'] - 1] = genProxyId;
      if (proxyMap['token']) newProxyRow[proxyMap['token'] - 1] = token;
      if (proxyMap['lastname']) newProxyRow[proxyMap['lastname'] - 1] = item.lastName || '';
      if (proxyMap['firstname']) newProxyRow[proxyMap['firstname'] - 1] = item.firstName || '';
      if (proxyMap['kanalastname']) newProxyRow[proxyMap['kanalastname'] - 1] = item.kanaLastName || '';
      if (proxyMap['kanafirstname']) newProxyRow[proxyMap['kanafirstname'] - 1] = item.kanaFirstName || '';
      if (proxyMap['side']) newProxyRow[proxyMap['side'] - 1] = mainPayload ? (mainPayload.side || '新郎側') : '新郎側';
      if (proxyMap['agecategory']) newProxyRow[proxyMap['agecategory'] - 1] = item.ageCategory || '大人';
      if (proxyMap['status']) newProxyRow[proxyMap['status'] - 1] = item.attending ? '出席' : '欠席';
      if (proxyMap['allergies']) newProxyRow[proxyMap['allergies'] - 1] = item.allergies || '';

      var isSameNew = item.sameAddress !== false;
      if (proxyMap['sameaddress']) newProxyRow[proxyMap['sameaddress'] - 1] = isSameNew ? 'はい' : 'いいえ';

      if (isSameNew && mainPayload) {
        if (proxyMap['postalcode']) newProxyRow[proxyMap['postalcode'] - 1] = mainPayload.postalCode || '';
        if (proxyMap['address']) newProxyRow[proxyMap['address'] - 1] = mainPayload.address || '';
        if (proxyMap['building']) newProxyRow[proxyMap['building'] - 1] = mainPayload.building || '';
        if (proxyMap['phone']) newProxyRow[proxyMap['phone'] - 1] = mainPayload.phone || '';
      } else {
        if (proxyMap['postalcode']) newProxyRow[proxyMap['postalcode'] - 1] = item.postalCode || '';
        if (proxyMap['address']) newProxyRow[proxyMap['address'] - 1] = item.address || '';
        if (proxyMap['building']) newProxyRow[proxyMap['building'] - 1] = item.building || '';
        if (proxyMap['phone']) newProxyRow[proxyMap['phone'] - 1] = item.phone || '';
      }

      proxySheet.appendRow(newProxyRow);
    }
  }
}

/**
 * 事前定義代理出席者の回答データをスプレッドシート閲覧用に整列化する関数
 */
function formatPredefinedProxiesResponse(proxiesRaw) {
  if (!proxiesRaw) return '';
  if (typeof proxiesRaw === 'string') {
    try {
      var parsed = JSON.parse(proxiesRaw);
      if (Array.isArray(parsed)) proxiesRaw = parsed;
    } catch (e) {
      return proxiesRaw;
    }
  }

  if (Array.isArray(proxiesRaw)) {
    return proxiesRaw.map(function(p) {
      if (typeof p === 'string') return p;
      var status = p.attending ? '出席' : '欠席';
      var name = (p.lastName || '') + ' ' + (p.firstName || '');
      var kana = (p.kanaLastName || '') + ' ' + (p.kanaFirstName || '');
      var details = [status, p.ageCategory || '大人'];
      if (kana.trim().length > 0) details.push('ふりがな: ' + kana.trim());
      if (p.allergies) details.push('アレルギー: ' + p.allergies);
      if (p.sameAddress !== undefined) details.push(p.sameAddress ? '住所: 同一' : '住所: 個別');
      return name.trim() + ' (' + details.join(', ') + ')';
    }).join('\n');
  }

  return JSON.stringify(proxiesRaw);
}

/**
 * 追加同伴者オブジェクトをスプレッドシート閲覧用に綺麗に整列化する関数
 */
function formatAdditionalProxies(addProxiesRaw) {
  if (!addProxiesRaw) return '';
  if (typeof addProxiesRaw === 'object') {
    return JSON.stringify(addProxiesRaw);
  }
  try {
    var parsed = JSON.parse(addProxiesRaw);
    if (Array.isArray(parsed)) {
      return parsed.map(function(p) {
        var name = (p.lastName || '') + ' ' + (p.firstName || '');
        var kana = (p.kanaLastName || '') + ' ' + (p.kanaFirstName || '');
        var details = [p.ageCategory || '大人'];
        if (kana.trim().length > 0) details.push('ふりがな: ' + kana.trim());
        if (p.allergies) details.push('アレルギー: ' + p.allergies);
        return name.trim() + ' (' + details.join(', ') + ')';
      }).join('\n');
    }
  } catch (e) {
    // 通常文字列の場合はそのまま返却
  }
  return addProxiesRaw;
}

/**
 * JSONレスポンスの出力処理 (JSONP対応)
 */
function responseJSON(obj, callback) {
  var jsonStr = JSON.stringify(obj);
  if (callback) {
    var output = ContentService.createTextOutput(callback + '(' + jsonStr + ')');
    output.setMimeType(ContentService.MimeType.JAVASCRIPT);
    return output;
  }
  var output = ContentService.createTextOutput(jsonStr);
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * 結婚式Web招待状 Google Apps Script (GAS) バックエンド処理
 *
 * 【スプレッドシートの構造】
 * 1. シート名: "Tokens" （招待主ゲストデータ）
 *    列構成: A:Token, B:LastName, C:FirstName, D:KanaLastName, E:KanaFirstName, F:Side, G:AgeCategory, H:Email, I:Status
 *
 * 2. シート名: "PredefinedProxies" （事前定義代理出席者テーブル）
 *    列構成: A:Token, B:LastName, C:FirstName, D:KanaLastName, E:KanaFirstName, F:Side, G:AgeCategory, H:Email
 *
 * 3. シート名: "Responses" （回答データ保存用）
 *    列構成: A:Timestamp, B:Token, C:Attendance, D:LastName, E:FirstName, F:KanaLastName, G:KanaFirstName, H:Side, I:AgeCategory, J:Email, K:PostalCode, L:Address, M:Building, N:Phone, O:Allergies, P:PredefinedProxiesResponse, Q:AdditionalProxies, R:Message
 */

/**
 * 🚀 スプレッドシート自動初期化・シート生成関数
 *
 * Apps Script エディタ上部の関数選択ドロップダウンで「createWeddingSheets」を選択し、
 * 「実行」ボタンを押すと、自動的に「Tokens」「PredefinedProxies」「Responses」の3シートが作成・整形されます。
 */
function createWeddingSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Tokens シートの生成・初期化
  var tokensSheet = ss.getSheetByName('Tokens');
  if (!tokensSheet) {
    tokensSheet = ss.insertSheet('Tokens');
  } else {
    tokensSheet.clear();
  }
  var tokensHeaders = [
    'Token', 'LastName', 'FirstName', 'KanaLastName', 'KanaFirstName',
    'Side', 'AgeCategory', 'Email', 'Status'
  ];
  tokensSheet.appendRow(tokensHeaders);
  formatHeaderRow(tokensSheet, tokensHeaders.length, '#3a506b');

  // サンプル主ゲストデータ
  tokensSheet.appendRow([
    'sample-guest-01', '山田', '太郎', 'やまだ', 'たろう',
    '新郎側', '大人', 'yamada@example.com', '未回答'
  ]);
  tokensSheet.appendRow([
    'sample-guest-02', '佐藤', '花子', 'さとう', 'はなこ',
    '新婦側', '大人', 'sato@example.com', '未回答'
  ]);

  // 2. PredefinedProxies シートの生成・初期化
  var proxySheet = ss.getSheetByName('PredefinedProxies');
  if (!proxySheet) {
    proxySheet = ss.insertSheet('PredefinedProxies');
  } else {
    proxySheet.clear();
  }
  var proxyHeaders = [
    'Token', 'LastName', 'FirstName', 'KanaLastName', 'KanaFirstName',
    'Side', 'AgeCategory', 'Email'
  ];
  proxySheet.appendRow(proxyHeaders);
  formatHeaderRow(proxySheet, proxyHeaders.length, '#5bc0be');

  // サンプル事前定義代理出席者データ
  proxySheet.appendRow([
    'sample-guest-01', '山田', '花子', 'やまだ', 'はなこ',
    '新郎側', '大人', 'hanako@example.com'
  ]);
  proxySheet.appendRow([
    'sample-guest-01', '山田', '一郎', 'やまだ', 'いちろう',
    '新郎側', '子供', ''
  ]);

  // 3. Responses シートの生成・初期化
  var responseSheet = ss.getSheetByName('Responses');
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

  // 不要なデフォルトシートの削除（必要に応じて）
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

// ==========================================================================
// Web API (doGet / doPost) 処理
// ==========================================================================

function doGet(e) {
  try {
    var token = e.parameter ? e.parameter.token : null;
    if (!token) {
      return responseJSON({ success: false, error: 'トークンが指定されていません。' });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var tokenSheet = ss.getSheetByName('Tokens');
    if (!tokenSheet) {
      return responseJSON({ success: false, error: 'Tokensシートが見つかりません。' });
    }

    var tokenData = tokenSheet.getDataRange().getValues();
    var guestInfo = null;

    // ヘッダー行(0)をスキップしてTokens検索
    for (var i = 1; i < tokenData.length; i++) {
      var row = tokenData[i];
      if (row[0] && row[0].toString().trim() === token.trim()) {
        guestInfo = {
          token: row[0].toString().trim(),
          lastName: row[1] ? row[1].toString() : '',
          firstName: row[2] ? row[2].toString() : '',
          kanaLastName: row[3] ? row[3].toString() : '',
          kanaFirstName: row[4] ? row[4].toString() : '',
          side: row[5] ? row[5].toString() : '新郎側',
          ageCategory: row[6] ? row[6].toString() : '大人',
          email: row[7] ? row[7].toString() : '',
          status: row[8] ? row[8].toString() : '未回答'
        };
        break;
      }
    }

    if (!guestInfo) {
      return responseJSON({ success: false, error: '無効なトークンです。招待状URLをご確認ください。' });
    }

    // PredefinedProxies シートから一致する代理出席者リストを取得
    var proxySheet = ss.getSheetByName('PredefinedProxies');
    var predefinedProxies = [];

    if (proxySheet) {
      var proxyData = proxySheet.getDataRange().getValues();
      for (var p = 1; p < proxyData.length; p++) {
        var pRow = proxyData[p];
        if (pRow[0] && pRow[0].toString().trim() === token.trim()) {
          predefinedProxies.push({
            token: token.trim(),
            lastName: pRow[1] ? pRow[1].toString() : '',
            firstName: pRow[2] ? pRow[2].toString() : '',
            kanaLastName: pRow[3] ? pRow[3].toString() : '',
            kanaFirstName: pRow[4] ? pRow[4].toString() : '',
            side: pRow[5] ? pRow[5].toString() : '新郎側',
            ageCategory: pRow[6] ? pRow[6].toString() : '大人',
            email: pRow[7] ? pRow[7].toString() : '',
            fullName: (pRow[1] ? pRow[1].toString() : '') + ' ' + (pRow[2] ? pRow[2].toString() : '')
          });
        }
      }
    }

    // 過去の回答データを取得（もしあれば）
    var responseSheet = ss.getSheetByName('Responses');
    var existingResponse = null;

    if (responseSheet) {
      var respData = responseSheet.getDataRange().getValues();
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
          break; // 最新の回答を取得
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
    });

  } catch (err) {
    return responseJSON({ success: false, error: 'サーバー処理中にエラーが発生しました: ' + err.toString() });
  }
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
    var tokenSheet = ss.getSheetByName('Tokens');
    var responseSheet = ss.getSheetByName('Responses');

    if (!tokenSheet || !responseSheet) {
      return responseJSON({ success: false, error: '必要なシート（TokensまたはResponses）が見つかりません。' });
    }

    // トークンの有効性確認 & Status更新
    var tokenData = tokenSheet.getDataRange().getValues();
    var tokenRowIndex = -1;

    for (var i = 1; i < tokenData.length; i++) {
      if (tokenData[i][0] && tokenData[i][0].toString().trim() === token.trim()) {
        tokenRowIndex = i + 1; // 1-indexed
        break;
      }
    }

    if (tokenRowIndex === -1) {
      return responseJSON({ success: false, error: '無効なトークンです。' });
    }

    // Responsesシートに保存する行の構築
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
    var predefinedProxiesResponse = typeof payload.predefinedProxiesResponse === 'object'
      ? JSON.stringify(payload.predefinedProxiesResponse)
      : (payload.predefinedProxiesResponse || '');
    var additionalProxies = formatAdditionalProxies(payload.additionalProxies);
    var message = payload.message || '';

    // Responses シートへの追加
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
      predefinedProxiesResponse,
      additionalProxies,
      message
    ]);

    // Tokens シートの Status (I列: 9番目の列) を更新
    tokenSheet.getRange(tokenRowIndex, 9).setValue(attendance);

    return responseJSON({
      success: true,
      message: 'ご回答ありがとうございます。回答を送信・保存いたしました。'
    });

  } catch (err) {
    return responseJSON({ success: false, error: '保存処理中にエラーが発生しました: ' + err.toString() });
  }
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
 * JSONレスポンスの出力処理
 */
function responseJSON(obj) {
  var output = ContentService.createTextOutput(JSON.stringify(obj));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

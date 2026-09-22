/**
 * 結婚式Web招待状 メインアプリケーションロジック
 */

document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const loadingContainer = document.getElementById("loadingContainer");
  const errorCard = document.getElementById("errorCard");
  const errorMessageText = document.getElementById("errorMessageText");
  const successCard = document.getElementById("successCard");
  const submittedSummaryBox = document.getElementById("submittedSummaryBox");
  const rsvpForm = document.getElementById("rsvpForm");

  // Sections
  const guestInfoSection = document.getElementById("guestInfoSection");
  const guestMetaFields = document.getElementById("guestMetaFields");
  const contactSection = document.getElementById("contactSection");
  const allergySection = document.getElementById("allergySection");
  const proxySection = document.getElementById("proxySection");
  const predefinedProxyWrapper = document.getElementById("predefinedProxyWrapper");
  const predefinedProxyContainer = document.getElementById("predefinedProxyContainer");
  const dynamicProxyList = document.getElementById("dynamicProxyList");

  // Inputs
  const lastNameInput = document.getElementById("lastName");
  const firstNameInput = document.getElementById("firstName");
  const kanaLastNameInput = document.getElementById("kanaLastName");
  const kanaFirstNameInput = document.getElementById("kanaFirstName");
  const ageCategorySelect = document.getElementById("ageCategory");
  const emailInput = document.getElementById("email");
  const postalCodeInput = document.getElementById("postalCode");
  const addressInput = document.getElementById("address");
  const buildingInput = document.getElementById("building");
  const phoneInput = document.getElementById("phone");
  const allergiesInput = document.getElementById("allergies");
  const messageInput = document.getElementById("message");

  // Buttons & Modal
  const btnSearchPostal = document.getElementById("btnSearchPostal");
  const btnAddProxy = document.getElementById("btnAddProxy");
  const btnConfirm = document.getElementById("btnConfirm");
  const confirmModal = document.getElementById("confirmModal");
  const modalSummaryList = document.getElementById("modalSummaryList");
  const btnModalBack = document.getElementById("btnModalBack");
  const btnModalSubmit = document.getElementById("btnModalSubmit");

  let currentToken = "";
  let guestData = null;
  let predefinedProxiesList = [];
  let proxyCardIndex = 0;

  // 1. CONFIG情報でヘッダーテキストを初期化
  initHeaderInfo();

  // 2. URLパラメータからトークンを取得
  currentToken = getTokenFromURL();

  if (!currentToken) {
    showError("招待状URLにトークンが含まれていません。お送りしたURLを再度ご確認ください。");
    return;
  }

  // 3. GAS APIからトークンに紐づく招待客情報を取得
  fetchGuestData(currentToken);

  // --------------------------------------------------------------------------
  // イベントリスナーの登録
  // --------------------------------------------------------------------------

  // 出欠ラジオボタン切り替え
  document.querySelectorAll('input[name="attendance"]').forEach((radio) => {
    radio.addEventListener("change", (e) => {
      toggleAttendanceSections(e.target.value);
    });
  });

  // 郵便番号自動入力ボタン
  btnSearchPostal.addEventListener("click", searchAddressFromPostalCode);

  // 同伴者アコーディオンカード追加ボタン
  btnAddProxy.addEventListener("click", () => {
    addProxyAccordionCard();
  });

  // 送信内容確認ボタン
  btnConfirm.addEventListener("click", handleConfirmClick);

  // モーダル戻るボタン
  btnModalBack.addEventListener("click", () => {
    confirmModal.classList.remove("active");
  });

  // モーダル送信実行ボタン
  btnModalSubmit.addEventListener("click", handleFormSubmit);


  // ==========================================================================
  // 関数定義
  // ==========================================================================

  /**
   * ヘッダーの式情報の自動挿入
   */
  function initHeaderInfo() {
    if (typeof CONFIG === "undefined") return;

    if (CONFIG.GROOM_NAME && CONFIG.BRIDE_NAME) {
      const coupleElem = document.getElementById("coupleNamesDisplay");
      if (coupleElem) coupleElem.textContent = `${CONFIG.GROOM_NAME} & ${CONFIG.BRIDE_NAME}`;
    }
    if (CONFIG.WEDDING_DATE) {
      const dateElem = document.getElementById("weddingDateDisplay");
      if (dateElem) dateElem.textContent = CONFIG.WEDDING_DATE;
    }
    if (CONFIG.RECEPTION_TIME) {
      const timeElem = document.getElementById("receptionTimeDisplay");
      if (timeElem) timeElem.textContent = CONFIG.RECEPTION_TIME;
    }
    if (CONFIG.VENUE_NAME) {
      const venueElem = document.getElementById("venueNameDisplay");
      if (venueElem) venueElem.textContent = CONFIG.VENUE_NAME;
    }
    if (CONFIG.VENUE_ADDRESS) {
      const addrElem = document.getElementById("venueAddressDisplay");
      if (addrElem) addrElem.textContent = CONFIG.VENUE_ADDRESS;
    }
    if (CONFIG.RESPONSE_DEADLINE) {
      const deadlineElem = document.getElementById("responseDeadlineDisplay");
      if (deadlineElem) deadlineElem.textContent = `${CONFIG.RESPONSE_DEADLINE} まで`;
    }
  }

  /**
   * URLからトークンを取得 (クエリパラメータ `?token=xxx` または ハッシュ `#token=xxx`)
   */
  function getTokenFromURL() {
    const searchParams = new URLSearchParams(window.location.search);
    let token = searchParams.get("token");

    if (!token && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      token = hashParams.get("token");
    }

    return token ? token.trim() : "";
  }

  /**
   * GAS APIよりデータ取得
   */
  async function fetchGuestData(token) {
    if (!CONFIG || !CONFIG.GAS_WEB_APP_URL || CONFIG.GAS_WEB_APP_URL.includes("YOUR_GAS_WEB_APP_URL")) {
      showError("設定ファイル (js/config.js) に GAS の Web App URL が設定されていません。管理者にお問い合わせください。");
      return;
    }

    try {
      const url = `${CONFIG.GAS_WEB_APP_URL}?token=${encodeURIComponent(token)}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        showError(result.error || "データ取得に失敗しました。無効なトークンです。");
        return;
      }

      guestData = result.data.guest;
      predefinedProxiesList = result.data.predefinedProxies || [];
      const existingResponse = result.data.existingResponse;

      // 取得したスプレッドシートデータでフォームを初期化
      populateForm(guestData, predefinedProxiesList, existingResponse);

      // 画面表示切り替え
      loadingContainer.classList.add("hidden");
      rsvpForm.classList.remove("hidden");

    } catch (err) {
      console.error("Fetch error:", err);
      showError("サーバーとの通信中にエラーが発生いたしました。時間をおいて再度お試しください。");
    }
  }

  /**
   * フォームへのデータ反映・初期描画
   */
  function populateForm(guest, proxies, existingResp) {
    // 氏名・フリガナ (Tokensシートの事前定義値)
    lastNameInput.value = guest.lastName || "";
    firstNameInput.value = guest.firstName || "";
    kanaLastNameInput.value = guest.kanaLastName || "";
    kanaFirstNameInput.value = guest.kanaFirstName || "";

    // 新郎側/新婦側
    const sideValue = guest.side || "新郎側";
    const sideRadio = document.querySelector(`input[name="side"][value="${sideValue}"]`);
    if (sideRadio) sideRadio.checked = true;

    // 年齢区分
    if (guest.ageCategory) {
      ageCategorySelect.value = guest.ageCategory;
    }

    // メールアドレス (事前設定があれば)
    if (guest.email) {
      emailInput.value = guest.email;
    }

    // 事前定義代理出席者リスト（PredefinedProxiesシートの全行）をダイナミック構築
    if (proxies && proxies.length > 0) {
      predefinedProxyContainer.innerHTML = "";
      proxies.forEach((proxy, index) => {
        const label = document.createElement("label");
        label.className = "checkbox-label";
        const proxyName = `${proxy.lastName} ${proxy.firstName}`.trim();
        const ageLabel = proxy.ageCategory ? ` (${proxy.ageCategory})` : "";

        label.innerHTML = `
          <input type="checkbox" name="predefinedProxy" value="${escapeHtml(proxyName)}" id="proxy_${index}">
          <span>${escapeHtml(proxyName)} 様${escapeHtml(ageLabel)}（ご出席）</span>
        `;
        predefinedProxyContainer.appendChild(label);
      });
      predefinedProxyWrapper.classList.remove("hidden");
    } else {
      predefinedProxyWrapper.classList.add("hidden");
    }

    // 動的同伴者リストの初期化
    dynamicProxyList.innerHTML = "";
    proxyCardIndex = 0;

    // もし過去の回答データが存在する場合、入力値を復元
    if (existingResp) {
      // 出欠
      if (existingResp.attendance) {
        const attendanceRadio = document.querySelector(`input[name="attendance"][value="${existingResp.attendance}"]`);
        if (attendanceRadio) {
          attendanceRadio.checked = true;
          toggleAttendanceSections(existingResp.attendance);
        }
      }

      if (existingResp.lastName) lastNameInput.value = existingResp.lastName;
      if (existingResp.firstName) firstNameInput.value = existingResp.firstName;
      if (existingResp.kanaLastName) kanaLastNameInput.value = existingResp.kanaLastName;
      if (existingResp.kanaFirstName) kanaFirstNameInput.value = existingResp.kanaFirstName;
      if (existingResp.email) emailInput.value = existingResp.email;
      if (existingResp.postalCode) postalCodeInput.value = existingResp.postalCode;
      if (existingResp.address) addressInput.value = existingResp.address;
      if (existingResp.building) buildingInput.value = existingResp.building;
      if (existingResp.phone) phoneInput.value = existingResp.phone;
      if (existingResp.allergies) allergiesInput.value = existingResp.allergies;
      if (existingResp.message) messageInput.value = existingResp.message;

      // 事前定義代理出席者の復元
      if (existingResp.predefinedProxiesResponse) {
        try {
          const proxyAnswers = JSON.parse(existingResp.predefinedProxiesResponse);
          if (Array.isArray(proxyAnswers)) {
            proxyAnswers.forEach((name) => {
              const cb = document.querySelector(`input[name="predefinedProxy"][value="${name}"]`);
              if (cb) cb.checked = true;
            });
          }
        } catch (e) {
          if (existingResp.predefinedProxiesResponse.includes(",")) {
            existingResp.predefinedProxiesResponse.split(",").forEach((name) => {
              const cb = document.querySelector(`input[name="predefinedProxy"][value="${name.trim()}"]`);
              if (cb) cb.checked = true;
            });
          } else {
            const cb = document.querySelector(`input[name="predefinedProxy"][value="${existingResp.predefinedProxiesResponse.trim()}"]`);
            if (cb) cb.checked = true;
          }
        }
      }

      // 追加同伴者（動的アコーディオンカード）の復元
      if (existingResp.additionalProxies) {
        try {
          const parsedAddProxies = JSON.parse(existingResp.additionalProxies);
          if (Array.isArray(parsedAddProxies)) {
            parsedAddProxies.forEach((proxyObj) => {
              addProxyAccordionCard(proxyObj);
            });
          }
        } catch (e) {
          // テキスト形式の場合は改行区切りで各行をフォーム化
          const lines = existingResp.additionalProxies.split("\n");
          lines.forEach((line) => {
            if (line.trim()) {
              addProxyAccordionCard({ lastName: line.trim() });
            }
          });
        }
      }
    } else {
      // デフォルト表示の展開
      toggleAttendanceSections("出席");
    }
  }

  /**
   * アコーディオン形式の同伴者カードを動的追加
   */
  function addProxyAccordionCard(initialData = null) {
    proxyCardIndex++;
    const cardNum = proxyCardIndex;

    const card = document.createElement("div");
    card.className = "accordion-card open"; // 初期表示時は展開

    card.innerHTML = `
      <div class="accordion-header">
        <div class="accordion-title-group">
          <span class="accordion-title">同伴者 ${cardNum}: 未入力</span>
          <span class="accordion-badge">タップして編集</span>
        </div>
        <span class="accordion-toggle-icon">▼</span>
      </div>
      <div class="accordion-body">
        <div class="input-row">
          <div class="form-group">
            <label class="form-label">姓 <span class="required-badge">必須</span></label>
            <input type="text" class="proxy-last-name" placeholder="例: 山田">
          </div>
          <div class="form-group">
            <label class="form-label">名 <span class="required-badge">必須</span></label>
            <input type="text" class="proxy-first-name" placeholder="例: 花子">
          </div>
        </div>
        <div class="input-row">
          <div class="form-group">
            <label class="form-label">せい（よみがな）</label>
            <input type="text" class="proxy-kana-last" placeholder="例: やまだ">
          </div>
          <div class="form-group">
            <label class="form-label">めい（よみがな）</label>
            <input type="text" class="proxy-kana-first" placeholder="例: はなこ">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">年齢区分</label>
          <select class="proxy-age-category">
            <option value="大人">大人</option>
            <option value="子供">子供（小学生以下）</option>
            <option value="幼児">幼児（座席・食事なし）</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">アレルギー・食事制限（任意）</label>
          <input type="text" class="proxy-allergies" placeholder="例: えびアレルギー など">
        </div>
        <div class="accordion-actions">
          <button type="button" class="btn-delete-proxy">この同伴者を削除</button>
        </div>
      </div>
    `;

    // DOM要素参照
    const header = card.querySelector(".accordion-header");
    const title = card.querySelector(".accordion-title");
    const lastNameIn = card.querySelector(".proxy-last-name");
    const firstNameIn = card.querySelector(".proxy-first-name");
    const kanaLastIn = card.querySelector(".proxy-kana-last");
    const kanaFirstIn = card.querySelector(".proxy-kana-first");
    const ageSelect = card.querySelector(".proxy-age-category");
    const allergiesIn = card.querySelector(".proxy-allergies");
    const btnDelete = card.querySelector(".btn-delete-proxy");

    // タイトル更新関数
    const updateTitle = () => {
      const ln = lastNameIn.value.trim();
      const fn = firstNameIn.value.trim();
      const age = ageSelect.value;
      if (ln || fn) {
        title.textContent = `同伴者: ${ln} ${fn} 様（${age}）`;
      } else {
        title.textContent = `同伴者: 未入力`;
      }
    };

    // アコーディオン開閉トグル
    header.addEventListener("click", () => {
      card.classList.toggle("open");
    });

    // 入力変更時にリアルタイムでヘッダータイトル更新
    lastNameIn.addEventListener("input", updateTitle);
    firstNameIn.addEventListener("input", updateTitle);
    ageSelect.addEventListener("change", updateTitle);

    // 削除ボタン
    btnDelete.addEventListener("click", (e) => {
      e.stopPropagation(); // ヘッダー開閉イベントの連動を防止
      card.remove();
    });

    // 初期データの設定
    if (initialData) {
      if (initialData.lastName) lastNameIn.value = initialData.lastName;
      if (initialData.firstName) firstNameIn.value = initialData.firstName;
      if (initialData.kanaLastName) kanaLastIn.value = initialData.kanaLastName;
      if (initialData.kanaFirstName) kanaFirstIn.value = initialData.kanaFirstName;
      if (initialData.ageCategory) ageSelect.value = initialData.ageCategory;
      if (initialData.allergies) allergiesIn.value = initialData.allergies;

      updateTitle();
      card.classList.remove("open"); // 復元時は折りたたんだ状態
    }

    dynamicProxyList.appendChild(card);
    card.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  /**
   * 画面上の同伴者カードからデータを抽出する関数
   */
  function getDynamicProxiesData() {
    const cards = dynamicProxyList.querySelectorAll(".accordion-card");
    const result = [];

    cards.forEach((card) => {
      const ln = card.querySelector(".proxy-last-name").value.trim();
      const fn = card.querySelector(".proxy-first-name").value.trim();
      const kln = card.querySelector(".proxy-kana-last").value.trim();
      const kfn = card.querySelector(".proxy-kana-first").value.trim();
      const age = card.querySelector(".proxy-age-category").value;
      const alg = card.querySelector(".proxy-allergies").value.trim();

      if (ln || fn) {
        result.push({
          lastName: ln,
          firstName: fn,
          kanaLastName: kln,
          kanaFirstName: kfn,
          ageCategory: age,
          allergies: alg,
          fullName: `${ln} ${fn}`.trim()
        });
      }
    });

    return result;
  }

  /**
   * 出欠選択に応じたセクションの表示/非表示切り替え
   */
  function toggleAttendanceSections(attendance) {
    if (attendance === "欠席") {
      contactSection.classList.add("hidden");
      allergySection.classList.add("hidden");
      proxySection.classList.add("hidden");
      guestMetaFields.classList.add("hidden");
    } else {
      contactSection.classList.remove("hidden");
      allergySection.classList.remove("hidden");
      proxySection.classList.remove("hidden");
      guestMetaFields.classList.remove("hidden");
    }
  }

  /**
   * 郵便番号から住所を自動検索 (zipcloud API)
   */
  async function searchAddressFromPostalCode() {
    const rawZip = postalCodeInput.value.replace(/[^\d]/g, "");
    if (rawZip.length !== 7) {
      alert("郵便番号は7桁の数字でご入力ください。");
      return;
    }

    btnSearchPostal.textContent = "検索中...";
    btnSearchPostal.disabled = true;

    try {
      const response = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zip=${rawZip}`);
      const data = await response.json();

      if (data.status === 200 && data.results && data.results.length > 0) {
        const result = data.results[0];
        const fullAddress = `${result.address1}${result.address2}${result.address3}`;
        addressInput.value = fullAddress;
        buildingInput.focus();
      } else {
        alert("該当する住所が見つかりませんでした。お手数ですが手入力をお願いいたします。");
      }
    } catch (e) {
      console.error("Postal search error:", e);
      alert("住所検索中にエラーが発生しました。手入力をお願いいたします。");
    } finally {
      btnSearchPostal.textContent = "住所自動入力";
      btnSearchPostal.disabled = false;
    }
  }

  /**
   * 確認ボタンクリック時処理
   */
  function handleConfirmClick() {
    const selectedAttendance = document.querySelector('input[name="attendance"]:checked');
    if (!selectedAttendance) {
      alert("ご出欠（ご出席 / ご欠席）を選択してください。");
      return;
    }

    const attendance = selectedAttendance.value;

    // 氏名・フリガナバリデーション
    if (!lastNameInput.value.trim() || !firstNameInput.value.trim()) {
      alert("お名前（姓・名）を入力してください。");
      return;
    }
    if (!kanaLastNameInput.value.trim() || !kanaFirstNameInput.value.trim()) {
      alert("お名前のふりがな（せい・めい）を入力してください。");
      return;
    }

    // 出席時の必須項目バリデーション
    if (attendance === "出席") {
      if (!emailInput.value.trim() || !validateEmail(emailInput.value.trim())) {
        alert("有効なメールアドレスをご入力ください。");
        emailInput.focus();
        return;
      }
      if (!postalCodeInput.value.trim()) {
        alert("郵便番号をご入力ください。");
        postalCodeInput.focus();
        return;
      }
      if (!addressInput.value.trim()) {
        alert("ご住所をご入力ください。");
        addressInput.focus();
        return;
      }
      if (!phoneInput.value.trim()) {
        alert("お電話番号をご入力ください。");
        phoneInput.focus();
        return;
      }

      // 追加された同伴者カードの入力チェック
      const cards = dynamicProxyList.querySelectorAll(".accordion-card");
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        const ln = card.querySelector(".proxy-last-name").value.trim();
        const fn = card.querySelector(".proxy-first-name").value.trim();
        if (!ln || !fn) {
          alert(`追加された同伴者様の「お名前（姓・名）」をご入力ください。`);
          card.classList.add("open");
          card.querySelector(".proxy-last-name").focus();
          return;
        }
      }
    }

    // 送信確認モーダルの概要リスト構築
    buildModalSummary(attendance);
    confirmModal.classList.add("active");
  }

  /**
   * モーダル用確認サマリーのHTML構築
   */
  function buildModalSummary(attendance) {
    const selectedSide = document.querySelector('input[name="side"]:checked');
    const sideValue = selectedSide ? selectedSide.value : "未選択";

    let html = `
      <div class="summary-item">
        <span class="summary-label">ご出欠</span>
        <span class="summary-value" style="font-weight: bold; color: var(--primary-color);">${escapeHtml(attendance)}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">お名前</span>
        <span class="summary-value">${escapeHtml(lastNameInput.value.trim())} ${escapeHtml(firstNameInput.value.trim())} （${escapeHtml(kanaLastNameInput.value.trim())} ${escapeHtml(kanaFirstNameInput.value.trim())}）</span>
      </div>
    `;

    if (attendance === "出席") {
      html += `
        <div class="summary-item">
          <span class="summary-label">ご区分</span>
          <span class="summary-value">${escapeHtml(sideValue)} / ${escapeHtml(ageCategorySelect.value)}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">メールアドレス</span>
          <span class="summary-value">${escapeHtml(emailInput.value.trim())}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">ご住所</span>
          <span class="summary-value">〒${escapeHtml(postalCodeInput.value.trim())}<br>${escapeHtml(addressInput.value.trim())} ${escapeHtml(buildingInput.value.trim())}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">電話番号</span>
          <span class="summary-value">${escapeHtml(phoneInput.value.trim())}</span>
        </div>
      `;

      if (allergiesInput.value.trim()) {
        html += `
          <div class="summary-item">
            <span class="summary-label">アレルギー等</span>
            <span class="summary-value">${escapeHtml(allergiesInput.value.trim())}</span>
          </div>
        `;
      }

      // 事前定義代理出席者のチェック状態
      const checkedProxies = Array.from(document.querySelectorAll('input[name="predefinedProxy"]:checked'))
        .map(cb => cb.value);

      if (checkedProxies.length > 0) {
        html += `
          <div class="summary-item">
            <span class="summary-label">同伴者（選択）</span>
            <span class="summary-value">${escapeHtml(checkedProxies.join("、"))}</span>
          </div>
        `;
      }

      // 画面上から動的追加された同伴者
      const dynamicProxies = getDynamicProxiesData();
      if (dynamicProxies.length > 0) {
        const proxySummaryText = dynamicProxies.map(p => {
          let str = `${p.fullName} 様（${p.ageCategory}）`;
          if (p.allergies) str += ` [アレルギー: ${p.allergies}]`;
          return str;
        }).join("<br>");

        html += `
          <div class="summary-item">
            <span class="summary-label">追加同伴者</span>
            <span class="summary-value">${proxySummaryText}</span>
          </div>
        `;
      }
    }

    if (messageInput.value.trim()) {
      html += `
        <div class="summary-item">
          <span class="summary-label">メッセージ</span>
          <span class="summary-value">${escapeHtml(messageInput.value.trim())}</span>
        </div>
      `;
    }

    modalSummaryList.innerHTML = html;
  }

  /**
   * フォーム送信処理 (GAS doPostへデータ送信)
   */
  async function handleFormSubmit() {
    btnModalSubmit.disabled = true;
    btnModalSubmit.textContent = "送信中...";

    const selectedAttendance = document.querySelector('input[name="attendance"]:checked').value;
    const selectedSide = document.querySelector('input[name="side"]:checked');

    // 事前定義代理出席者の選択リスト
    const checkedProxies = Array.from(document.querySelectorAll('input[name="predefinedProxy"]:checked'))
      .map(cb => cb.value);

    // 動的追加された同伴者リスト
    const dynamicProxies = getDynamicProxiesData();

    const payload = {
      token: currentToken,
      attendance: selectedAttendance,
      lastName: lastNameInput.value.trim(),
      firstName: firstNameInput.value.trim(),
      kanaLastName: kanaLastNameInput.value.trim(),
      kanaFirstName: kanaFirstNameInput.value.trim(),
      side: selectedSide ? selectedSide.value : "新郎側",
      ageCategory: ageCategorySelect.value,
      email: emailInput.value.trim(),
      postalCode: postalCodeInput.value.trim(),
      address: addressInput.value.trim(),
      building: buildingInput.value.trim(),
      phone: phoneInput.value.trim(),
      allergies: allergiesInput.value.trim(),
      predefinedProxiesResponse: checkedProxies,
      additionalProxies: JSON.stringify(dynamicProxies),
      message: messageInput.value.trim()
    };

    try {
      const response = await fetch(CONFIG.GAS_WEB_APP_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.success) {
        confirmModal.classList.remove("active");
        rsvpForm.classList.add("hidden");

        // 完了画面へ切り替え
        submittedSummaryBox.innerHTML = modalSummaryList.innerHTML;
        successCard.classList.remove("hidden");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        alert("送信中にエラーが発生しました: " + (result.error || "詳細不明"));
        btnModalSubmit.disabled = false;
        btnModalSubmit.textContent = "送信する";
      }
    } catch (err) {
      console.error("Submit error:", err);
      alert("送信処理中にエラーが発生いたしました。通信環境をご確認のうえ再度お試しください。");
      btnModalSubmit.disabled = false;
      btnModalSubmit.textContent = "送信する";
    }
  }

  /**
   * エラー画面の表示
   */
  function showError(msg) {
    loadingContainer.classList.add("hidden");
    rsvpForm.classList.add("hidden");
    errorMessageText.textContent = msg;
    errorCard.classList.remove("hidden");
  }

  /**
   * メールアドレス形式検証
   */
  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /**
   * HTMLエスケープヘルパー
   */
  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
});

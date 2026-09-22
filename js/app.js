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
  const btnConfirm = document.getElementById("btnConfirm");
  const confirmModal = document.getElementById("confirmModal");
  const modalSummaryList = document.getElementById("modalSummaryList");
  const btnModalBack = document.getElementById("btnModalBack");
  const btnModalSubmit = document.getElementById("btnModalSubmit");

  let currentToken = "";
  let guestData = null;
  let predefinedProxiesList = [];

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
   * JSONPリクエストヘルパー (CORS回避用)
   */
  function fetchJSONP(url) {
    return new Promise((resolve, reject) => {
      const callbackName = "gasCallback_" + Math.round(1000000 * Math.random());
      const script = document.createElement("script");
      const separator = url.includes("?") ? "&" : "?";

      window[callbackName] = (data) => {
        delete window[callbackName];
        if (script.parentNode) script.parentNode.removeChild(script);
        resolve(data);
      };

      script.src = `${url}${separator}callback=${callbackName}`;
      script.onerror = () => {
        delete window[callbackName];
        if (script.parentNode) script.parentNode.removeChild(script);
        reject(new Error("JSONP Script Load Error"));
      };

      document.body.appendChild(script);
    });
  }

  /**
   * GAS APIよりデータ取得 (fetch & JSONPフォールバック)
   */
  async function fetchGuestData(token) {
    if (!CONFIG || !CONFIG.GAS_WEB_APP_URL || CONFIG.GAS_WEB_APP_URL.includes("YOUR_GAS_WEB_APP_URL")) {
      showError("設定ファイル (js/config.js) に GAS の Web App URL が設定されていません。管理者にお問い合わせください。");
      return;
    }

    const baseUrl = `${CONFIG.GAS_WEB_APP_URL}?token=${encodeURIComponent(token)}`;
    let result = null;

    // 1. まず標準 fetch を試行
    try {
      const response = await fetch(baseUrl);
      if (response.ok) {
        result = await response.json();
      }
    } catch (e) {
      console.warn("Standard fetch failed (CORS block), trying JSONP fallback...", e);
    }

    // 2. fetchでCORS等失敗した場合は JSONP でフォールバック試行
    if (!result) {
      try {
        result = await fetchJSONP(baseUrl);
      } catch (jsonpErr) {
        console.error("JSONP fetch error:", jsonpErr);
        showError(
          "通信エラーが発生しました。\n" +
          "Google Apps Scriptのデプロイ設定で「アクセスできるユーザー」が「全員 (Anyone)」になっているか、新しいバージョンでデプロイされているかご確認ください。"
        );
        return;
      }
    }

    if (!result || !result.success) {
      showError((result && result.error) ? result.error : "データ取得に失敗しました。無効なトークンです。");
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

    // 事前定義代理出席者アコーディオンカード群の生成 (PredefinedProxiesシート)
    if (proxies && proxies.length > 0) {
      predefinedProxyContainer.innerHTML = "";
      proxies.forEach((proxy) => {
        renderPredefinedProxyAccordionCard(proxy);
      });
      predefinedProxyWrapper.classList.remove("hidden");
    } else {
      predefinedProxyWrapper.classList.add("hidden");
    }

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

      // 事前定義代理出席者の復元 (ProxyId または 名前による照合)
      if (existingResp.predefinedProxiesResponse) {
        restorePredefinedProxiesResponse(existingResp.predefinedProxiesResponse);
      }
    } else {
      // デフォルト表示の展開
      toggleAttendanceSections("出席");
    }
  }

  /**
   * 事前定義代理出席者の編集用アコーディオンカード描画関数
   */
  function renderPredefinedProxyAccordionCard(proxy) {
    const card = document.createElement("div");
    card.className = "accordion-card open";
    card.setAttribute("data-proxy-id", proxy.proxyId || "");

    const proxyName = `${proxy.lastName || ""} ${proxy.firstName || ""}`.trim();
    const ageCategory = proxy.ageCategory || "大人";

    card.innerHTML = `
      <div class="accordion-header">
        <div class="accordion-title-group">
          <input type="checkbox" class="accordion-checkbox proxy-attend-cb" id="cb_${proxy.proxyId}" checked>
          <span class="accordion-title">${escapeHtml(proxyName)} 様（${escapeHtml(ageCategory)}）</span>
          <span class="accordion-badge">タップして詳細を修正</span>
        </div>
        <span class="accordion-toggle-icon">▼</span>
      </div>
      <div class="accordion-body">
        <div class="input-row">
          <div class="form-group">
            <label class="form-label">姓 <span class="required-badge">必須</span></label>
            <input type="text" class="proxy-last-name" value="${escapeHtml(proxy.lastName || "")}">
          </div>
          <div class="form-group">
            <label class="form-label">名 <span class="required-badge">必須</span></label>
            <input type="text" class="proxy-first-name" value="${escapeHtml(proxy.firstName || "")}">
          </div>
        </div>
        <div class="input-row">
          <div class="form-group">
            <label class="form-label">せい（よみがな）</label>
            <input type="text" class="proxy-kana-last" value="${escapeHtml(proxy.kanaLastName || "")}">
          </div>
          <div class="form-group">
            <label class="form-label">めい（よみがな）</label>
            <input type="text" class="proxy-kana-first" value="${escapeHtml(proxy.kanaFirstName || "")}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">年齢区分</label>
          <select class="proxy-age-category">
            <option value="大人" ${ageCategory === "大人" ? "selected" : ""}>大人</option>
            <option value="子供" ${ageCategory === "子供" ? "selected" : ""}>子供（小学生以下）</option>
            <option value="幼児" ${ageCategory === "幼児" ? "selected" : ""}>幼児（座席・食事なし）</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">アレルギー・食事制限（任意）</label>
          <input type="text" class="proxy-allergies" placeholder="例: えびアレルギー など">
        </div>
      </div>
    `;

    // DOM参照
    const header = card.querySelector(".accordion-header");
    const cb = card.querySelector(".proxy-attend-cb");
    const title = card.querySelector(".accordion-title");
    const lastNameIn = card.querySelector(".proxy-last-name");
    const firstNameIn = card.querySelector(".proxy-first-name");
    const ageSelect = card.querySelector(".proxy-age-category");

    // ヘッダータイトル更新
    const updateTitle = () => {
      const ln = lastNameIn.value.trim();
      const fn = firstNameIn.value.trim();
      const age = ageSelect.value;
      const isAttending = cb.checked;
      const displayName = (ln || fn) ? `${ln} ${fn}` : "同伴者名未入力";

      if (isAttending) {
        title.textContent = `${displayName} 様（${age}）`;
        card.style.opacity = "1";
      } else {
        title.textContent = `${displayName} 様（ご欠席）`;
        card.style.opacity = "0.7";
      }
    };

    // チェックボックスイベント
    cb.addEventListener("change", (e) => {
      e.stopPropagation();
      updateTitle();
      if (cb.checked) {
        card.classList.add("open");
      } else {
        card.classList.remove("open");
      }
    });

    cb.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    // アコーディオン開閉
    header.addEventListener("click", () => {
      card.classList.toggle("open");
    });

    // リアルタイム編集イベント
    lastNameIn.addEventListener("input", updateTitle);
    firstNameIn.addEventListener("input", updateTitle);
    ageSelect.addEventListener("change", updateTitle);

    updateTitle();
    predefinedProxyContainer.appendChild(card);
  }

  /**
   * 画面上の全事前定義代理出席者の編集データを抽出する関数
   */
  function getPredefinedProxiesData() {
    const cards = predefinedProxyContainer.querySelectorAll(".accordion-card");
    const result = [];

    cards.forEach((card) => {
      const proxyId = card.getAttribute("data-proxy-id");
      const cb = card.querySelector(".proxy-attend-cb");
      const isAttending = cb ? cb.checked : false;

      const ln = card.querySelector(".proxy-last-name").value.trim();
      const fn = card.querySelector(".proxy-first-name").value.trim();
      const kln = card.querySelector(".proxy-kana-last").value.trim();
      const kfn = card.querySelector(".proxy-kana-first").value.trim();
      const age = card.querySelector(".proxy-age-category").value;
      const alg = card.querySelector(".proxy-allergies").value.trim();

      result.push({
        proxyId: proxyId,
        attending: isAttending,
        lastName: ln,
        firstName: fn,
        kanaLastName: kln,
        kanaFirstName: kfn,
        ageCategory: age,
        allergies: alg,
        fullName: `${ln} ${fn}`.trim()
      });
    });

    return result;
  }

  /**
   * 過去の事前定義代理出席者回答の復元処理
   */
  function restorePredefinedProxiesResponse(rawResp) {
    try {
      let parsed = typeof rawResp === "string" ? JSON.parse(rawResp) : rawResp;
      if (Array.isArray(parsed)) {
        parsed.forEach((item) => {
          let card = null;
          if (item.proxyId) {
            card = predefinedProxyContainer.querySelector(`.accordion-card[data-proxy-id="${item.proxyId}"]`);
          }

          if (card) {
            const cb = card.querySelector(".proxy-attend-cb");
            if (cb) cb.checked = item.attending !== false;

            if (item.lastName) card.querySelector(".proxy-last-name").value = item.lastName;
            if (item.firstName) card.querySelector(".proxy-first-name").value = item.firstName;
            if (item.kanaLastName) card.querySelector(".proxy-kana-last").value = item.kanaLastName;
            if (item.kanaFirstName) card.querySelector(".proxy-kana-first").value = item.kanaFirstName;
            if (item.ageCategory) card.querySelector(".proxy-age-category").value = item.ageCategory;
            if (item.allergies) card.querySelector(".proxy-allergies").value = item.allergies;

            // タイトル更新発火
            card.querySelector(".proxy-last-name").dispatchEvent(new Event("input"));
          }
        });
      }
    } catch (e) {
      console.warn("Could not parse predefinedProxiesResponse for restoration:", e);
    }
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

      // 出席フラグがオンの代理出席者カードの入力チェック
      const cards = predefinedProxyContainer.querySelectorAll(".accordion-card");
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        const cb = card.querySelector(".proxy-attend-cb");
        if (cb && cb.checked) {
          const ln = card.querySelector(".proxy-last-name").value.trim();
          const fn = card.querySelector(".proxy-first-name").value.trim();
          if (!ln || !fn) {
            alert(`ご出席される同伴者様のお名前（姓・名）をご入力ください。`);
            card.classList.add("open");
            card.querySelector(".proxy-last-name").focus();
            return;
          }
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

      // 事前定義代理出席者の編集後状態
      const proxiesData = getPredefinedProxiesData();
      if (proxiesData.length > 0) {
        const proxySummaryText = proxiesData.map(p => {
          if (!p.attending) {
            return `<span style="color:#888;">${escapeHtml(p.fullName)} 様（ご欠席）</span>`;
          }
          let str = `${escapeHtml(p.fullName)} 様（${escapeHtml(p.ageCategory)}）`;
          if (p.allergies) str += ` [アレルギー: ${escapeHtml(p.allergies)}]`;
          return str;
        }).join("<br>");

        html += `
          <div class="summary-item">
            <span class="summary-label">同伴者様</span>
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

    // 事前定義代理出席者の編集後データのリスト (ProxyId付き)
    const proxiesData = getPredefinedProxiesData();

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
      predefinedProxiesResponse: proxiesData,
      additionalProxies: "",
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
    errorMessageText.innerHTML = msg.replace(/\n/g, "<br>");
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

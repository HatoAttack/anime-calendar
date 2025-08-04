// 今週の日曜を取得（表示固定）
const currentSunday = getSunday(new Date());
document.addEventListener("DOMContentLoaded", () => {
  render();
  setupAdmin();
});

// カレンダー描画
async function render() {
  const data = await fetch("data/releases.json").then(r => r.json());
  const container = document.getElementById("calendar-container");
  container.innerHTML = "";

  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(currentSunday);
    d.setDate(d.getDate() + i);
    weekDates.push(d);
  }

  // 週範囲表示
  const fmt = new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric" });
  document.getElementById("week-range").textContent =
    `${fmt.format(weekDates[0])} 〜 ${fmt.format(weekDates[6])}`;

  // 曜日ごとに分類（ローカル時刻の曜日と時間で振り分け）
  const byDay = {}; // key YYYY-MM-DD
  data.forEach(item => {
    if (!item.weekday || !item.time || !item.platform) return;
    // currentSunday 週のその曜日の基準日付
    const dayOffset = parseInt(item.weekday, 10);
    const d = new Date(currentSunday);
    d.setDate(d.getDate() + dayOffset);
    // 時間をセット（ローカルタイム）
    const [hh, mm] = item.time.split(":").map(s => parseInt(s, 10));
    d.setHours(hh, mm, 0, 0);
    const key = d.toISOString().slice(0, 10);
    if (!byDay[key]) byDay[key] = [];
    // Build display object
    byDay[key].push({
      anime_title: item.anime_title,
      detail_url: item.detail_url,
      platform: item.platform,
      platform_color: item.platform_color,
      favicon_url: item.favicon_url,
      datetime_local: d,
      raw: item // for deletion reference
    });
  });

  // カレンダーグリッド
  const cal = document.createElement("div");
  cal.className = "calendar";
  weekDates.forEach(d => {
    const dayKey = d.toISOString().slice(0, 10);
    const dayDiv = document.createElement("div");
    dayDiv.className = "day";
    const weekday = d.toLocaleDateString("ja-JP", { weekday: "short" });
    const header = document.createElement("div");
    header.className = "day-header";
    header.textContent = `${weekday} ${d.getMonth() + 1}/${d.getDate()}`;
    dayDiv.appendChild(header);

    const list = byDay[dayKey] || [];
    if (list.length === 0) {
      const none = document.createElement("div");
      none.className = "small";
      none.textContent = "対象の最新話なし";
      dayDiv.appendChild(none);
    } else {
      // 時刻順
      list.sort((a, b) => a.datetime_local - b.datetime_local);
      list.forEach(entry => {
        const rDiv = document.createElement("div");
        rDiv.className = "release";
        rDiv.style.cursor = "pointer";
        // プラットフォームバッジ
        const badge = document.createElement("div");
        badge.className = "badge";
        const plat = document.createElement("div");
        plat.className = "platform";
        plat.style.background = entry.platform_color || "#666";
        plat.textContent = entry.platform;
        const img = document.createElement("img");
        img.src = entry.favicon_url;
        img.alt = entry.platform;
        img.width = 16;
        img.height = 16;
        img.style.borderRadius = "3px";
        img.style.marginRight = "4px";
        const platformWrap = document.createElement("div");
        platformWrap.style.display = "inline-flex";
        platformWrap.style.alignItems = "center";
        platformWrap.appendChild(img);
        platformWrap.appendChild(plat);
        badge.appendChild(platformWrap);
        rDiv.appendChild(badge);

        // タイトル＋リンク
        const title = document.createElement("div");
        title.style.marginLeft = "8px";
        const a = document.createElement("a");
        a.href = entry.detail_url;
        a.className = "title-link";
        a.textContent = entry.anime_title;
        a.target = "_blank";
        title.appendChild(a);
        rDiv.appendChild(title);

        // 時刻
        const tm = document.createElement("div");
        tm.className = "time";
        const fmtTime = new Intl.DateTimeFormat("ja-JP", {
          hour: "2-digit",
          minute: "2-digit"
        });
        tm.textContent = fmtTime.format(entry.datetime_local);
        rDiv.appendChild(tm);

        // クリックで削除モーダル
        rDiv.addEventListener("click", () => {
          showDeleteModal(entry);
        });

        dayDiv.appendChild(rDiv);
      });
    }

    cal.appendChild(dayDiv);
  });
  container.appendChild(cal);
}

// 日曜取得
function getSunday(d) {
  const dt = new Date(d);
  const day = dt.getDay();
  dt.setDate(dt.getDate() - day);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

// 管理フォームセットアップ
function setupAdmin() {
  document.getElementById("generate-json").addEventListener("click", e => {
    e.preventDefault();
    const anime_title = document.getElementById("anime_title").value.trim();
    const detail_url = document.getElementById("detail_url").value.trim();
    const platformSelect = document.getElementById("platform_select");
    const platform = platformSelect.value;
    const platform_color = platformSelect.selectedOptions[0].dataset.color || "#666";
    const domain = platformSelect.selectedOptions[0].dataset.domain || "";
    const favicon_url = domain
      ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}`
      : "";
    const weekday = document.getElementById("weekday_select").value;
    const time = document.getElementById("time_input").value;

    if (!anime_title || !platform || !weekday || !time) {
      alert("番組名・プラットフォーム・曜日・時間は必須です。");
      return;
    }

    const obj = {
      anime_title,
      detail_url,
      platform,
      platform_color,
      favicon_url,
      weekday, // 0=日 ... 6=土
      time // HH:MM local
    };
    document.getElementById("generated-json").textContent = JSON.stringify(obj, null, 2);
  });

  // モーダル関連
  document.getElementById("close-delete").addEventListener("click", () => {
    hideDeleteModal();
  });
}

function showDeleteModal(entry) {
  document.getElementById("delete-info").textContent =
    `${entry.anime_title}（${entry.platform}） ${new Intl.DateTimeFormat("ja-JP", {
      weekday: "short",
      month: "numeric",
      day: "numeric"
    }).format(entry.datetime_local)} ${new Intl.DateTimeFormat("ja-JP", {
      hour: "2-digit",
      minute: "2-digit"
    }).format(entry.datetime_local)}`;
  document.getElementById("delete-json").textContent = JSON.stringify(entry.raw, null, 2);
  document.getElementById("delete-modal").classList.remove("hidden");
}

function hideDeleteModal() {
  document.getElementById("delete-modal").classList.add("hidden");
}

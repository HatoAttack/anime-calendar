// 週の開始（日曜）を保持
let currentSunday = getSunday(new Date());

document.getElementById("prev-week").addEventListener("click", () => {
  currentSunday.setDate(currentSunday.getDate() - 7);
  render();
});
document.getElementById("next-week").addEventListener("click", () => {
  currentSunday.setDate(currentSunday.getDate() + 7);
  render();
});

async function render() {
  const data = await fetch("data/releases.json").then(r => r.json());
  const calendarContainer = document.getElementById("calendar-container");
  calendarContainer.innerHTML = "";

  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(currentSunday);
    d.setDate(d.getDate() + i);
    weekDates.push(d);
  }

  // 見出し更新
  const fmt = new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric" });
  document.getElementById("week-range").textContent =
    `${fmt.format(weekDates[0])} 〜 ${fmt.format(weekDates[6])}`;

  // 日別に集約：最速配信プラットフォームを選ぶ
  const byDay = {};
  data.forEach(item => {
    if (!item.releases || item.releases.length === 0) return;
    let best = item.releases[0];
    for (let i = 1; i < item.releases.length; i++) {
      const a = new Date(item.releases[i].release_datetime_utc);
      const b = new Date(best.release_datetime_utc);
      if (a < b) best = item.releases[i];
    }
    const releaseDate = new Date(best.release_datetime_utc);
    const localDate = new Date(releaseDate.toLocaleString("en-US", { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }));
    const key = localDate.toISOString().slice(0, 10);
    if (!byDay[key]) byDay[key] = [];
    byDay[key].push({
      anime_title: item.anime_title,
      episode: item.episode,
      detail_url: item.detail_url,
      bestRelease: best,
      release_datetime_local: localDate
    });
  });

  const cal = document.createElement("div");
  cal.className = "calendar";

  weekDates.forEach(d => {
    const dayKey = d.toISOString().slice(0,10);
    const dayDiv = document.createElement("div");
    dayDiv.className = "day";
    const weekday = d.toLocaleDateString("ja-JP", { weekday: "short" });
    const header = document.createElement("div");
    header.className = "day-header";
    header.textContent = `${weekday} ${d.getMonth()+1}/${d.getDate()}`;
    dayDiv.appendChild(header);

    const releases = byDay[dayKey] || [];
    if (releases.length === 0) {
      const none = document.createElement("div");
      none.className = "small";
      none.textContent = "対象の最新話なし";
      dayDiv.appendChild(none);
    } else {
      releases.sort((a,b)=> a.release_datetime_local - b.release_datetime_local);
      releases.forEach(r => {
        const rDiv = document.createElement("div");
        rDiv.className = "release";

        const badge = document.createElement("div");
        badge.className = "badge";
        const plat = document.createElement("div");
        plat.className = "platform";
        plat.style.background = r.bestRelease.platform_color || "#666";
        plat.textContent = r.bestRelease.platform;
        const img = document.createElement("img");
        img.src = r.bestRelease.favicon_url;
        img.alt = r.bestRelease.platform;
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

        const title = document.createElement("div");
        title.style.marginLeft = "8px";
        const a = document.createElement("a");
        a.href = r.detail_url;
        a.className = "title-link";
        a.textContent = `${r.anime_title} ${r.episode}`;
        a.target = "_blank";
        title.appendChild(a);
        rDiv.appendChild(title);

        const tm = document.createElement("div");
        tm.className = "time";
        const fmtTime = new Intl.DateTimeFormat("ja-JP", {
          hour: "2-digit", minute: "2-digit"
        });
        tm.textContent = fmtTime.format(r.release_datetime_local);
        rDiv.appendChild(tm);

        dayDiv.appendChild(rDiv);
      });
    }
    cal.appendChild(dayDiv);
  });

  calendarContainer.appendChild(cal);
}

function getSunday(d) {
  const dt = new Date(d);
  const day = dt.getDay();
  dt.setDate(dt.getDate() - day);
  dt.setHours(0,0,0,0);
  return dt;
}

render();

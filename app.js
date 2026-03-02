const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

const MEDIA_DOMAINS = {
  "Netflix": "netflix.com",
  "Prime Video": "primevideo.com",
  "Disney+": "disneyplus.com",
  "U-NEXT": "video.unext.jp",
  "ABEMA": "abema.tv",
  "dアニメ": "anime.dmkt-sp.jp",
  "Hulu": "hulu.jp",
  "Lemino": "lemino.docomo.ne.jp"
};

let programData = [
  ["Netflix", 1, "00:00", "サンプル番組A"],
  ["ABEMA", 3, "23:30", "サンプル番組B"],
  ["dアニメ", 6, "21:00", "サンプル番組C"]
];

document.addEventListener("DOMContentLoaded", () => {
  renderCalendar(new Date());
  setupCsvTools();
});

function renderCalendar(accessDate) {
  const days = getCenteredWeek(accessDate);
  const dateHeaderRow = document.getElementById("header-date-row");
  const weekdayHeaderRow = document.getElementById("header-weekday-row");
  const programRow = document.getElementById("program-row");

  dateHeaderRow.innerHTML = "";
  weekdayHeaderRow.innerHTML = "";
  programRow.innerHTML = "";

  days.forEach((date) => {
    const dateHeader = document.createElement("th");
    dateHeader.textContent = formatMonthDay(date);

    const weekdayHeader = document.createElement("th");
    weekdayHeader.textContent = WEEKDAY_LABELS[date.getDay()];

    const cell = document.createElement("td");
    if (isSameDay(date, accessDate)) {
      cell.classList.add("today");
    }

    const dayPrograms = getProgramsByWeekday(date.getDay());
    if (dayPrograms.length === 0) {
      const placeholder = document.createElement("span");
      placeholder.className = "placeholder";
      placeholder.textContent = "番組データなし";
      cell.appendChild(placeholder);
    } else {
      dayPrograms.forEach((program) => {
        cell.appendChild(createProgramCard(program));
      });
    }

    dateHeaderRow.appendChild(dateHeader);
    weekdayHeaderRow.appendChild(weekdayHeader);
    programRow.appendChild(cell);
  });

  const rangeText = `${formatMonthDay(days[0])} 〜 ${formatMonthDay(days[6])}`;
  document.getElementById("date-range").textContent = `表示範囲: ${rangeText}`;
}

function setupCsvTools() {
  const form = document.getElementById("program-form");
  const mediaInput = document.getElementById("media-input");
  const weekdayInput = document.getElementById("weekday-input");
  const timeInput = document.getElementById("time-input");
  const titleInput = document.getElementById("title-input");
  const fileInput = document.getElementById("csv-file-input");

  document.getElementById("export-csv").addEventListener("click", () => {
    downloadCsv(toCsv(programData));
  });

  document.getElementById("import-csv").addEventListener("click", () => {
    fileInput.click();
  });

  fileInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const text = await file.text();
    const parsed = parseCsv(text);
    if (parsed.length === 0) {
      alert("読み込めるCSVデータがありません。\nmedia,weekday,hh:mm,title 形式で入力してください。");
      fileInput.value = "";
      return;
    }

    programData = parsed;
    renderCalendar(new Date());
    fileInput.value = "";
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const newRow = [
      mediaInput.value,
      Number(weekdayInput.value),
      timeInput.value,
      titleInput.value.trim()
    ];

    if (!newRow[3]) {
      alert("タイトルを入力してください。");
      return;
    }

    programData.push(newRow);
    renderCalendar(new Date());
    form.reset();
  });
}

function downloadCsv(csv) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "anime-programs.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function toCsv(rows) {
  const header = "media,weekday,time,title";
  const body = rows.map((row) => row.map(escapeCsvField).join(",")).join("\n");
  return `${header}\n${body}`;
}

function parseCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");

  if (lines.length === 0) {
    return [];
  }

  const dataLines = ["media,weekday,time,title", "media,weekday,hh:mm,title"].includes(lines[0].toLowerCase()) ? lines.slice(1) : lines;

  return dataLines
    .map((line) => line.split(",").map((value) => value.trim()))
    .filter((cols) => cols.length >= 4)
    .map(([media, weekdayRaw, time, ...titleParts]) => {
      const weekday = Number(weekdayRaw);
      const title = titleParts.join(",");
      return [media, weekday, time, title];
    })
    .filter((item) => {
      const [, weekday, time, title] = item;
      return Number.isInteger(weekday) && weekday >= 0 && weekday <= 6 && /^\d{2}:\d{2}$/.test(time) && title;
    });
}

function escapeCsvField(value) {
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replaceAll('"', '""')}"` : str;
}

function getProgramsByWeekday(weekday) {
  return programData
    .filter((item) => item[1] === weekday)
    .sort((a, b) => a[2].localeCompare(b[2]))
    .map(([media, day, time, title]) => ({
      media,
      weekday: day,
      time,
      title
    }));
}

function createProgramCard(program) {
  const card = document.createElement("article");
  card.className = "program-card";

  const title = document.createElement("p");
  title.className = "program-title";
  title.textContent = program.title;

  const meta = document.createElement("div");
  meta.className = "program-meta";

  const icon = document.createElement("img");
  icon.className = "media-favicon";
  icon.src = getFaviconUrl(program.media);
  icon.alt = program.media;
  icon.title = program.media;
  icon.width = 16;
  icon.height = 16;

  const schedule = document.createElement("span");
  schedule.textContent = `${WEEKDAY_LABELS[program.weekday]} / ${program.time}`;

  meta.appendChild(icon);
  meta.appendChild(schedule);

  card.appendChild(title);
  card.appendChild(meta);
  return card;
}

function getFaviconUrl(media) {
  const domain = MEDIA_DOMAINS[media] || "example.com";
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`;
}

function getCenteredWeek(centerDate) {
  const days = [];
  for (let diff = -3; diff <= 3; diff += 1) {
    const d = new Date(centerDate);
    d.setHours(0, 0, 0, 0);
    d.setDate(centerDate.getDate() + diff);
    days.push(d);
  }
  return days;
}

function formatMonthDay(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}/${day}`;
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

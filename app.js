const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];
const SEASON_OPTIONS = ["春", "夏", "秋", "冬"];

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

const MEDIA_OPTIONS = Object.keys(MEDIA_DOMAINS);
const WEEKDAY_OPTIONS = [
  { value: 1, label: "月" },
  { value: 2, label: "火" },
  { value: 3, label: "水" },
  { value: 4, label: "木" },
  { value: 5, label: "金" },
  { value: 6, label: "土" },
  { value: 0, label: "日" }
];

const DEFAULT_PROGRAM_DATA = [
  ["Netflix", 1, "00:00", "サンプル番組A", "2026年春"],
  ["ABEMA", 3, "23:30", "サンプル番組B", "2026年春"],
  ["dアニメ", 6, "21:00", "サンプル番組C", "2026年春"]
];

let programData = [...DEFAULT_PROGRAM_DATA];

document.addEventListener("DOMContentLoaded", async () => {
  await loadProgramData();
  renderCalendar(new Date());
  setupJsonEditor();
  updateQuarterCounts();
});

async function loadProgramData() {
  try {
    const response = await fetch("data/programs.json", { cache: "no-store" });
    if (!response.ok) {
      return;
    }

    const data = await response.json();
    const normalized = fromJsonRecords(data);
    if (normalized.length > 0) {
      programData = normalized;
    }
  } catch {
    programData = [...DEFAULT_PROGRAM_DATA];
  }
}

function renderCalendar(accessDate) {
  const days = getCenteredWeek(accessDate);
  const viewingQuarter = getQuarterLabel(accessDate);
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

    const dayPrograms = getProgramsByWeekday(date.getDay(), viewingQuarter);
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

function setupJsonEditor() {
  const openButton = document.getElementById("open-json-editor");
  const closeButton = document.getElementById("close-json-editor");
  const modal = document.getElementById("json-editor-modal");
  const editorRows = document.getElementById("json-editor-rows");
  const addRowButton = document.getElementById("add-editor-row");
  const applyButton = document.getElementById("apply-json");
  const exportButton = document.getElementById("export-json");
  const importButton = document.getElementById("import-json");
  const fileInput = document.getElementById("json-file-input");

  openButton.addEventListener("click", () => {
    renderEditorRows(editorRows, programData);
    updateQuarterCounts();
    modal.hidden = false;
  });

  closeButton.addEventListener("click", () => {
    modal.hidden = true;
  });

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      modal.hidden = true;
    }
  });

  addRowButton.addEventListener("click", () => {
    const defaultQuarter = getNextQuarterLabel(new Date());
    editorRows.appendChild(createEditorRow([MEDIA_OPTIONS[0], 1, "00:00", "", defaultQuarter]));
  });

  applyButton.addEventListener("click", () => {
    const result = collectEditorRows(editorRows);
    if (result.hasInvalidYear) {
      alert("年は半角数字4桁で入力してください。");
      return;
    }

    programData = result.rows;
    renderCalendar(new Date());
    updateQuarterCounts();
    alert("番組データを反映しました。\n※ リポジトリ保存は別途コミットが必要です。");
    modal.hidden = true;
  });

  exportButton.addEventListener("click", () => {
    const json = JSON.stringify(toJsonRecords(programData), null, 2);
    downloadJson(json);
  });

  importButton.addEventListener("click", () => {
    fileInput.click();
  });

  fileInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const normalized = fromJsonRecords(parsed);
      if (normalized.length === 0) {
        alert("読み込めるJSONデータがありません。");
        fileInput.value = "";
        return;
      }

      programData = normalized;
      renderCalendar(new Date());
      renderEditorRows(editorRows, programData);
      updateQuarterCounts();
      fileInput.value = "";
    } catch {
      alert("JSONの読み込みに失敗しました。");
      fileInput.value = "";
    }
  });
}

function renderEditorRows(container, rows) {
  container.innerHTML = "";
  rows.forEach((row) => {
    container.appendChild(createEditorRow(row));
  });
}

function createEditorRow([media, weekday, time, title, quarter]) {
  const row = document.createElement("div");
  row.className = "form-row editor-row";

  row.appendChild(createQuarterFields(quarter));
  row.appendChild(createWeekdayField(weekday));
  row.appendChild(createMediaField(media));
  row.appendChild(createInputField("時間", "field-time", "time", time, ""));
  row.appendChild(createInputField("タイトル", "field-title", "text", title, "作品タイトル"));

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "row-remove";
  removeButton.textContent = "削除";
  removeButton.addEventListener("click", () => {
    row.remove();
  });
  row.appendChild(removeButton);

  return row;
}

function createInputField(labelText, fieldClass, type, value, placeholder) {
  const label = document.createElement("label");
  label.className = fieldClass;
  label.textContent = labelText;

  const input = document.createElement("input");
  input.type = type;
  input.value = value;
  if (placeholder) {
    input.placeholder = placeholder;
  }

  label.appendChild(input);
  return label;
}

function createQuarterFields(quarterLabel) {
  const defaultQuarter = parseQuarterLabel(getNextQuarterLabel(new Date()));
  const parsedQuarter = parseQuarterLabel(quarterLabel);
  const yearValue = parsedQuarter?.year ?? defaultQuarter.year;
  const seasonValue = parsedQuarter?.season ?? defaultQuarter.season;

  const wrapper = document.createElement("div");
  wrapper.className = "quarter-fields";

  const yearLabel = document.createElement("label");
  yearLabel.className = "field-quarter-year";
  yearLabel.textContent = "年";

  const yearInput = document.createElement("input");
  yearInput.type = "text";
  yearInput.inputMode = "numeric";
  yearInput.placeholder = "2026";
  yearInput.maxLength = 4;
  yearInput.value = yearValue;
  yearLabel.appendChild(yearInput);

  const seasonLabel = document.createElement("label");
  seasonLabel.className = "field-quarter-season";
  seasonLabel.textContent = "季節";

  const seasonSelect = document.createElement("select");
  SEASON_OPTIONS.forEach((season) => {
    const option = document.createElement("option");
    option.value = season;
    option.textContent = season;
    option.selected = season === seasonValue;
    seasonSelect.appendChild(option);
  });
  seasonLabel.appendChild(seasonSelect);

  wrapper.appendChild(yearLabel);
  wrapper.appendChild(seasonLabel);
  return wrapper;
}

function createMediaField(selectedMedia) {
  const label = document.createElement("label");
  label.className = "field-media";
  label.textContent = "メディア";

  const select = document.createElement("select");
  MEDIA_OPTIONS.forEach((media) => {
    const option = document.createElement("option");
    option.value = media;
    option.textContent = media;
    option.selected = media === selectedMedia;
    select.appendChild(option);
  });

  label.appendChild(select);
  return label;
}

function createWeekdayField(selectedWeekday) {
  const label = document.createElement("label");
  label.className = "field-weekday";
  label.textContent = "曜日";

  const select = document.createElement("select");
  WEEKDAY_OPTIONS.forEach(({ value, label: dayLabel }) => {
    const option = document.createElement("option");
    option.value = String(value);
    option.textContent = dayLabel;
    option.selected = Number(selectedWeekday) === value;
    select.appendChild(option);
  });

  label.appendChild(select);
  return label;
}

function collectEditorRows(container) {
  const rows = Array.from(container.querySelectorAll(".editor-row"));
  let hasInvalidYear = false;

  const normalizedRows = rows
    .map((row) => {
      const quarterYear = row.querySelector(".field-quarter-year input")?.value.trim() || "";
      const quarterSeason = row.querySelector(".field-quarter-season select")?.value.trim() || "";
      const weekday = Number(row.querySelector(".field-weekday select")?.value ?? NaN);
      const media = row.querySelector(".field-media select")?.value.trim() || "";
      const time = row.querySelector(".field-time input")?.value.trim() || "";
      const title = row.querySelector(".field-title input")?.value.trim() || "";

      const yearValid = /^\d{4}$/.test(quarterYear);
      if (quarterYear && !yearValid) {
        hasInvalidYear = true;
      }

      const quarter = composeQuarterLabel(quarterYear, quarterSeason);
      return [media, weekday, time, title, quarter, yearValid, quarterSeason];
    })
    .filter((item) => {
      const [media, weekday, time, title, quarter, yearValid, quarterSeason] = item;
      return media && Number.isInteger(weekday) && weekday >= 0 && weekday <= 6 && /^\d{2}:\d{2}$/.test(time) && title && quarter && yearValid && SEASON_OPTIONS.includes(quarterSeason);
    })
    .map(([media, weekday, time, title, quarter]) => [media, weekday, time, title, quarter]);

  return { rows: normalizedRows, hasInvalidYear };
}

function composeQuarterLabel(year, season) {
  if (!/^\d{4}$/.test(year) || !SEASON_OPTIONS.includes(season)) {
    return "";
  }
  return `${year}年${season}`;
}

function parseQuarterLabel(value) {
  const match = String(value ?? "").trim().match(/^(\d{4})年(春|夏|秋|冬)$/);
  if (!match) {
    return null;
  }
  return { year: match[1], season: match[2] };
}

function updateQuarterCounts(rows = programData) {
  const label = document.getElementById("quarter-counts");
  if (!label) {
    return;
  }

  const currentQuarter = getQuarterLabel(new Date());
  const nextQuarter = getNextQuarterLabel(new Date());
  const currentCount = rows.filter((item) => item[4] === currentQuarter).length;
  const nextCount = rows.filter((item) => item[4] === nextQuarter).length;
  label.textContent = `現クール: ${currentCount}件 / 次クール: ${nextCount}件`;
}

function downloadJson(json) {
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "anime-programs.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function toJsonRecords(rows) {
  return rows.map(([media, weekday, time, title, quarter]) => ({
    media,
    weekday,
    time,
    title,
    quarter
  }));
}

function fromJsonRecords(records) {
  if (!Array.isArray(records)) {
    return [];
  }

  return records
    .map((item) => {
      const weekday = Number(item.weekday);
      return [
        String(item.media ?? "").trim(),
        weekday,
        String(item.time ?? "").trim(),
        String(item.title ?? "").trim(),
        String(item.quarter ?? "").trim()
      ];
    })
    .filter((item) => {
      const [media, weekday, time, title, quarter] = item;
      return media && Number.isInteger(weekday) && weekday >= 0 && weekday <= 6 && /^\d{2}:\d{2}$/.test(time) && title && /^\d{4}年(春|夏|秋|冬)$/.test(quarter);
    });
}

function getProgramsByWeekday(weekday, quarter) {
  return programData
    .filter((item) => item[1] === weekday && item[4] === quarter)
    .sort((a, b) => a[2].localeCompare(b[2]))
    .map(([media, day, time, title, season]) => ({
      media,
      weekday: day,
      time,
      title,
      quarter: season
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
  schedule.textContent = `${WEEKDAY_LABELS[program.weekday]} / ${program.time} / ${program.quarter}`;

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

function getNextQuarterLabel(baseDate) {
  const currentQuarter = getQuarterInfo(baseDate);
  const nextSeasonIndex = (currentQuarter.seasonIndex + 1) % 4;
  const nextYear = currentQuarter.seasonIndex === 3 ? baseDate.getFullYear() + 1 : baseDate.getFullYear();
  return `${nextYear}年${currentQuarter.seasonLabels[nextSeasonIndex]}`;
}

function getQuarterLabel(baseDate) {
  const currentQuarter = getQuarterInfo(baseDate);
  return `${baseDate.getFullYear()}年${currentQuarter.seasonLabels[currentQuarter.seasonIndex]}`;
}

function getQuarterInfo(baseDate) {
  const seasonLabels = ["冬", "春", "夏", "秋"];
  const month = baseDate.getMonth() + 1;
  let currentSeasonIndex = 0;

  if (month >= 4 && month <= 6) {
    currentSeasonIndex = 1;
  } else if (month >= 7 && month <= 9) {
    currentSeasonIndex = 2;
  } else if (month >= 10 && month <= 12) {
    currentSeasonIndex = 3;
  }

  return {
    seasonLabels,
    seasonIndex: currentSeasonIndex
  };
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

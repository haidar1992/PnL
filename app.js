// ========= GLOBALT =========
// 🔐 AUTH – inloggning/utloggning

const authEmailInput = document.getElementById("auth-email");
const authPasswordInput = document.getElementById("auth-password");
const authRegisterBtn = document.getElementById("auth-register-btn");
const authLoginBtn = document.getElementById("auth-login-btn");
const authLogoutBtn = document.getElementById("auth-logout-btn");
const authMessageEl = document.getElementById("auth-message");
const authLoggedOutBox = document.getElementById("auth-logged-out");
const authLoggedInBox = document.getElementById("auth-logged-in");
const authUserEmailEl = document.getElementById("auth-user-email");

// Skapa konto
authRegisterBtn.addEventListener("click", async () => {
  const email = authEmailInput.value.trim();
  const password = authPasswordInput.value.trim();

  if (!email || !password) {
    authMessageEl.textContent = "Fyll i både e-post och lösenord.";
    return;
  }

  try {
    await auth.createUserWithEmailAndPassword(email, password);
    authMessageEl.textContent = "Konto skapat, du är inloggad 🎉";
  } catch (err) {
    authMessageEl.textContent = "Fel: " + err.message;
  }
});

// Logga in
authLoginBtn.addEventListener("click", async () => {
  const email = authEmailInput.value.trim();
  const password = authPasswordInput.value.trim();

  if (!email || !password) {
    authMessageEl.textContent = "Fyll i både e-post och lösenord.";
    return;
  }

  try {
    await auth.signInWithEmailAndPassword(email, password);
    authMessageEl.textContent = "Inloggad ✅";
  } catch (err) {
    authMessageEl.textContent = "Fel: " + err.message;
  }
});

// Logga ut
authLogoutBtn.addEventListener("click", async () => {
  try {
    await auth.signOut();
  } catch (err) {
    console.error(err);
  }
});

// Reagera på inloggnings-status
auth.onAuthStateChanged((user) => {
  if (user) {
    // Inloggad
    authLoggedOutBox.classList.add("hidden");
    authLoggedInBox.classList.remove("hidden");
    authUserEmailEl.textContent = user.email;
    console.log("Inloggad som:", user.uid);

    // 🔥 Ladda trades från Firestore för denna användare
    loadTradesFromFirestore(user);
  } else {
    // Utloggad
    authLoggedOutBox.classList.remove("hidden");
    authLoggedInBox.classList.add("hidden");
    authUserEmailEl.textContent = "";

    // När man loggar ut – ladda ev. lokala trades eller börja tomt
    trades = loadTrades();
    renderCalendar();
    renderTrades();
    renderTagFilter();

    const todayStr = formatDateObjToStr(new Date());
    selectedDate = todayStr;
    updateDayStats(todayStr);

    console.log("Utloggad");
  }
});


const STORAGE_KEY = "pnl_journal_trades_v2";

let trades = [];
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let selectedDate = null;
let activeTagFilter = null;
let displayCurrency = "SEK";

// DOM-element
const monthLabelEl = document.getElementById("month-label");
const calendarGridEl = document.getElementById("calendar-grid");

const monthPnLEl = document.getElementById("month-pnl");
const monthWinDaysEl = document.getElementById("month-win-days");
const monthLossDaysEl = document.getElementById("month-loss-days");
const monthWinrateEl = document.getElementById("month-winrate");

const statsDateEl = document.getElementById("stats-date");
const statsTradesEl = document.getElementById("stats-trades");
const statsWinsEl = document.getElementById("stats-wins");
const statsLossesEl = document.getElementById("stats-losses");
const statsBeEl = document.getElementById("stats-be");
const statsWinrateEl = document.getElementById("stats-winrate");
const statsTotalPnLEl = document.getElementById("stats-total-pnl");
const statsAvgPnLEl = document.getElementById("stats-avg-pnl");
const statsTotalREl = document.getElementById("stats-total-r");
const statsAvgREl = document.getElementById("stats-avg-r");

const tradeForm = document.getElementById("trade-form");
const tradeDateInput = document.getElementById("trade-date");
const instrumentInput = document.getElementById("instrument");
const directionInput = document.getElementById("direction");
const pnlInput = document.getElementById("pnl");
const riskInput = document.getElementById("risk");
const setupInput = document.getElementById("setup");
const tagsInput = document.getElementById("tags");
const notesInput = document.getElementById("notes");

const tradesBody = document.getElementById("trades-body");
const filterDateInput = document.getElementById("filter-date");
const clearFilterBtn = document.getElementById("clear-filter");
const exportCsvBtn = document.getElementById("export-csv");

const tagsContainer = document.getElementById("tags-container");
const clearTagFilterBtn = document.getElementById("clear-tag-filter");

const currencySelect = document.getElementById("currency-select");

// sektionerna för vy-byte
const sections = {
  calendar: document.getElementById("calendar-section"),
  journal: document.getElementById("journal-section"),
  stats: document.getElementById("stats-section"),
};

// ========= HJÄLPFUNKTIONER =========

const monthNames = [
  "Januari","Februari","Mars","April","Maj","Juni",
  "Juli","Augusti","September","Oktober","November","December"
];

function formatDateObjToStr(dateObj) {
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
  const dd = String(dateObj.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseTags(str) {
  if (!str) return [];
  return str
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

function formatPnLWithCurrency(value) {
  const val = Number(value || 0);
  const sign = val > 0 ? "+" : val < 0 ? "-" : "";
  const abs = Math.abs(val).toFixed(2);
  const symbol = displayCurrency === "USD" ? "$" : "kr";

  if (displayCurrency === "USD") {
    return `${sign}${symbol}${abs}`;
  } else {
    return `${sign}${abs} ${symbol}`;
  }
}

function loadTrades() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveTrades() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
}

function getTradesForDate(dateStr) {
  return trades.filter((t) => t.date === dateStr);
}

// ========= KALENDER =========

function renderCalendar() {
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const firstWeekday = firstDayOfMonth.getDay(); // 0 = söndag
  const daysInMonth = lastDayOfMonth.getDate();

  monthLabelEl.textContent = `${monthNames[currentMonth]} ${currentYear}`;
  calendarGridEl.innerHTML = "";

  const offset = (firstWeekday + 6) % 7; // måndag = 0

  for (let i = 0; i < offset; i++) {
    const cell = document.createElement("div");
    cell.className = "calendar-cell empty";
    calendarGridEl.appendChild(cell);
  }

  let monthTotalPnL = 0;
  let winDays = 0;
  let lossDays = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const cell = document.createElement("div");
    cell.className = "calendar-cell";

    const dateObj = new Date(currentYear, currentMonth, day);
    const dateStr = formatDateObjToStr(dateObj);
    const dayTrades = getTradesForDate(dateStr);

    const dayTotal = dayTrades.reduce(
      (sum, t) => sum + Number(t.pnl || 0),
      0
    );

    let dayTotalR = 0;
    dayTrades.forEach((t) => {
      const pnl = Number(t.pnl || 0);
      const risk = Number(t.risk || 0);
      if (risk > 0) dayTotalR += pnl / risk;
    });

    const dateEl = document.createElement("div");
    dateEl.className = "calendar-date";
    dateEl.textContent = day;

    const pnlEl = document.createElement("div");
    pnlEl.className = "calendar-pnl";

    const metaEl = document.createElement("div");
    metaEl.className = "calendar-meta";

    if (dayTrades.length === 0) {
      pnlEl.textContent = "-";
      cell.classList.add("flat");
    } else {
      pnlEl.textContent = formatPnLWithCurrency(dayTotal);
      metaEl.textContent = `${dayTrades.length} trades • ${dayTotalR.toFixed(2)}R`;

      if (dayTotal > 0) {
        cell.classList.add("win");
        winDays++;
      } else if (dayTotal < 0) {
        cell.classList.add("loss");
        lossDays++;
      } else {
        cell.classList.add("flat");
      }
      monthTotalPnL += dayTotal;
    }

    cell.appendChild(dateEl);
    cell.appendChild(pnlEl);
    if (dayTrades.length > 0) cell.appendChild(metaEl);

    cell.addEventListener("click", () => {
      selectedDate = dateStr;
      tradeDateInput.value = dateStr;
      updateDayStats(dateStr);
      setView("stats"); // hoppa till statistik när man klickar en dag
    });

    calendarGridEl.appendChild(cell);
  }

  monthPnLEl.textContent = formatPnLWithCurrency(monthTotalPnL);
  monthWinDaysEl.textContent = winDays;
  monthLossDaysEl.textContent = lossDays;

  const daysWithResult = winDays + lossDays;
  const winrateDays =
    daysWithResult > 0 ? ((winDays / daysWithResult) * 100).toFixed(1) : "0.0";
  monthWinrateEl.textContent = winrateDays;
}

// ========= DAGLIG STATISTIK =========

function calculateDayStats(dateStr) {
  const dayTrades = getTradesForDate(dateStr);
  const totalTrades = dayTrades.length;
  if (totalTrades === 0) {
    return {
      date: dateStr,
      totalTrades: 0,
      wins: 0,
      losses: 0,
      be: 0,
      winrate: 0,
      totalPnL: 0,
      avgPnL: 0,
      totalR: 0,
      avgR: 0,
    };
  }

  let wins = 0;
  let losses = 0;
  let be = 0;
  let totalPnL = 0;
  let totalR = 0;
  let rCount = 0;

  dayTrades.forEach((t) => {
    const pnl = Number(t.pnl || 0);
    const risk = Number(t.risk || 0);

    totalPnL += pnl;
    if (pnl > 0) wins++;
    else if (pnl < 0) losses++;
    else be++;

    if (risk > 0) {
      totalR += pnl / risk;
      rCount++;
    }
  });

  const winrate = (wins / totalTrades) * 100;
  const avgPnL = totalPnL / totalTrades;
  const avgR = rCount > 0 ? totalR / rCount : 0;

  return {
    date: dateStr,
    totalTrades,
    wins,
    losses,
    be,
    winrate,
    totalPnL,
    avgPnL,
    totalR,
    avgR,
  };
}

function updateDayStats(dateStr) {
  if (!dateStr) {
    statsDateEl.textContent = "–";
    statsTradesEl.textContent = "0";
    statsWinsEl.textContent = "0";
    statsLossesEl.textContent = "0";
    statsBeEl.textContent = "0";
    statsWinrateEl.textContent = "0";
    statsTotalPnLEl.textContent = "0";
    statsAvgPnLEl.textContent = "0";
    statsTotalREl.textContent = "0";
    statsAvgREl.textContent = "0";
    return;
  }

  const s = calculateDayStats(dateStr);
  statsDateEl.textContent = s.date;
  statsTradesEl.textContent = s.totalTrades;
  statsWinsEl.textContent = s.wins;
  statsLossesEl.textContent = s.losses;
  statsBeEl.textContent = s.be;
  statsWinrateEl.textContent = s.winrate.toFixed(1);
  statsTotalPnLEl.textContent = formatPnLWithCurrency(s.totalPnL);
  statsAvgPnLEl.textContent = formatPnLWithCurrency(s.avgPnL);
  statsTotalREl.textContent = s.totalR.toFixed(2);
  statsAvgREl.textContent = s.avgR.toFixed(2);
}

// ========= TAGS =========

function getAllTags() {
  const set = new Set();
  trades.forEach((t) => {
    const tags = Array.isArray(t.tags) ? t.tags : parseTags(t.tags || "");
    tags.forEach((tag) => {
      if (tag) set.add(tag);
    });
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function tradeHasTag(trade, tag) {
  if (!tag) return true;
  const tags = Array.isArray(trade.tags) ? trade.tags : parseTags(trade.tags || "");
  return tags.some((t) => t.toLowerCase() === tag.toLowerCase());
}

function renderTagFilter() {
  tagsContainer.innerHTML = "";
  const tags = getAllTags();
  if (tags.length === 0) return;

  tags.forEach((tag) => {
    const chip = document.createElement("span");
    chip.className = "tag-chip";
    if (activeTagFilter === tag) chip.classList.add("active");
    chip.textContent = tag;
    chip.addEventListener("click", () => {
      activeTagFilter = activeTagFilter === tag ? null : tag;
      renderTagFilter();
      renderTrades();
    });
    tagsContainer.appendChild(chip);
  });
}

// ========= JOURNAL / TABELL =========

function renderTrades() {
  const filterDate = filterDateInput.value || null;
  tradesBody.innerHTML = "";

  const sorted = [...trades].sort((a, b) =>
    a.date < b.date ? 1 : -1
  );

  sorted.forEach((t) => {
    if (filterDate && t.date !== filterDate) return;
    if (activeTagFilter && !tradeHasTag(t, activeTagFilter)) return;

    const tr = document.createElement("tr");

    const pnlVal = Number(t.pnl || 0);
    const riskVal = Number(t.risk || 0);
    const rMult = riskVal > 0 ? pnlVal / riskVal : null;
    const tags = Array.isArray(t.tags)
      ? t.tags
      : parseTags(t.tags || "");

    tr.innerHTML = `
      <td>${t.date}</td>
      <td>${t.instrument}</td>
      <td>${t.direction}</td>
      <td class="${pnlVal > 0 ? "pnl-positive" : pnlVal < 0 ? "pnl-negative" : ""}">
        ${formatPnLWithCurrency(pnlVal)}
      </td>
      <td>${riskVal ? riskVal.toFixed(2) : "-"}</td>
      <td>${rMult !== null ? rMult.toFixed(2) : "-"}</td>
      <td>${t.setup || "-"}</td>
      <td>${tags.join(", ")}</td>
      <td>${t.notes || "-"}</td>
      <td><button class="delete-btn">Ta bort</button></td>
    `;

    tr.querySelector(".delete-btn").addEventListener("click", () => {
      trades = trades.filter((x) => x.id !== t.id);
      saveTrades();
      renderCalendar();
      renderTrades();
      renderTagFilter();
      if (selectedDate) updateDayStats(selectedDate);
    });

    tradesBody.appendChild(tr);
  });
}


// ========= CSV =========

function escapeCsvField(value) {
  if (value == null) return "";
  const str = String(value);
  if (/[;"\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function exportToCSV() {
  if (trades.length === 0) {
    alert("Inga trades att exportera.");
    return;
  }

  const headers = [
    "Date","Instrument","Direction","PnL","Risk","R_multiple","Setup","Tags","Notes"
  ];

  const rows = trades.map((t) => {
    const pnl = Number(t.pnl || 0);
    const risk = Number(t.risk || 0);
    const rMult = risk > 0 ? pnl / risk : "";
    const tags = Array.isArray(t.tags)
      ? t.tags.join("|")
      : parseTags(t.tags || "").join("|");

    return [
      t.date,
      t.instrument,
      t.direction,
      pnl.toFixed(2),
      risk ? risk.toFixed(2) : "",
      rMult === "" ? "" : rMult.toFixed(2),
      t.setup || "",
      tags,
      t.notes || "",
    ];
  });

  let csv = headers.join(";") + "\n";
  csv += rows
    .map((row) => row.map((f) => escapeCsvField(f)).join(";"))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "trades.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ========= VY-HANTERING =========

function setView(view) {
  Object.entries(sections).forEach(([name, el]) => {
    if (!el) return;
    if (name === view) el.classList.remove("hidden");
    else el.classList.add("hidden");
  });

  document.querySelectorAll(".view-btn").forEach((btn) => {
    if (btn.dataset.view === view) btn.classList.add("active");
    else btn.classList.remove("active");
  });
}

// ========= EVENT LISTENERS =========

// vy-knappar
document.querySelectorAll(".view-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const view = btn.dataset.view;
    setView(view);
  });
});

// månadsknappar
document.getElementById("prev-month").addEventListener("click", () => {
  currentMonth--;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  renderCalendar();
});

document.getElementById("next-month").addEventListener("click", () => {
  currentMonth++;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  renderCalendar();
});

// valuta
currencySelect.addEventListener("change", () => {
  displayCurrency = currencySelect.value;
  renderCalendar();
  renderTrades();
  if (selectedDate) updateDayStats(selectedDate);
});

// form
tradeForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const user = auth.currentUser;
  if (!user) {
    alert("Du måste vara inloggad för att spara din journal i molnet.");
    return;
  }

  const date = tradeDateInput.value;
  const instrument = instrumentInput.value.trim();
  const direction = directionInput.value;
  const pnl = Number(pnlInput.value);
  const risk = riskInput.value === "" ? null : Number(riskInput.value);
  const setup = setupInput.value.trim();
  const tags = parseTags(tagsInput.value);
  const notes = notesInput.value.trim();

  if (!date || !instrument || !direction || isNaN(pnl)) {
    alert("Fyll i datum, instrument, riktning och PnL.");
    return;
  }

  const newTrade = {
    id: Date.now(), // används lokalt i tabellen
    date,
    instrument,
    direction,
    pnl,
    risk: isNaN(risk) ? null : risk,
    setup,
    tags,
    notes,
  };

  // 1) Lägg till lokalt (så kalendern uppdateras direkt)
  trades.push(newTrade);
  saveTrades();
  renderCalendar();
  renderTrades();
  renderTagFilter();

  selectedDate = date;
  updateDayStats(date);

  // 2) Försök spara samma trade i Firestore
  try {
    await db.collection("trades").add({
      userId: user.uid,
      date,
      instrument,
      direction,
      pnl,
      risk: isNaN(risk) ? null : risk,
      setup,
      tags,
      notes,
      createdAt: new Date()
    });
    console.log("Trade sparad i Firestore");
  } catch (err) {
    console.error("Kunde inte spara i Firestore:", err);
    // du kan välja att visa alert här om du vill
  }

  // 3) Töm formuläret
  instrumentInput.value = "";
  directionInput.value = "";
  pnlInput.value = "";
  riskInput.value = "";
  setupInput.value = "";
  tagsInput.value = "";
  notesInput.value = "";

  alert("Trade sparad!");
});


// filter datum
filterDateInput.addEventListener("change", () => {
  renderTrades();
});

// rensa filter
clearFilterBtn.addEventListener("click", () => {
  filterDateInput.value = "";
  renderTrades();
});

// rensa tagfilter
clearTagFilterBtn.addEventListener("click", () => {
  activeTagFilter = null;
  renderTagFilter();
  renderTrades();
});

// CSV
exportCsvBtn.addEventListener("click", exportToCSV);

// ========= INIT & LOADER =========

function setDefaultDateToToday() {
  const today = new Date();
  tradeDateInput.value = formatDateObjToStr(today);
}

function init() {
  trades = loadTrades();
  setDefaultDateToToday();

  const todayStr = formatDateObjToStr(new Date());
  selectedDate = todayStr;

  renderCalendar();
  renderTrades();
  renderTagFilter();
  updateDayStats(todayStr);

  currencySelect.value = displayCurrency;
  setView("calendar"); // startvyn

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("service-worker.js")
      .catch(() => {});
  }
}
async function loadTradesFromFirestore(user) {
  try {
    const snapshot = await db
      .collection("trades")
      .where("userId", "==", user.uid)
      .orderBy("date")
      .get();

    trades = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      trades.push({
        id: doc.id,                                // använd dokument-ID som id
        date: data.date,
        instrument: data.instrument || "",
        direction: data.direction || "",
        pnl: Number(data.pnl || 0),
        risk: data.risk != null ? Number(data.risk) : null,
        setup: data.setup || "",
        tags: data.tags || [],
        notes: data.notes || "",
      });
    });

    // spara även lokalt så du har backup/offline
    saveTrades();

    renderCalendar();
    renderTrades();
    renderTagFilter();

    const todayStr = formatDateObjToStr(new Date());
    selectedDate = todayStr;
    updateDayStats(todayStr);

    console.log("Trades laddade från Firestore:", trades.length);
  } catch (err) {
    console.error("Kunde inte ladda trades från Firestore:", err);
  }
}

init();

window.addEventListener("load", () => {
  const loader = document.getElementById("loading-screen");
  if (loader) {
    setTimeout(() => {
      loader.style.opacity = "0";
      setTimeout(() => loader.remove(), 300);
    }, 1500);
  }
});
// ============================
// 🔥 ENKEL FIRESTORE-TEST
// ============================
document.addEventListener("DOMContentLoaded", () => {
  const testBtn = document.getElementById("firestore-test-btn");
  if (!testBtn) return;

  testBtn.addEventListener("click", async () => {
    try {
      const user = auth.currentUser;

      if (!user) {
        alert("Logga in först innan du testar Firestore.");
        return;
      }

      const docRef = await db.collection("trades").add({
        userId: user.uid,
        date: new Date().toISOString().slice(0, 10),
        pnl: 0,
        note: "Test från knappen",
        createdAt: new Date()
      });

      console.log("Test-dokument sparat med ID:", docRef.id);
      alert("Firestore funkar! Dokument-ID: " + docRef.id);
    } catch (err) {
      console.error("Firestore-test fel:", err);
      alert("Firestore-fel: " + err.message);
    }
  });
});


/* ===== Допоміжні функції ===== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const money = n => n.toLocaleString("uk-UA") + " ₴";
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
// екранування тексту, який вводить користувач
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const initials = name => name.split(/[\s&]+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("");
const stars = n => "★".repeat(n) + "☆".repeat(5 - n);

/* ===== Картки на основі бази даних ===== */
const serviceCard = s => `<article class="svc" data-info="${s.id}">
  <div class="ico">${categories[s.cat].icon}</div><h3>${s.name}</h3><p>${s.short}</p>
  <div class="meta"><span>${s.duration} хв</span><b>від ${money(s.price)}</b></div></article>`;
const doctorCard = d => `<article class="doc"><div class="avatar">${initials(d.name)}</div>
  <h3>${d.name}</h3><small>${d.spec} · стаж ${d.exp} р.</small><p>${d.text}</p></article>`;
const reviewCard = r => `<article class="rev"><div class="stars">${stars(r.rate)}</div><p>«${esc(r.text)}»</p>
  <div class="who"><div class="avatar">${initials(r.name)}</div><div><b>${esc(r.name)}</b><small>${esc(r.pet || "")}</small></div></div></article>`;

/* ===== Модальні вікна (створюються через JS) ===== */
document.body.insertAdjacentHTML("beforeend", `
  <dialog id="infoDlg"><div id="infoBody"></div></dialog>
  <dialog id="bookDlg"><h3>Запис на прийом</h3><div id="bookBox"></div>
    <button type="button" class="btn light small" data-close style="margin-top:12px">Закрити</button></dialog>`);

function openInfo(id) {
  const s = services.find(x => x.id == id);
  const rows = [["Категорія", categories[s.cat].name], ["Для кого", s.animals.map(a => animals[a]).join(", ")],
                ["Тривалість", s.duration + " хв"], ["Вартість", "від " + money(s.price)]];
  $("#infoBody").innerHTML = `<h3>${s.name}</h3><p class="found">${s.short}</p>
    <table class="spec">${rows.map(r => `<tr><th>${r[0]}</th><td>${r[1]}</td></tr>`).join("")}</table>
    <b>У вартість входить:</b><ul>${s.includes.map(i => `<li>${i}</li>`).join("")}</ul>
    <div class="dlg-btns"><button class="btn" data-book="${s.id}">Записатися</button>
    <button class="btn light" data-close>Закрити</button></div>`;
  $("#infoDlg").showModal();
}

/* ===== Форма запису на прийом ===== */
function bookingHTML() {
  const today = new Date().toISOString().slice(0, 10);
  const times = Array.from({ length: 13 }, (_, i) => `<option>${String(8 + i).padStart(2, "0")}:00</option>`).join("");
  return `<form class="f" novalidate>
    <div class="row"><label>Ім'я<input name="name"></label><label>Телефон<input name="phone" placeholder="+380..."></label></div>
    <div class="row"><label>Вид тварини<select name="animal">${Object.entries(animals).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></label>
    <label>Послуга<select name="service"></select></label></div>
    <div class="row"><label>Дата<input type="date" name="date" min="${today}"></label><label>Час<select name="time">${times}</select></label></div>
    <label>Коментар<textarea name="comment" rows="2" placeholder="Коротко опишіть причину візиту"></textarea></label>
    <div class="estimate" data-est></div><div class="err" data-err></div>
    <button class="btn">Записатися на прийом</button></form>`;
}
function mountBooking(box, serviceId) {
  box.innerHTML = bookingHTML();
  const f = $("form", box), est = $("[data-est]", box), err = $("[data-err]", box);
  // динамічне оновлення: список послуг залежить від виду тварини, вартість — від обраної послуги
  function fillServices(selected) {
    const list = services.filter(s => s.animals.includes(f.animal.value));
    f.service.innerHTML = list.map(s => `<option value="${s.id}">${s.name}</option>`).join("");
    if (selected && list.some(s => s.id == selected)) f.service.value = selected;
    showEstimate();
  }
  function showEstimate() {
    const s = services.find(x => x.id == f.service.value);
    est.textContent = s ? `Орієнтовна вартість: ${money(s.price)} · тривалість: ${s.duration} хв` : "";
  }
  if (serviceId) { const s = services.find(x => x.id == serviceId); if (!s.animals.includes(f.animal.value)) f.animal.value = s.animals[0]; }
  fillServices(serviceId);
  f.animal.addEventListener("change", () => fillServices());
  f.service.addEventListener("change", showEstimate);
  f.addEventListener("submit", e => {
    e.preventDefault();
    const name = f.name.value.trim(), phone = f.phone.value.replace(/[\s()-]/g, "");
    if (name.length < 2) return err.textContent = "Введіть ім'я";
    if (!/^\+?\d{10,13}$/.test(phone)) return err.textContent = "Некоректний номер телефону";
    if (!f.date.value || f.date.value < f.date.min) return err.textContent = "Оберіть дату візиту (не раніше сьогодні)";
    const list = load("appointments", []);
    list.push({ id: Date.now(), name, phone, animal: f.animal.value, service: +f.service.value, date: f.date.value, time: f.time.value, comment: f.comment.value.trim() });
    save("appointments", list);
    box.innerHTML = `<div class="ok"><b>Дякуємо, ${esc(name)}!</b><br>Заявку №${list.length} прийнято. Адміністратор зателефонує для підтвердження.</div>`;
    renderAppointments();
  });
}
function openBooking(serviceId) { mountBooking($("#bookBox"), serviceId); $("#bookDlg").showModal(); }

/* ===== Делегування кліків ===== */
document.addEventListener("click", e => {
  const t = e.target;
  const info = t.closest("[data-info]"); if (info) openInfo(info.dataset.info);
  const book = t.closest("[data-book]");
  if (book) { if ($("#infoDlg").open) $("#infoDlg").close(); openBooking(book.dataset.book || undefined); }
  if (t.closest("[data-close]")) t.closest("dialog").close();
  const del = t.closest("[data-del]");
  if (del) { save("appointments", load("appointments", []).filter(a => a.id != del.dataset.del)); renderAppointments(); }
});

/* ===== Головна сторінка ===== */
const catBox = $("#catCards");
if (catBox) {
  catBox.innerHTML = Object.entries(categories).map(([k, c]) => `<a class="cat" href="services.html?cat=${k}">
    <div class="ico">${c.icon}</div><h3>${c.name}</h3><p>${c.text}</p><span class="arrow">→</span></a>`).join("");
}
$$("[data-count]").forEach(el => {            // анімація лічильників
  const end = parseFloat(el.dataset.count), dec = end % 1 ? 1 : 0, plus = el.dataset.plus || "";
  let n = 0; const step = end / 40;
  const timer = setInterval(() => { n = Math.min(end, n + step); el.textContent = n.toLocaleString("uk-UA", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + (n >= end ? plus : ""); if (n >= end) clearInterval(timer); }, 30);
});

/* ===== Каталог послуг: пошук, фільтри, сортування ===== */
const svcBox = $("#svcGrid");
if (svcBox) {
  const params = new URLSearchParams(location.search);
  let cat = params.get("cat") || "all";
  const q = $("#q"), animal = $("#animal"), sort = $("#sort");
  $("#chips").innerHTML = `<button class="chip" data-cat="all">Усі</button>` +
    Object.entries(categories).map(([k, c]) => `<button class="chip" data-cat="${k}">${c.name}</button>`).join("");
  animal.innerHTML = `<option value="all">Усі тварини</option>` + Object.entries(animals).map(([k, v]) => `<option value="${k}">${v}</option>`).join("");
  function update() {
    let list = services.filter(s => (cat === "all" || s.cat === cat) && (animal.value === "all" || s.animals.includes(animal.value)) &&
      s.name.toLowerCase().includes(q.value.trim().toLowerCase()));
    if (sort.value === "asc") list.sort((a, b) => a.price - b.price);
    if (sort.value === "desc") list.sort((a, b) => b.price - a.price);
    if (sort.value === "name") list.sort((a, b) => a.name.localeCompare(b.name, "uk"));
    svcBox.innerHTML = list.length ? list.map(serviceCard).join("") : '<p class="found">Нічого не знайдено</p>';
    $("#found").textContent = "Знайдено послуг: " + list.length;
    $$(".chip", $("#chips")).forEach(c => c.classList.toggle("on", c.dataset.cat === cat));
  }
  $("#chips").addEventListener("click", e => { if (e.target.dataset.cat) { cat = e.target.dataset.cat; update(); } });
  [q, animal, sort].forEach(el => el.addEventListener("input", update));
  update();
}

/* ===== Лікарі ===== */
const docBox = $("#docGrid");
if (docBox) {
  const specs = [...new Set(doctors.map(d => d.spec))];
  let spec = "all";
  $("#docChips").innerHTML = ["all", ...specs].map(s => `<button class="chip" data-spec="${s}">${s === "all" ? "Усі" : s}</button>`).join("");
  const draw = () => {
    docBox.innerHTML = doctors.filter(d => spec === "all" || d.spec === spec).map(doctorCard).join("");
    $$(".chip", $("#docChips")).forEach(c => c.classList.toggle("on", c.dataset.spec === spec));
  };
  $("#docChips").addEventListener("click", e => { if (e.target.dataset.spec) { spec = e.target.dataset.spec; draw(); } });
  draw();
}

/* ===== Відгуки (форма додає відгук на сторінку без перезавантаження) ===== */
const revBox = $("#revGrid");
const showReviews = () => { if (revBox) revBox.innerHTML = [...seedReviews, ...load("reviews", [])].map(reviewCard).join(""); };
showReviews();
const rf = $("#reviewForm");
if (rf) rf.addEventListener("submit", e => {
  e.preventDefault();
  const name = rf.name.value.trim(), text = rf.text.value.trim(), err = $("#revErr");
  if (name.length < 2) return err.textContent = "Вкажіть ім'я";
  if (text.length < 10) return err.textContent = "Напишіть відгук (мінімум 10 символів)";
  const all = load("reviews", []); all.push({ name, pet: rf.pet.value.trim(), rate: +rf.rate.value, text });
  save("reviews", all); rf.reset(); err.textContent = ""; showReviews();
});

/* ===== Заявки користувача ===== */
function renderAppointments() {
  const box = $("#myList"); if (!box) return;
  const list = load("appointments", []);
  box.innerHTML = list.length ? list.map(a => { const s = services.find(x => x.id == a.service);
    return `<div class="item"><span><b>${s ? s.name : "Послуга"}</b><br>${a.date}, ${a.time} · ${esc(a.name)}</span><button data-del="${a.id}">Скасувати</button></div>`; }).join("")
    : '<p class="found">Заявок поки немає</p>';
}
renderAppointments();
const inline = $("#bookInline"); if (inline) mountBooking(inline);

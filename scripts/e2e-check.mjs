import { chromium } from "playwright-core";
import { PrismaClient } from "@prisma/client";
import assert from "node:assert/strict";

const base = process.env.E2E_BASE || "http://localhost:3100";
const chrome =
  process.env.CHROME_PATH ||
  (process.platform === "darwin" ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : "/usr/bin/google-chrome");
const results = [];
const stamp = Date.now();

function ok(name, detail = "") {
  results.push(`PASS ${name}${detail ? " — " + detail : ""}`);
  console.log(results[results.length - 1]);
}

async function api(page, url, opts = {}) {
  return page.evaluate(
    async ({ url, opts }) => {
      const res = await fetch(url, opts);
      let body = null;
      try {
        body = await res.json();
      } catch {}
      return { status: res.status, body };
    },
    { url, opts }
  );
}

const prisma = new PrismaClient();
const stale = await prisma.clinic.findMany({ where: { name: { startsWith: "E2E Klinika" } } });
for (const c of stale) {
  await prisma.user.deleteMany({ where: { clinicId: c.id } });
  await prisma.record.deleteMany({ where: { clinicId: c.id } });
  await prisma.clinic.delete({ where: { id: c.id } });
}

const browser = await chromium.launch({ executablePath: chrome, headless: true });

try {
  /* ---------- A. demo clinic: adapter CRUD + persistence ---------- */
  const ctxA = await browser.newContext({ viewport: { width: 1500, height: 1000 } });
  const pageA = await ctxA.newPage();
  await pageA.goto(base + "/login");
  let r = await api(pageA, "/api/auth/demo", { method: "POST" });
  assert.equal(r.status, 200, "demo login");

  await pageA.goto(base + "/app", { waitUntil: "load" });
  // demo appointments carry fixed seed dates, so open the day they live on
  const demoSeed = await prisma.record.findFirst({ where: { collection: "appointments", docId: "dd-demo-a1" } });
  if (demoSeed) {
    const demoDay = JSON.parse(demoSeed.data).date;
    await pageA.waitForSelector("#dayPick", { timeout: 15000 });
    await pageA.evaluate((day) => {
      const el = document.querySelector("#dayPick");
      if (!el || el.value === day) return;
      el.value = day;
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }, demoDay);
  }
  await pageA.waitForFunction(() => document.body.innerText.includes("Dilnoza Rasulova"), null, { timeout: 15000 });
  ok("Demo ma'lumotlari UI'da ko'rinadi");

  const snapshotA = async () => (await api(pageA, "/api/db/snapshot")).body;
  const before = await snapshotA();
  // earlier demo-clinic tests may have added patients, so compare against a floor + demo ids
  const demoPats = Object.keys(before.collections.patients || {}).filter((id) => id.startsWith("dd-demo-p"));
  assert.equal(demoPats.length, 10);
  assert.equal(Object.keys(before.collections.appointments || {}).filter((id) => id.startsWith("dd-demo-")).length, 8);
  ok("Demo snapshot: 10 demo bemor, 8 qabul");

  // in-app AI assistant drawer
  await pageA.click("#ddai-fab");
  await pageA.waitForSelector("#ddai.open", { timeout: 3000 });
  await pageA.fill("#ddai-input", "bugun navbatlar");
  await pageA.press("#ddai-input", "Enter");
  await pageA.waitForFunction(
    () => Array.from(document.querySelectorAll(".ddai-msg.bot")).some((el) => el.innerText.includes("navbat")),
    null,
    { timeout: 10000 }
  );
  ok("AI yordamchi paneli ochiladi va navbatlarni ko'rsatadi");
  await pageA.evaluate(() => document.querySelector("#ddai-close").click());

  // adapter write (same path the app uses)
  const writeRes = await pageA.evaluate(async () => {
    const db = await window.claude.use("db");
    await db.collection("patients").doc("e2e-patient").set({
      name: "E2E Bemor",
      phone: "+998 90 000 00 00",
      dob: "1990-01-01",
      createdAt: Date.now(),
      e2e: true,
    });
    return true;
  });
  assert.ok(writeRes);
  let snap = await snapshotA();
  assert.equal(snap.collections.patients["e2e-patient"].name, "E2E Bemor");
  ok("Adapter orqali bemor qo'shildi");

  // persistence across reload + visible in UI
  await pageA.goto(base + "/app#patients", { waitUntil: "load" });
  await pageA.waitForFunction(() => document.body.innerText.includes("E2E Bemor"), null, { timeout: 15000 });
  ok("Reload'dan keyin bemor ro'yxatda ko'rinadi");

  // patch via adapter
  await pageA.evaluate(async () => {
    const db = await window.claude.use("db");
    await db.collection("patients").doc("e2e-patient").update({ name: "E2E Bemor 2" });
  });
  snap = await snapshotA();
  assert.equal(snap.collections.patients["e2e-patient"].name, "E2E Bemor 2");
  assert.equal(snap.collections.patients["e2e-patient"].phone, "+998 90 000 00 00");
  ok("PATCH maydonlarni birlashtiradi");

  // isolation: demo clinic must not see e2e clinic data later; for now delete
  await pageA.evaluate(async () => {
    const db = await window.claude.use("db");
    await db.collection("patients").doc("e2e-patient").delete();
  });
  snap = await snapshotA();
  assert.equal(snap.collections.patients["e2e-patient"], undefined);
  ok("DELETE ishlaydi");

  /* ---------- A2. public booking -> reception queue -> confirmation ---------- */
  r = await api(pageA, "/api/public/demo");
  assert.equal(r.status, 200);
  assert.equal(r.body.clinic.slug, "demo");
  assert.ok(r.body.doctors.length >= 3, "public doctors");
  assert.equal(r.body.days.length, 14);
  ok("Ommaviy sahifa: klinika, shifokorlar va 14 kunlik taqvim");

  const pubDoc = r.body.doctors[0].id;
  let pubDay = "";
  let pubSlots = [];
  for (const day of r.body.days.slice(0, 6)) {
    const s = await api(pageA, `/api/public/demo/slots?doctorId=${encodeURIComponent(pubDoc)}&date=${day}`);
    if (s.status === 200 && s.body.slots.length) {
      pubDay = day;
      pubSlots = s.body.slots;
      break;
    }
  }
  assert.ok(pubDay, "public free day");
  const pubTime = pubSlots[0];
  const pubPhone = "+998 90 " + String(stamp).slice(-7);
  const pubName = "E2E Public " + stamp;
  const publicRequest = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: pubName,
      phone: pubPhone,
      doctorId: pubDoc,
      date: pubDay,
      time: pubTime,
      reason: "checkup",
      lang: "uz",
    }),
  };
  r = await api(pageA, "/api/public/demo/request", publicRequest);
  assert.equal(r.status, 201);
  const pubId = r.body.request.id;
  ok("Ommaviy so'rov qabul qilindi", `${pubDay} ${pubTime}`);

  r = await api(pageA, "/api/public/demo/request", publicRequest);
  assert.equal(r.status, 409);
  assert.equal(r.body.error, "duplicate");
  const held = await api(pageA, `/api/public/demo/slots?doctorId=${encodeURIComponent(pubDoc)}&date=${pubDay}`);
  assert.ok(!held.body.slots.includes(pubTime), "requested slot must stay held");
  ok("Takroriy so'rov rad etildi, vaqt ommaviy sahifada band");

  await pageA.goto(base + "/app#requests", { waitUntil: "load" });
  await pageA.waitForFunction((name) => document.body.innerText.includes(name), pubName, { timeout: 15000 });
  let pubCard = pageA.locator(".qcard", { hasText: pubName });
  await pubCard.locator('[data-act="req-contact"]').click();
  await pageA.waitForSelector("#qcNote");
  await pageA.selectOption("#qcChannel", "call");
  await pageA.fill("#qcNote", "E2E: bemor bilan kelishildi");
  await pageA.click('#modalForm button[type="submit"]');
  await pageA.waitForSelector(".qcard .pill.s-contacted", { timeout: 8000 });
  ok("Qabul xodimi aloqani qayd etdi (contacted)");

  await pageA.locator(".qcard", { hasText: pubName }).locator('[data-act="req-confirm"]').click();
  await pageA.waitForSelector("#cfSlots .slot");
  await pageA.click('#modalForm button[type="submit"]');
  await pageA.waitForFunction(
    (name) => ![...document.querySelectorAll(".qcard")].some((c) => c.innerText.includes(name)),
    pubName,
    { timeout: 10000 }
  );

  snap = await snapshotA();
  assert.equal(snap.collections.reqstate[pubId].status, "confirmed");
  const pubAppt = Object.entries(snap.collections.appointments).find(([, a]) => a.requestId === pubId);
  assert.ok(pubAppt, "confirmed appointment");
  assert.equal(pubAppt[1].source, "online");
  const pubPatient = Object.entries(snap.collections.patients).find(([, p]) => p.name === pubName);
  assert.ok(pubPatient, "patient created from the request");
  const pubSlotKey = `${pubDoc}_${pubDay}_${pubTime.replace(":", "")}`;
  assert.ok(snap.collections.slots[pubSlotKey], "slot synced");
  ok("Tasdiqlash bemor, navbat va slot yaratdi");

  /* ---------- A3. call centre role: queue only, no clinical records ---------- */
  const ccEmail = `e2e-cc3-${stamp}@test.uz`;
  r = await api(pageA, "/api/staff", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "E2E Call Markaz",
      email: ccEmail,
      password: "callcenter12345",
      role: "callcenter",
    }),
  });
  assert.equal(r.status, 200);

  const pageCC = await (await browser.newContext({ viewport: { width: 1500, height: 1000 } })).newPage();
  await pageCC.goto(base + "/login");
  r = await api(pageCC, "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ccEmail, password: "callcenter12345" }),
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.role, "callcenter");

  await pageCC.goto(base + "/app", { waitUntil: "load" });
  await pageCC.waitForSelector("#view-requests:not([hidden])", { timeout: 15000 });
  assert.equal(await pageCC.locator('.tab[data-to="patients"]').count(), 0);
  ok("Call markaz qabul navbatiga tushadi, bemorlar bo'limi yo'q");

  const ccSnap = (await api(pageCC, "/api/db/snapshot")).body;
  assert.equal(ccSnap.collections.visits, undefined);
  assert.equal(ccSnap.collections.history, undefined);
  assert.ok(
    Object.values(ccSnap.collections.patients || {}).every((p) => p.alerts === undefined && p.alertIds === undefined)
  );
  r = await api(pageCC, "/api/db/visits/e2e-visit", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: { patientId: "x", createdAt: Date.now(), procedures: [] } }),
  });
  assert.equal(r.status, 403);
  assert.equal((await api(pageCC, "/api/db/visits/e2e-visit")).status, 403);
  ok("Call markaz klinik yozuvlarni ko'rmaydi va yoza olmaydi (403)");

  // Call centre can still take a new public request through contact + confirm.
  const free2 = await api(pageA, `/api/public/demo/slots?doctorId=${encodeURIComponent(pubDoc)}&date=${pubDay}`);
  assert.ok(free2.body.slots.length, "second public slot");
  const pub2Time = free2.body.slots[0];
  const pub2Name = "E2E Callcentre " + stamp;
  r = await api(pageA, "/api/public/demo/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: pub2Name,
      phone: "+998 93 " + String(stamp).slice(-7),
      doctorId: pubDoc,
      date: pubDay,
      time: pub2Time,
      reason: "consult",
      lang: "uz",
    }),
  });
  assert.equal(r.status, 201);
  const pub2Id = r.body.request.id;

  await pageCC.goto(base + "/app#requests", { waitUntil: "load" });
  await pageCC.waitForFunction((name) => document.body.innerText.includes(name), pub2Name, { timeout: 15000 });
  await pageCC.locator(".qcard", { hasText: pub2Name }).locator('[data-act="req-contact"]').click();
  await pageCC.waitForSelector("#qcNote");
  await pageCC.fill("#qcNote", "Call markaz: vaqt tasdiqlandi");
  await pageCC.click('#modalForm button[type="submit"]');
  await pageCC.waitForSelector(".qcard .pill.s-contacted", { timeout: 8000 });
  await pageCC.locator(".qcard", { hasText: pub2Name }).locator('[data-act="req-confirm"]').click();
  await pageCC.waitForSelector("#cfSlots .slot");
  await pageCC.click('#modalForm button[type="submit"]');
  await pageCC.waitForFunction(
    (name) => ![...document.querySelectorAll(".qcard")].some((c) => c.innerText.includes(name)),
    pub2Name,
    { timeout: 10000 }
  );
  const ccAfter = (await api(pageCC, "/api/db/snapshot")).body;
  assert.equal(ccAfter.collections.reqstate[pub2Id].status, "confirmed");
  assert.ok(Object.values(ccAfter.collections.appointments).some((a) => a.requestId === pub2Id));
  ok("Call markaz so'rovni bog'lab, navbatni tasdiqladi");

  /* ---------- B. signup, staff roles, trial gating ---------- */
  const ctxB = await browser.newContext({ viewport: { width: 1500, height: 1000 } });
  const pageB = await ctxB.newPage();
  await pageB.goto(base + "/login");

  const email = `e2e-${stamp}@test.uz`;
  const viewerEmail = `e2e-viewer-${stamp}@test.uz`;
  r = await api(pageB, "/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicName: `E2E Klinika ${stamp}`,
      name: "E2E Owner",
      email,
      password: "test12345",
      demo: false,
    }),
  });
  assert.equal(r.status, 200, "signup");
  const me = (await api(pageB, "/api/me")).body;
  assert.equal(me.plan, "trial");
  assert.equal(me.canWrite, true);
  assert.ok(me.trialEndsAt);
  ok("Ro'yxatdan o'tish: trial 14 kun, yozish ochiq");

  let snapB = (await api(pageB, "/api/db/snapshot")).body;
  assert.equal(Object.keys(snapB.collections).length, 0);
  ok("Yangi klinika bo'sh (demo yozuvlar yo'q)");

  r = await api(pageB, "/api/db/patients/new-p1", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: { name: "Yangi Bemor", phone: "+998 91 111 11 11" } }),
  });
  assert.equal(r.status, 200);
  ok("Trial davrida yozish ishlaydi");

  /* ---------- B2. AI assistant: read + write ---------- */
  r = await api(pageB, "/api/db/doctors/ai-doc", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: { name: "Dr. AI Test", spec: "therapist", createdAt: Date.now() } }),
  });
  assert.equal(r.status, 200);

  r = await api(pageB, "/api/assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: "statistika" }] }),
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.mode, "local");
  assert.match(r.body.reply, /navbat/);
  ok("AI yordamchi statistika so'roviga javob berdi");

  r = await api(pageB, "/api/assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: "yangi bemor AI Bemor, +998 90 123 00 11" }] }),
  });
  assert.equal(r.status, 200);
  assert.match(r.body.reply, /qo'shildi/);
  assert.equal(r.body.actions.length, 1);

  // "ertaga" may fall on Sunday (closed), so book the next open day explicitly
  const openDay = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    while (d.getDay() === 0) d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();
  r = await api(pageB, "/api/assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: `${openDay} 10:00 AI Bemorni AI Test qabuliga yoz` }] }),
  });
  assert.equal(r.status, 200);
  assert.match(r.body.reply, /Navbat yaratildi/);
  assert.equal(r.body.actions.length, 1);

  snapB = (await api(pageB, "/api/db/snapshot")).body;
  const aiPatient = Object.entries(snapB.collections.patients || {}).find(([, p]) => p.name === "AI Bemor");
  assert.ok(aiPatient, "AI patient exists");
  const aiAppt = Object.entries(snapB.collections.appointments || {}).find(
    ([, a]) => a.patientName === "AI Bemor" && a.doctorName === "Dr. AI Test"
  );
  assert.ok(aiAppt, "AI appointment exists");
  assert.equal(aiAppt[1].source, "assistant");
  const aiSlotKey = `${aiAppt[1].doctorId}_${aiAppt[1].date}_${aiAppt[1].time.replace(":", "")}`;
  assert.ok(snapB.collections.slots[aiSlotKey], "booking created a slot");
  ok("AI yordamchi bemor yaratdi va navbat yozdi (slot bilan)");

  // isolation from demo clinic
  const demoSnap = await (async () => {
    const p = await ctxA.newPage();
    await p.goto(base + "/app");
    const s = (await api(p, "/api/db/snapshot")).body;
    await p.close();
    return s;
  })();
  assert.equal(demoSnap.collections.patients["new-p1"], undefined);
  ok("Klinikalar izolyatsiyasi: boshqa klinika yozuvini ko'rmaydi");

  r = await api(pageB, "/api/staff", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "E2E Viewer",
      email: viewerEmail,
      password: "viewer12345",
      role: "viewer",
    }),
  });
  assert.equal(r.status, 200);
  const viewerId = r.body.id;
  ok("Xodim (viewer) qo'shildi");

  const pageV = await (await browser.newContext()).newPage();
  await pageV.goto(base + "/login");
  r = await api(pageV, "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: viewerEmail, password: "viewer12345" }),
  });
  assert.equal(r.status, 200);
  const meV = (await api(pageV, "/api/me")).body;
  assert.equal(meV.canWrite, false);
  r = await api(pageV, "/api/db/patients/new-p2", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: { name: "Ruxsatsiz" } }),
  });
  assert.equal(r.status, 403);
  assert.equal(r.body.error, "read_only");
  ok("Viewer yozolmaydi (403 read_only)");

  r = await api(pageB, `/api/staff/${viewerId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "reception" }),
  });
  assert.equal(r.status, 200);
  r = await api(pageV, "/api/db/patients/new-p2", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: { name: "Qabul xodimi yozdi" } }),
  });
  assert.equal(r.status, 200);
  ok("Rol reception'ga o'zgargach yozish ochildi");

  r = await api(pageB, `/api/staff/${viewerId}`, { method: "DELETE" });
  assert.equal(r.status, 200);
  ok("Xodim o'chirildi");

  /* ---------- C. admin: clinic list + plan/status ---------- */
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  assert.ok(adminEmail && adminPassword, "ADMIN_EMAIL/PASSWORD env");
  const pageC = await (await browser.newContext()).newPage();
  await pageC.goto(base + "/login");
  r = await api(pageC, "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  });
  assert.equal(r.status, 200, "admin login");
  const clinics = (await api(pageC, "/api/admin/clinics")).body.clinics;
  const target = clinics.find((c) => c.name === `E2E Klinika ${stamp}`);
  assert.ok(target, "E2E clinic in admin list");
  ok("Admin klinikalar ro'yxatini ko'radi", `${clinics.length} ta klinika`);

  r = await api(pageC, `/api/admin/clinics/${target.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan: "start", extendTrialDays: 30 }),
  });
  assert.equal(r.status, 200);
  const after = (await api(pageC, "/api/admin/clinics")).body.clinics.find((c) => c.id === target.id);
  assert.equal(after.plan, "start");
  ok("Tarif 'start'ga o'zgartirildi");

  /* ---------- C2. invoices, payments, cron ---------- */
  r = await api(pageC, "/api/admin/invoices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clinicId: target.id, plan: "start", months: 1 }),
  });
  assert.equal(r.status, 200);
  const invoice = r.body.invoice;
  assert.equal(invoice.status, "pending");
  assert.equal(invoice.amount, 299000);

  r = await api(pageC, `/api/admin/invoices/${invoice.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "paid", method: "bank" }),
  });
  assert.equal(r.status, 200);
  const invoiceAfter = (await api(pageC, "/api/admin/invoices")).body.invoices.find((i) => i.id === invoice.id);
  assert.equal(invoiceAfter.status, "paid");
  assert.equal(invoiceAfter.method, "bank");
  const clinicPaid = (await api(pageC, "/api/admin/clinics")).body.clinics.find((c) => c.id === target.id);
  assert.equal(clinicPaid.plan, "start");
  assert.equal(clinicPaid.status, "active");
  assert.ok(clinicPaid.paidUntil, "paidUntil set");
  ok("Hisob-faktura to'landi: tarif va paidUntil avtomatik yangilandi");

  r = await api(pageB, "/api/admin/invoices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clinicId: target.id, plan: "start", months: 1 }),
  });
  assert.equal(r.status, 403);
  ok("Klinika egasi hisob-faktura yarata olmaydi (403)");

  await prisma.clinic.update({
    where: { id: target.id },
    data: { status: "active", paidUntil: new Date(Date.now() - 86400000) },
  });
  const cronSecret = encodeURIComponent(process.env.CRON_SECRET || "");
  r = await api(pageC, `/api/cron/billing?secret=${cronSecret}`);
  assert.equal(r.status, 200);
  assert.ok(r.body.expiredPaid >= 1);
  const clinicExpired = (await api(pageC, "/api/admin/clinics")).body.clinics.find((c) => c.id === target.id);
  assert.equal(clinicExpired.status, "expired");
  ok("Cron muddati o'tgan obunani 'expired' qiladi");

  await prisma.clinic.update({
    where: { id: target.id },
    data: { status: "active", paidUntil: new Date(Date.now() + 30 * 86400000) },
  });

  // Start plan allows exactly one doctor account
  const docEmail = `e2e-doc-${stamp}@test.uz`;
  r = await api(pageB, "/api/staff", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "E2E Shifokor",
      email: docEmail,
      password: "doctor12345",
      role: "doctor",
      spec: "dentist",
    }),
  });
  assert.equal(r.status, 200);
  const docId = r.body.id;
  r = await api(pageB, "/api/staff", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "E2E Shifokor 2",
      email: `e2e-doc2-${stamp}@test.uz`,
      password: "doctor12345",
      role: "doctor",
    }),
  });
  assert.equal(r.status, 403);
  ok("Start tarifida 2-shifokor bloklandi (seat limit)");

  // password reset by the clinic owner
  r = await api(pageB, `/api/staff/${docId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "newdoctor12345" }),
  });
  assert.equal(r.status, 200);
  const pageD = await (await browser.newContext()).newPage();
  await pageD.goto(base + "/login");
  r = await api(pageD, "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: docEmail, password: "newdoctor12345" }),
  });
  assert.equal(r.status, 200);
  assert.equal((await api(pageD, "/api/me")).body.role, "doctor");
  ok("Egasi parolni yangilay oladi, shifokor yangi parol bilan kiradi");

  // non-admin clinic user must not reach admin API
  r = await api(pageB, "/api/admin/clinics");
  assert.equal(r.status, 403);
  ok("Klinika egasi admin API'ga kira olmaydi");

  /* ---------- C3. v2 modules: gating, call-centre shield, change feed, outbox ---------- */
  const putAs = (page, col, id, data) =>
    api(page, `/api/db/${col}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
    });
  const putB = (col, id, data) =>
    api(pageB, `/api/db/${col}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
    });

  // change feed returns only docs touched after the cursor
  let feed = (await api(pageB, "/api/db/changes?since=0")).body;
  const cursor = feed.cursor;
  assert.ok(typeof cursor === "number", "changes cursor");
  r = await putB("chairs", "e2e-chair-1", { name: "Kabinet 1", active: true });
  assert.equal(r.status, 200);
  feed = (await api(pageB, `/api/db/changes?since=${cursor}`)).body;
  assert.ok(feed.collections.chairs && feed.collections.chairs["e2e-chair-1"], "delta contains new chair");
  assert.equal(feed.collections.patients, undefined);
  ok("Delta change feed faqat o'zgargan doclarni qaytaradi");

  // Start plan: inventory is closed
  await prisma.clinic.update({ where: { id: target.id }, data: { plan: "start" } });
  r = await putB("inventory", "e2e-mat-1", { name: "Plomba", qty: 5, unit: "dona" });
  assert.equal(r.status, 403);
  assert.equal(r.body.error, "plan_restricted");
  r = await putB("payroll", "e2e-py-1", { doctorId: docId, total: 1 });
  assert.equal(r.status, 403);
  ok("Start tarifida ombor va ish haqi yopiq (403 plan_restricted)");

  await prisma.clinic.update({ where: { id: target.id }, data: { plan: "clinic" } });
  r = await putB("inventory", "e2e-mat-1", { name: "Plomba", qty: 5, minQty: 10, unit: "dona" });
  assert.equal(r.status, 200);
  ok("Klinika tarifida ombor ochildi");

  // call-centre role cannot read clinical or financial collections
  const ccEmail2 = `e2e-cc3-${stamp}-b@test.uz`;
  r = await api(pageB, "/api/staff", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "E2E Callmarkaz", email: ccEmail2, password: "call12345", role: "callcenter" }),
  });
  assert.equal(r.status, 200);
  const pageCC2 = await (await browser.newContext()).newPage();
  await pageCC2.goto(base + "/login");
  r = await api(pageCC2, "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ccEmail2, password: "call12345" }),
  });
  assert.equal(r.status, 200);
  for (const col of ["visits", "plans", "toothHistory", "payments", "payroll"]) {
    r = await api(pageCC2, `/api/db/${col}/x`);
    assert.equal(r.status, 403, `${col} hidden from call centre`);
  }
  const ccSnap2 = (await api(pageCC2, "/api/db/snapshot")).body;
  for (const col of ["visits", "plans", "payments", "payroll", "toothHistory"]) {
    assert.equal(ccSnap2.collections[col], undefined, `${col} missing from call-centre snapshot`);
  }
  assert.ok(ccSnap2.collections.patients, "call centre still sees patients");
  ok("Call markaz klinik/moliya doclarini ko'rmaydi (GET 403 + snapshotdan yashirin)");

  // outbox cron delivers queued messages (demo mode without provider keys)
  r = await putAs(pageCC2, "outbox", "e2e-ob-1", { channel: "sms", to: "+998901112233", text: "Sinov", at: Date.now(), status: "queued" });
  assert.equal(r.status, 200);
  r = await api(pageCC2, "/api/cron/outbox", { method: "POST" });
  assert.equal(r.status, 200);
  assert.ok(r.body.sent + r.body.demo >= 1, "outbox processed");
  const obDoc = (await api(pageCC2, "/api/db/outbox/e2e-ob-1")).body.data;
  assert.ok(["sent", "demo"].includes(obDoc.status), "outbox status updated: " + obDoc.status);
  ok("Outbox cron xabarni yubordi", obDoc.status);

  // AI assistant knows the new collections
  r = await api(pageB, "/api/assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: "omborda kam qoldiq" }] }),
  });
  assert.equal(r.status, 200);
  assert.match(r.body.reply, /Plomba|kam qoldiq|yetarli/i);
  ok("AI yordamchi ombor holatini biladi");

  /* ---------- D. trial expiry blocks writes ---------- */
  await prisma.clinic.update({
    where: { id: target.id },
    data: { plan: "trial", trialEndsAt: new Date(Date.now() - 86400000) },
  });
  r = await api(pageB, "/api/db/patients/new-p3", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: { name: "Muddati o'tgan" } }),
  });
  assert.equal(r.status, 403);
  assert.equal(r.body.error, "trial_expired");
  const meExpired = (await api(pageB, "/api/me")).body;
  assert.equal(meExpired.canWrite, false);
  ok("Trial tugagach yozish yopiladi (403 trial_expired)");

  /* ---------- cleanup ---------- */
  await prisma.user.deleteMany({ where: { clinicId: target.id } });
  await prisma.record.deleteMany({ where: { clinicId: target.id } });
  await prisma.clinic.delete({ where: { id: target.id } });
  ok("Test klinikasi tozalandi");

  // public-request artifacts land in the shared demo clinic too
  const demoClinic = await prisma.clinic.findFirst({ where: { slug: "demo" } });
  if (demoClinic) {
    const recs = await prisma.record.findMany({
      where: { clinicId: demoClinic.id, collection: { in: ["appointments", "patients", "requests", "reqstate", "slots"] } },
    });
    const appts = recs.filter((r) => r.collection === "appointments" && r.data.includes(String(stamp))).map((r) => r.docId);
    const pats = recs.filter((r) => r.collection === "patients" && (r.data.includes(String(stamp)) || r.docId === "e2e-patient")).map((r) => r.docId);
    const reqIds = recs.filter((r) => r.collection === "requests" && r.data.includes(String(stamp).slice(-7))).map((r) => r.docId);
    const requestItems = recs
      .filter((r) => r.collection === "requests" && r.data.includes(String(stamp).slice(-7)))
      .flatMap((r) => { try { return (JSON.parse(r.data).items || []).map((it) => it.id); } catch { return []; } })
      .filter(Boolean);
    const states = recs.filter((r) => {
      if (r.collection !== "reqstate") return false;
      if (requestItems.includes(r.docId)) return true;
      try { return reqIds.includes(JSON.parse(r.data).requestId); } catch { return false; }
    }).map((r) => r.docId);
    const slots = recs.filter((r) => {
      if (r.collection !== "slots") return false;
      try { return appts.includes(JSON.parse(r.data).ref); } catch { return false; }
    }).map((r) => r.docId);
    const groups = { appointments: appts, patients: pats, requests: reqIds, reqstate: states, slots };
    for (const [collection, docIds] of Object.entries(groups)) {
      if (docIds.length) await prisma.record.deleteMany({ where: { clinicId: demoClinic.id, collection, docId: { in: docIds } } });
    }
    ok("Demo klinikadagi test izlari tozalandi");
  }

  console.log("\n" + results.length + " checks passed.");
} finally {
  await browser.close();
  await prisma.$disconnect();
}

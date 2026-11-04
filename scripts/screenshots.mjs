import { chromium } from "playwright-core";
import fs from "fs";

const base = "http://localhost:3100";
const out = "public/screenshots";
const chrome =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ executablePath: chrome, headless: true });
const page = await browser.newPage({
  viewport: { width: 1600, height: 1000 },
  deviceScaleFactor: 1,
});

async function shot(name, url, wait = 1200) {
  await page.goto(base + url, { waitUntil: "load" });
  await page.waitForTimeout(wait);
  // Keep marketing shots clean: hide demo/status banners only (not app content).
  await page.evaluate(() => {
    const banner = document.querySelector("#banner");
    if (banner) banner.style.display = "none";
  });
  await page.screenshot({ path: `${out}/${name}.png` });
  console.log(name, "ok");
}

await shot("login", "/login", 800);

await page.goto(base + "/login");
await page.evaluate(async () => {
  const r = await fetch("/api/auth/demo", { method: "POST" });
  return r.json();
});

await shot("schedule", "/app", 3500);
await page.evaluate(() => {
  localStorage.setItem("dd_lang", "uz");
});
await shot("schedule-uz", "/app", 3000);
const demoMe = await page.evaluate(async () => (await fetch("/api/me")).json());
await shot("requests", "/app#requests", 2600);
if (demoMe.clinicSlug) await shot("public", "/b/" + demoMe.clinicSlug, 1800);
await shot("chart", "/app#patient-dd-demo-p1", 3800);

// AI assistant drawer, cropped for the landing page section.
await page.setViewportSize({ width: 1600, height: 710 });
await page.goto(base + "/app", { waitUntil: "load" });
await page.waitForTimeout(2600);
await page.click("#ddai-fab");
await page.waitForTimeout(400);
await page.click(".ddai-chip:nth-child(1)");
await page.waitForTimeout(1800);
await page.evaluate(() => {
  const b = document.getElementById("ddai-body");
  if (b) b.scrollTop = 0;
});
const drawer = await page.locator("#ddai").boundingBox();
if (drawer) {
  await page.screenshot({ path: `${out}/ai.png`, clip: drawer });
  console.log("ai ok");
}
await page.keyboard.press("Escape");
await page.setViewportSize({ width: 1600, height: 1000 });

await shot("settings", "/settings", 1500);

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
if (email && password) {
  await page.goto(base + "/login");
  const ok = await page.evaluate(
    async (creds) => {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creds),
      });
      return r.ok;
    },
    { email, password }
  );
  if (ok) {
    await shot("admin", "/admin", 1200);
    await page.evaluate(() => fetch("/api/auth/logout", { method: "POST" }));
  }
}

await shot("landing", "/", 1200);

await browser.close();

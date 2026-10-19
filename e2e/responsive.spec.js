import { test, expect } from "@playwright/test";
import { mockPortal } from "./portal-fixture.js";

const sizes = [[320, 568], [390, 844], [667, 375], [768, 1024], [1024, 768], [1440, 900]];
const STATIC_PAGES = ["/", "/products", "/industries", "/calculator", "/specs", "/blog", "/gallery", "/showroom", "/product-100mm-pir", "/trim", "/portal-paused"];
const PORTAL_PAGES = ["/portal", "/portal/profile", "/portal/settings", "/portal/admin"];

const fitsWidth = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

// Stay offline: third-party hosts (Google Fonts, Pipedrive, analytics) can be slow or blocked and would stall the load event.
// Registered first, so the portal mock's own route (added later in a test) still answers its requests.
test.beforeEach(async ({ context }) => {
  await context.route(/^https?:\/\/(?!(127\.0\.0\.1|localhost)[:/])/, (route) => route.abort());
});

async function chatRoundTrip(page) {
  await page.getByRole("button", { name: "Open chat assistant" }).click();
  const chat = page.getByRole("dialog", { name: "Harvest Panel Systems assistant" });
  await expect(chat).toBeVisible();
  await expect.poll(() => chat.evaluate(el => {
    const rect = el.getBoundingClientRect();
    return rect.top >= 0 && rect.left >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight;
  })).toBe(true);
  await page.getByRole("textbox", { name: "Type your question" }).fill("What panels do you offer?");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(chat).toContainText("What panels do you offer?");
  await page.getByRole("button", { name: "Close chat", exact: true }).click();
  await expect(chat).toHaveCount(0);
}

for (const [width, height] of sizes) {
  test(`static pages fit and chat works at ${width}x${height}`, async ({ page }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width, height });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    for (const path of STATIC_PAGES) {
      await page.goto(path, { waitUntil: "load" });
      await expect(page.locator("nav.nav, .nav").first()).toBeVisible();
      expect(await fitsWidth(page), path).toBe(true);
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      expect(await fitsWidth(page), `${path} footer`).toBe(true);
    }
    await page.goto("/", { waitUntil: "load" });
    await chatRoundTrip(page);
    expect(errors).toEqual([]);
  });

  test(`portal pages and floating controls at ${width}x${height}`, async ({ page, browserName, isMobile }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width, height });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await mockPortal(page, { signedIn: true, admin: true });
    for (const path of PORTAL_PAGES) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page.locator(".hp-nav")).toHaveCount(1);
      await expect(page.locator(".hp-page-loader")).toHaveCount(0, { timeout: 15000 });
      expect(await fitsWidth(page), path).toBe(true);
      expect(await page.locator(".hp-panel").evaluateAll(elements => elements.every(el => {
        const rect = el.getBoundingClientRect();
        return rect.left >= 0 && rect.right <= innerWidth;
      })), `${path} panels fit`).toBe(true);
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      expect(await fitsWidth(page), `${path} footer`).toBe(true);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    if (width <= 1024) {
      await page.getByRole("button", { name: "Open menu", exact: true }).click();
      const panel = page.locator(".hp-nav__mobile");
      await expect(panel).toHaveClass(/is-open/);
      await expect.poll(() => panel.evaluate(el => el.getAnimations().filter(a => a.playState === "running").length)).toBe(0);
      await expect.poll(() => panel.evaluate(el => el.getBoundingClientRect().bottom <= innerHeight)).toBe(true);
      if (await panel.evaluate(el => el.scrollHeight > el.clientHeight + 2)) {
        if (browserName === "webkit" && isMobile) {
          expect(await panel.evaluate(el => el.dispatchEvent(new Event("touchmove", { bubbles: true, cancelable: true })))).toBe(true);
          await panel.evaluate(el => el.scrollBy(0, 400));
        } else {
          await panel.hover();
          await page.mouse.wheel(0, 400);
        }
        await expect.poll(() => panel.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
      }
      // Resizing an already-open menu must recalculate its available height.
      await page.setViewportSize({ width, height: 320 });
      await expect.poll(() => panel.evaluate(el => el.getBoundingClientRect().bottom <= innerHeight)).toBe(true);
      await page.getByRole("button", { name: "Close menu", exact: true }).click();
      await page.setViewportSize({ width, height });
    }
    await chatRoundTrip(page);
    expect(errors).toEqual([]);
  });
}

test("home page has no calculator section; /calculator: 20x20 preset works; showroom picker works (portal link is off)", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/", { waitUntil: "load" });
  // The customer portal is switched off for now; see "Customer portal" in the README to bring the link back.
  await expect(page.locator('a[href^="/portal"]')).toHaveCount(0);
  await expect(page.locator("#calculator")).toHaveCount(0);
  await page.goto("/calculator", { waitUntil: "load" });
  // the calculator starts with the same 20 x 16 ft room as the scroll-built one
  await expect(page.locator("#c-presets .pill.on")).toHaveText("20 × 16 ft");
  await expect(page.locator("#c-wv")).toContainText("16 ft");
  await page.locator('#c-presets [data-l="20"][data-w="20"]').click();
  await expect(page.locator("#o-total")).toHaveText("35");
  await page.goto("/showroom", { waitUntil: "load" });
  await expect(page.locator(".pick .pcard3").nth(1)).toBeVisible();
  await page.locator(".pick .pcard3").nth(1).click();
  await expect(page.locator(".pick .pcard3.on")).toHaveCount(1);
});

test("FAQ on the home page opens and closes", async ({ page }) => {
  await page.goto("/", { waitUntil: "load" });
  const first = page.locator("#faq details").first();
  await first.locator("summary").click();
  await expect(first).toHaveAttribute("open", "");
  await first.locator("summary").click();
  await expect(first).not.toHaveAttribute("open", "");
});

test("reduced motion avoids persistent CSS animation loops on the static home page", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "load" });
  await expect(page.locator(".nav").first()).toBeVisible();
  expect(await page.evaluate(() => document.getAnimations().filter(animation =>
    animation.effect.getTiming().iterations === Infinity && animation.playState === "running"
  ).length)).toBe(0);
});

test("mobile menu reaches every main page", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "load" });
  const menu = page.getByRole("button", { name: "Menu", exact: true });
  await expect(menu).toBeVisible();
  await expect(page.locator("#site-menu a", { hasText: "Products" }).first()).toBeHidden();
  await menu.click();
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  for (const label of ["Products", "3D Showroom", "Specs", "Gallery", "Blog"]) {
    await expect(page.locator("#site-menu").getByRole("link", { name: label, exact: true })).toBeVisible();
  }
  await page.locator("#site-menu").getByRole("link", { name: "Products", exact: true }).click();
  await expect(page).toHaveURL(/\/products$/);
});

test("look inside: floor track offers the U-channel and the double L trim, with the guide's single screw", async ({ page }) => {
  await page.goto("/", { waitUntil: "load" });
  await page.waitForFunction(() => window.INSTALL && document.querySelector("#inst .inst-steps"));
  await page.locator("#inst").scrollIntoViewIfNeeded();
  await page.locator('#inst .inst-tabs button[data-scene="track"]').click();
  await expect(page.locator("#inst .istep")).toHaveCount(4);
  const optB = page.getByRole("button", { name: /Option B/ });
  await expect(optB).toBeVisible();
  await optB.click();
  await expect(page.locator("#inst .istep")).toHaveCount(5);
  await expect(page.locator("#inst .istep").first()).toContainText("Butyl Under Each Angle");
  await page.locator("#inst .istep").nth(4).click();
  await expect(page.locator("#inst .inst-detail")).toContainText("7/8");
  await page.locator('#inst .inst-tabs button[data-scene="joint"]').click();
  await expect(page.getByRole("button", { name: /Option B/ })).toBeHidden();
  const old = await page.evaluate(() => JSON.stringify(window.INSTALL).match(/#14|stitch|HH Tek/gi));
  expect(old).toBeNull();
});

test("3D showroom: the sliding cooler door comes in 5x7 and 6x7 and slides instead of swinging", async ({ page }) => {
  await page.goto("/showroom#doors", { waitUntil: "load" });
  await page.getByRole("button", { name: "Sliding Cooler", exact: true }).click();
  await expect(page.getByRole("button", { name: "5×7", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "6×7", exact: true })).toBeVisible();
  await expect(page.getByText("Slides to", { exact: true })).toBeVisible();
  await expect(page.locator("body")).toContainText("1,500 × 2,100 mm clear opening");
  await page.getByRole("button", { name: "6×7", exact: true }).click();
  await expect(page.locator("body")).toContainText("1,800 × 2,100 mm clear opening");
});

test("specs page shows the single and double span tables with metric values", async ({ page }) => {
  await page.goto("/specs", { waitUntil: "load" });
  await page.getByRole("button", { name: "Single Span", exact: true }).click();
  await expect(page.locator(".tpanel.on tbody tr")).toHaveCount(9);
  await expect(page.locator(".tpanel.on")).toContainText("10'5⅝\"");
  await expect(page.locator(".tpanel.on")).toContainText("3,191");
  await expect(page.locator(".tpanel.on")).toContainText("converted from metric to imperial units");
  await page.getByRole("button", { name: "Double Span", exact: true }).click();
  await expect(page.locator(".tpanel.on tbody tr")).toHaveCount(9);
  await expect(page.locator(".tpanel.on")).toContainText("12'5⅝\"");
});

test("no draft text or dead links on the public pages", async ({ page }) => {
  for (const path of ["/", "/products", "/gallery", "/blog", "/trim"]) {
    await page.goto(path, { waitUntil: "load" });
    expect(await page.locator('a[href="#"]').count(), path).toBe(0);
    expect(await page.locator('a[href^="/portal/"]').count(), `${path} portal link`).toBe(0);
    await expect(page.locator("body")).not.toContainText(/draft descriptions|lorem ipsum/i);
  }
});

test("home page order: the scroll-built room, industries, one call, ..., flooring, how a room goes together, projects, FAQ, standards", async ({ page }) => {
  await page.goto("/", { waitUntil: "load" });
  const tops = await page.evaluate(() => ["build", "industries", "why", "products", "what-is-imp", "flooring", "inside", "projects", "faq", "standards"].map(id => document.getElementById(id).getBoundingClientRect().top + scrollY));
  expect(tops).toEqual([...tops].sort((a, b) => a - b));
  await expect(page.locator("#industries h2")).toHaveText("Built for Controlled Environments.");
  await expect(page.locator("#inside h2")).toHaveText("See How a Room Goes Together.");
  await expect(page.locator("#why h2")).toHaveText("One Call. Start to Finish.");
  await expect(page.locator("#flooring h2")).toHaveText("Floors to Match Your Room.");
  await expect(page.locator("#projects h2")).toHaveText("Projects from the Field.");
  // the standards sit under the FAQ with big, full-colour logos and large certification cards
  const logo = page.locator("#standards .member img").first();
  await logo.scrollIntoViewIfNeeded();
  expect(await logo.evaluate(el => ({ h: el.getBoundingClientRect().height, filter: getComputedStyle(el).filter }))).toEqual({ h: expect.any(Number), filter: "none" });
  expect(await logo.evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(100);
  await expect(page.locator("#standards .cert")).toHaveCount(5);
  await expect(page.locator("#industries")).toContainText("ISO 14644");
  await expect(page.locator("#industries")).toContainText("USDA");
  await expect(page.locator("#industries")).toContainText("BSL-3");
});

test("wording: no 'envelope', every Insulated Metal Panel mention carries (IMP), no bare 'insulated panels'", async ({ page }) => {
  for (const path of ["/", "/products", "/industries", "/calculator", "/specs", "/trim", "/gallery", "/blog", "/showroom", "/product-100mm-pir"]) {
    await page.goto(path, { waitUntil: "load" });
    const text = await page.evaluate(() => document.body.innerText);
    expect(text, `${path} envelope`).not.toMatch(/envelope/i);
    expect(text, `${path} bare insulated panels`).not.toMatch(/\binsulated panels?\b/i);
    expect([...text.matchAll(/.{0,30}insulated metal panels?\b(?! \(IMP\)).{0,30}/gi)].map(m => m[0]), `${path} Insulated Metal Panel without (IMP)`).toEqual([]);
  }
});

test("industries page lists every industry with its own anchor", async ({ page }) => {
  await page.goto("/industries", { waitUntil: "load" });
  await expect(page.locator("h1")).toContainText("Built for Every");
  for (const id of ["cold-storage", "cultivation", "food-processing", "cleanrooms", "data-centers", "warehouses", "hangars", "metal-buildings"]) {
    await expect(page.locator(`section#${id} h2`)).toBeVisible();
  }
  await expect(page).toHaveTitle(/Insulated Metal Panels \(IMP\)/);
  expect(await page.locator('script[type="application/ld+json"]').count()).toBeGreaterThan(0);
});

test("home page structured data includes the FAQ and parses as JSON", async ({ page }) => {
  await page.goto("/", { waitUntil: "load" });
  const types = await page.evaluate(() => [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => JSON.parse(s.textContent)["@type"]));
  expect(types.flat()).toEqual(expect.arrayContaining(["Organization", "WebSite", "FAQPage"]));
});

test("fasteners: 15 screws per panel (walls and roofs), 4 drive pins per wall panel only; totals live on the calculator page", async ({ page }) => {
  await page.goto("/", { waitUntil: "load" });
  await page.waitForFunction(() => window.INSTALL && document.querySelector("#fast-est .fe-out b"));
  const rows = page.locator("#fast-est .fe-out > div");
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0).locator("b")).toHaveText("15");
  await expect(rows.nth(0)).toContainText("wall and roof panels");
  await expect(rows.nth(1).locator("b")).toHaveText("4");
  await expect(rows.nth(1)).toContainText("wall panels only");
  await page.goto("/calculator", { waitUntil: "load" });
  await page.locator('#c-presets [data-l="20"][data-w="20"]').click();
  await expect(page.locator("#o-total")).toHaveText("35");
  const wall = Number(await page.locator("#o-wall").innerText()), ceil = Number(await page.locator("#o-ceil").innerText());
  await expect(page.locator("#o-screws")).toHaveText(String((wall + ceil) * 15));
  await expect(page.locator("#o-pins")).toHaveText(String(wall * 4));
});

test("the calculator is reached only from the menu bar", async ({ page }) => {
  for (const path of ["/", "/products", "/industries", "/specs", "/trim", "/gallery", "/blog", "/showroom", "/product-100mm-pir", "/calculator"]) {
    await page.goto(path, { waitUntil: "load" });
    expect(await page.locator('a[href*="calculator"]').count(), path).toBe(1);
    expect(await page.locator('nav.menu a[href="/calculator"]').count(), path + " menu link").toBe(1);
  }
  await page.goto("/", { waitUntil: "load" });
  const burger = page.getByRole("button", { name: "Menu", exact: true });
  if (await burger.isVisible()) await burger.click();
  await page.locator('nav.menu a[href="/calculator"]').click();
  await expect(page).toHaveURL(/\/calculator$/);
  await expect(page.locator("h1")).toHaveText("Size Your Room.");
});

test("panel viewer: Play joint and Play layers run to their ends, and the viewer draws almost nothing while idle", async ({ page }) => {
  await page.goto("/site/viewer.html", { waitUntil: "load" });
  await page.waitForFunction(() => window.THREE && document.getElementById("jnv"));
  await page.locator("#ajn").click();
  await expect(page.locator("#jnv")).toHaveText("0%", { timeout: 8000 });
  await page.locator("#aex").click();
  await expect(page.locator("#exv")).toHaveText("100%", { timeout: 8000 });
  await page.waitForTimeout(1500);
  const f0 = await page.evaluate("renderer.info.render.frame");
  await page.waitForTimeout(1500);
  const f1 = await page.evaluate("renderer.info.render.frame");
  expect(f1 - f0).toBeLessThanOrEqual(4);   // only the slow refresh (about two per second)
});
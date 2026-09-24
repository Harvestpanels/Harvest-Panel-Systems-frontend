import { test, expect } from "@playwright/test";
import { mockPortal } from "./portal-fixture.js";

const sizes = [[320, 568], [390, 844], [667, 375], [768, 1024], [1024, 768], [1440, 900]];

for (const [width, height] of sizes) {
  test(`responsive routes and floating controls at ${width}x${height}`, async ({ page, browserName, isMobile }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width, height });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await mockPortal(page, { signedIn: true, admin: true });
    for (const path of ["/", "/products", "/specs", "/blog", "/portal", "/portal/profile", "/portal/settings", "/portal/admin"]) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page.locator(".hp-nav")).toHaveCount(1);
      await expect(page.locator(".hp-page-loader")).toHaveCount(0, { timeout: 15000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), path).toBe(true);
      expect(await page.locator(".hp-panel").evaluateAll(elements => elements.every(el => {
        const rect = el.getBoundingClientRect();
        return rect.left >= 0 && rect.right <= innerWidth;
      })), `${path} panels fit`).toBe(true);
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${path} footer`).toBe(true);
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
    expect(errors).toEqual([]);
  });
}

test("reduced motion avoids persistent animation loops", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPortal(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".hp-nav")).toHaveCount(1);
  await expect(page.locator(".hp-page-loader")).toHaveCount(0);
  expect(await page.evaluate(() => document.getAnimations().filter(animation =>
    animation.effect.getTiming().iterations === Infinity && animation.playState === "running"
  ).length)).toBe(0);
  await expect(page.locator(".hp-parallax-layer")).toHaveCSS("pointer-events", "none");
  await page.locator("#why").scrollIntoViewIfNeeded();
  expect(await page.locator("#why").evaluate(el => {
    const rect = el.getBoundingClientRect();
    const hit = document.elementFromPoint(innerWidth / 2, Math.max(1, Math.min(innerHeight / 2, rect.bottom - 1)));
    return !hit?.closest(".hp-parallax-layer");
  })).toBe(true);
});

test("gallery keyboard controls, captions, FAQ and sign-in dialog remain usable", async ({ page }) => {
  await page.setViewportSize({ width: 667, height: 375 });
  await mockPortal(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".hp-nav")).toHaveCount(1);
  await expect(page.locator(".hp-page-loader")).toHaveCount(0);
  await page.getByRole("button", { name: /^View .* full screen$/ }).first().click();
  const lightbox = page.locator(".hp-lightbox");
  await expect(lightbox).toBeVisible();
  const next = page.getByRole("button", { name: "Next photo", exact: true });
  await next.focus();
  await page.keyboard.press("Enter");
  await expect(lightbox.locator(".hp-lightbox__count")).toContainText("2 /");
  await expect(next).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(lightbox.locator(".hp-lightbox__count")).toContainText("3 /");
  const caption = lightbox.locator("figcaption");
  await expect.poll(() => caption.evaluate(el => {
    const rect = el.getBoundingClientRect();
    return rect.top >= 0 && rect.bottom <= innerHeight;
  })).toBe(true);
  await page.getByRole("button", { name: "Close", exact: true }).click();
  const question = page.locator(".hp-faq-item__q").first();
  await question.click();
  await expect(question).toHaveAttribute("aria-expanded", "true");
  await question.click();
  await expect(question).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  const modal = page.locator(".hp-authmodal");
  await expect(modal).toBeVisible();
  await modal.getByLabel("Email", { exact: true }).fill("mobile@example.test");
  await expect(modal.getByLabel("Email", { exact: true })).toHaveValue("mobile@example.test");
  await modal.getByRole("button", { name: "Close", exact: true }).click();
  await expect(modal).toHaveCount(0);
});

test("desktop dropdowns fit short windows and close on mobile resize or modal open", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 375 });
  await mockPortal(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".hp-nav")).toHaveCount(1);
  await expect(page.locator(".hp-page-loader")).toHaveCount(0);
  const menu = page.getByRole("button", { name: "Menu", exact: true });
  await menu.click();
  const panel = page.locator(".hp-nav__menu-panel.is-open");
  await expect(panel).toBeVisible();
  await expect.poll(() => panel.evaluate(el => el.getBoundingClientRect().bottom <= innerHeight)).toBe(true);
  await page.setViewportSize({ width: 667, height: 375 });
  await expect(panel).toHaveCount(0);
  await page.setViewportSize({ width: 1280, height: 720 });
  await menu.click();
  const login = page.getByRole("button", { name: "Log in", exact: true });
  await login.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".hp-authmodal")).toBeVisible();
  await expect(panel).toHaveCount(0);
});

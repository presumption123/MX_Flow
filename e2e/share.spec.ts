import { test, expect } from "@playwright/test";

test("share code roundtrips through encode and decode", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const m = await import("/js/share-protocol.js");
    const payload = {
      v: 1,
      kind: "offer",
      sessionId: "session-1",
      clientId: "client-1",
      sdp: { type: "offer", sdp: "v=0" },
      round: { id: "r1", note: "hello world", n: 42 },
    };
    const code = await m.encodeShareCode(payload);
    const decoded = await m.decodeShareCode(code);
    return { code, decoded };
  });
  expect(result.code.startsWith("MXSH1.")).toBe(true);
  expect(result.decoded.kind).toBe("offer");
  expect(result.decoded.round.note).toBe("hello world");
  expect(result.decoded.round.n).toBe(42);
});

test("decode rejects a malformed code", async ({ page }) => {
  await page.goto("/");
  const message = await page.evaluate(async () => {
    const m = await import("/js/share-protocol.js");
    try {
      await m.decodeShareCode("totally-not-a-code");
      return null;
    } catch (e) {
      return (e as Error).message;
    }
  });
  expect(message).toContain("MX Flow share code");
});

test("two browsers pair via two codes and sync edits both ways", async ({ browser }) => {
  test.setTimeout(90000);
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const a = await ctxA.newPage();
  const b = await ctxB.newPage();

  // A creates a round and types into a cell.
  await a.goto("/");
  await a.getByRole("button", { name: "+ New Round" }).first().click();
  await expect(a.locator("#flow-view")).toBeVisible();
  const aOpener = a.locator('.flow-cell[data-row="0"][data-col="1AC"]');
  await aOpener.click();
  await a.keyboard.type("Shared opener");
  await expect(aOpener).toContainText("Shared opener");

  // A starts a session and copies code 1.
  await a.getByRole("button", { name: "Share", exact: true }).click();
  await a.getByRole("button", { name: "Start a session" }).click();
  const codeOut = a.locator("#share-code-out");
  await expect(codeOut).not.toHaveValue("", { timeout: 20000 });
  const code1 = await codeOut.inputValue();

  // B joins with code 1 and immediately sees A's flow.
  await b.goto("/");
  await b.getByRole("button", { name: "Join Shared Flow" }).click();
  await b.locator("#share-offer-in").fill(code1);
  await b.getByRole("button", { name: "Continue" }).click();
  await expect(b.locator("#flow-view")).toBeVisible();
  await expect(b.locator('.flow-cell[data-row="0"][data-col="1AC"]')).toContainText(
    "Shared opener",
    { timeout: 20000 }
  );
  const codeBack = b.locator("#share-code-back");
  await expect(codeBack).not.toHaveValue("", { timeout: 20000 });
  const code2 = await codeBack.inputValue();

  // A finishes the handshake with code 2.
  await a.locator("#share-answer-in").fill(code2);
  await a.getByRole("button", { name: "Connect" }).click();

  // Both sides show the live badge.
  await expect(a.locator(".tb-btn.sharing")).toBeVisible({ timeout: 30000 });
  await expect(b.locator(".tb-btn.sharing")).toBeVisible({ timeout: 30000 });

  await a.locator("#share-close").click();
  await b.locator("#share-close").click();

  // A edits a cell -> B sees it.
  await a.locator('.flow-cell[data-row="1"][data-col="1AC"]').click();
  await a.keyboard.type("From A");
  await expect(b.locator('.flow-cell[data-row="1"][data-col="1AC"]')).toContainText("From A", {
    timeout: 20000,
  });

  // B edits a cell -> A sees it.
  await b.locator('.flow-cell[data-row="2"][data-col="1AC"]').click();
  await b.keyboard.type("From B");
  await expect(a.locator('.flow-cell[data-row="2"][data-col="1AC"]')).toContainText("From B", {
    timeout: 20000,
  });

  await ctxA.close();
  await ctxB.close();
});

import { test, expect } from "@playwright/test";

async function openFirstRound(page: any) {
  const newBtn = page.getByRole("button", { name: "+ New Round" }).first();
  await newBtn.click();
  await expect(page.locator("#flow-view")).toBeVisible();
}

test("dashboard empty state on landing", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("No rounds in All Rounds")).toBeVisible();
  await expect(page.getByText("Create or import a policy debate flow")).toBeVisible();
});

test("create round and type in cell", async ({ page }) => {
  await page.goto("/");
  await openFirstRound(page);
  const cell = page.locator('.flow-cell[data-col="1AC"]').first();
  await cell.click();
  await page.keyboard.type("Trade increases growth");
  await expect(cell).toContainText("Trade increases growth");
});

test("type in cell without losing focus", async ({ page }) => {
  await page.goto("/");
  await openFirstRound(page);
  const cell = page.locator('.flow-cell[data-col="1AC"]').first();
  await cell.dblclick();
  await page.keyboard.type("Long argument text");
  await expect(cell).toContainText("Long argument text");
  await expect(cell).toHaveClass(/editing/);
});

test("partner tab switch", async ({ page }) => {
  await page.goto("/");
  await openFirstRound(page);
  await page.getByRole("tab", { name: "Partner 2" }).click();
  await expect(page.getByText("No positions yet")).toBeVisible();
});

test("mark cell as dropped", async ({ page }) => {
  await page.goto("/");
  await openFirstRound(page);
  const cell = page.locator('.flow-cell[data-col="1AC"]').first();
  await cell.click();
  await page.keyboard.type("Poverty link");
  await cell.click({ button: "right" });
  await page.getByRole("menuitem", { name: "Mark dropped" }).click();
  await expect(cell).toHaveClass(/dropped/);
});

test("import mxflow via backup", async ({ page }) => {
  await page.goto("/");
  const fixture = {
    schemaVersion: 1,
    id: "fixture1",
    meta: { opponent: "Westlake", tournament: "TOC", date: "2026-06-10" },
    partners: [
      {
        id: "partner-1",
        name: "Alex",
        activeSheetId: "s1",
        affCount: 1,
        negCount: 0,
        sheets: [
          {
            id: "s1",
            name: "Trade DA",
            type: "aff",
            cols: ["1AC", "1NC", "2AC", "Block", "1AR", "2NR", "2AR"],
            rows: [{ cells: { "1AC": { text: "Imported arg", mark: "normal" } } }],
          },
        ],
      },
      { id: "partner-2", name: "Jordan", sheets: [], affCount: 0, negCount: 0 },
    ],
    uploadedFiles: [],
    settings: { side: "aff", model: "claude-sonnet-4-6", maxTokens: 1000, insertMode: true },
    activePartnerId: "partner-1",
  };

  const [fileChooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByRole("button", { name: "Import Backup" }).click(),
  ]);
  await fileChooser.setFiles({
    name: "round.mxflow",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(fixture)),
  });

  await expect(page.locator("#flow-view")).toBeVisible();
  await expect(page.locator('.flow-cell[data-col="1AC"]').first()).toContainText("Imported arg");
});

test("back to dashboard from flow", async ({ page }) => {
  await page.goto("/");
  await openFirstRound(page);
  await page.getByRole("button", { name: "← Dashboard" }).click();
  await expect(page.locator("#dashboard-view")).toBeVisible();
});

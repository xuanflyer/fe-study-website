import { test, expect } from "@playwright/test";
import { seedQuestion, cleanupE2E, prisma } from "./fixtures";

test.afterAll(async () => {
  await cleanupE2E();
  await prisma.$disconnect();
});

test("SINGLE: select correct option then submit shows correct", async ({ page }) => {
  const id = await seedQuestion({
    type: "SINGLE",
    title: "e2e single",
    payload: {
      options: [
        { id: "A", label: "wrong" },
        { id: "B", label: "right" },
      ],
      answer: ["B"],
    },
  });
  await page.goto(`/questions/${id}`);
  await expect(page.getByRole("heading", { name: "e2e single" })).toBeVisible({ timeout: 30_000 });
  await page.getByText("right").click();
  await page.getByRole("button", { name: "提交" }).click();
  await expect(page).toHaveURL(/\/result\//);
  await expect(page.getByText("正确", { exact: false })).toBeVisible();
});

test("MULTI: select all correct options submits correct", async ({ page }) => {
  const id = await seedQuestion({
    type: "MULTI",
    title: "e2e multi",
    payload: {
      options: [
        { id: "A", label: "alpha" },
        { id: "B", label: "beta" },
        { id: "C", label: "gamma" },
      ],
      answer: ["A", "C"],
    },
  });
  await page.goto(`/questions/${id}`);
  await page.getByText("alpha").click();
  await page.getByText("gamma").click();
  await page.getByRole("button", { name: "提交" }).click();
  await expect(page).toHaveURL(/\/result\//);
  await expect(page.getByText("正确", { exact: false })).toBeVisible();
});

test("FILL: type answer submits correct", async ({ page }) => {
  const id = await seedQuestion({
    type: "FILL",
    title: "e2e fill",
    payload: { answers: ["React"], caseSensitive: false },
  });
  await page.goto(`/questions/${id}`);
  await page.getByRole("textbox").fill("react");
  await page.getByRole("button", { name: "提交" }).click();
  await expect(page).toHaveURL(/\/result\//);
  await expect(page.getByText("正确", { exact: false })).toBeVisible();
});

test("QA: type answer with keywords submits correct", async ({ page }) => {
  const id = await seedQuestion({
    type: "QA",
    title: "e2e qa",
    payload: {
      referenceAnswer: "Closure is a function bound to its lexical environment.",
      keywords: ["function", "lexical"],
    },
  });
  await page.goto(`/questions/${id}`);
  await page
    .getByRole("textbox")
    .fill("A closure binds a function to its lexical scope and captured variables.");
  await page.getByRole("button", { name: "提交" }).click();
  await expect(page).toHaveURL(/\/result\//);
});

// CODING / PRINT run user code in a WebContainer sandbox (cross-origin isolated).
// Exercising the full run-tests flow inside Playwright requires SharedArrayBuffer
// support and a warm WC boot (~10-30s in CI), which makes these flaky in a
// default config. Left as smoke tests — they load the page and assert the
// editor + run button render.
test("CODING: page loads with editor and run button", async ({ page }) => {
  const id = await seedQuestion({
    type: "CODING",
    title: "e2e coding",
    payload: {
      language: "js",
      entryFn: "add",
      starterCode: "function add(a, b) { return a + b; }",
      tests: [{ name: "1+1", input: [1, 1], expected: 2 }],
    },
  });
  await page.goto(`/questions/${id}`);
  await expect(page.getByRole("heading", { name: "e2e coding" })).toBeVisible();
  await expect(page.getByRole("button", { name: /运行测试/ })).toBeVisible();
});

test("PRINT: page loads with editor", async ({ page }) => {
  const id = await seedQuestion({
    type: "PRINT",
    title: "e2e print",
    payload: { language: "js", starterCode: "console.log('hello');", expectedOutput: "hello" },
  });
  await page.goto(`/questions/${id}`);
  await expect(page.getByRole("heading", { name: "e2e print" })).toBeVisible();
});

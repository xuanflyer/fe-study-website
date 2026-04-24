import { test, expect } from "@playwright/test";
import { seedQuestion, cleanupE2E, prisma } from "./fixtures";

test.afterAll(async () => {
  await cleanupE2E();
  await prisma.$disconnect();
});

test("interview: random N flow finishes with result page", async ({ page }) => {
  // seed 2 simple SINGLEs (interview picks SINGLE-only via filter)
  for (let i = 0; i < 2; i++) {
    await seedQuestion({
      type: "SINGLE",
      title: `e2e interview q${i}`,
      payload: {
        options: [
          { id: "A", label: "yes" },
          { id: "B", label: "no" },
        ],
        answer: ["A"],
      },
      tags: ["e2e-interview"],
    });
  }
  await page.goto("/interview");
  // Filter to SINGLE only so we can drive radio inputs deterministically
  await page.getByRole("button", { name: "单选", exact: true }).click();
  await page.locator('input[type="number"]').first().fill("2");
  await page.getByRole("button", { name: "开始面试" }).click();
  await page.waitForURL(/\/interview\/[\w-]+$/);

  for (let i = 0; i < 2; i++) {
    await page.locator('input[type="radio"]').first().check();
    await page.getByRole("button", { name: /^提交/ }).click();
    await page.waitForTimeout(800);
    if (page.url().includes("/result")) break;
  }
  await expect(page).toHaveURL(/\/interview\/[\w-]+\/result$/);
  await expect(page.getByText("面试总结")).toBeVisible();
});

test("custom-plan: create then view detail shows seeded item", async ({ page }) => {
  const qid = await seedQuestion({
    type: "SINGLE",
    title: "e2e plan question",
    tags: ["e2e-plan"],
    payload: {
      options: [
        { id: "A", label: "x" },
        { id: "B", label: "y" },
      ],
      answer: ["A"],
    },
  });

  // Create plan via API directly (UI creation tested via direct call to keep test simple)
  const res = await page.request.post("/api/custom-plans", {
    data: {
      name: "e2e-test-plan",
      filters: { count: 1, tags: ["e2e-plan"] },
    },
  });
  expect(res.ok()).toBe(true);
  const { planId } = (await res.json()) as { planId: string };

  await page.goto(`/plan/custom/${planId}`);
  await expect(page.getByText("e2e-test-plan")).toBeVisible();
  await expect(page.getByText("e2e plan question")).toBeVisible();

  // tab visible on /plan
  await page.goto("/plan");
  await page.getByRole("button", { name: "自建计划" }).click();
  await expect(page.getByText("e2e-test-plan")).toBeVisible();

  // sanity: question id was seeded
  expect(qid).toBeTruthy();
});

test("level page renders score and four enterprise cards", async ({ page }) => {
  await page.goto("/level");
  await expect(page.getByText("能力评估")).toBeVisible();
  await expect(page.getByText("综合得分")).toBeVisible();
  await expect(page.getByText("阿里 P")).toBeVisible();
  await expect(page.getByText("腾讯 T")).toBeVisible();
});

test("plan today tab loads", async ({ page }) => {
  await page.goto("/plan");
  await expect(page.getByRole("button", { name: "今日复习" })).toBeVisible();
  await expect(page.getByRole("button", { name: "本周计划" })).toBeVisible();
});

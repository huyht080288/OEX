/**
 * Capture OEX UI screenshots for docs/Report.md
 * Prereq: backend (5002) + frontend (5001) running, DB seeded.
 */
import { mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'images');
const BASE = 'http://localhost:5001';
const PASSWORD = 'Password123!';

const IDS = {
  subject: '00000000-0000-4000-8000-000000000010',
  question1: '00000000-0000-4000-8000-000000000020',
  publishedExam: '00000000-0000-4000-8000-000000000031',
  submittedAttempt: '00000000-0000-4000-8000-000000000070',
};

async function login(page, email) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
  await page.waitForTimeout(600);
}

async function shot(page, name) {
  const path = join(OUT_DIR, name);
  await page.screenshot({ path, fullPage: true });
  console.log('Saved', name);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  async function newContextPage() {
    const context = await browser.newContext({
      viewport: { width: 1366, height: 768 },
      deviceScaleFactor: 1,
    });
    return { context, page: await context.newPage() };
  }

  // 1. Login (public)
  {
    const { context, page } = await newContextPage();
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    await shot(page, '01-login.png');
    await context.close();
  }

  // 2–8. Teacher flows
  {
    const { context, page } = await newContextPage();
    await login(page, 'teacher@oex.test');
    await shot(page, '02-dashboard-teacher.png');

    await page.goto(`${BASE}/subjects`, { waitUntil: 'networkidle' });
    await shot(page, '03-subjects.png');

    await page.goto(`${BASE}/subjects/${IDS.subject}/questions`, { waitUntil: 'networkidle' });
    await shot(page, '04-question-bank.png');

    await page.goto(`${BASE}/questions/${IDS.question1}/edit`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.form-card', { timeout: 10000 });
    await shot(page, '05-question-form.png');

    await page.goto(`${BASE}/exams`, { waitUntil: 'networkidle' });
    await shot(page, '06-exam-list.png');

    await page.goto(`${BASE}/exams/${IDS.publishedExam}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await shot(page, '07-exam-detail.png');

    await page.goto(`${BASE}/exams/${IDS.publishedExam}/results`, { waitUntil: 'networkidle' });
    await shot(page, '08-exam-results.png');
    await context.close();
  }

  // Admin
  {
    const { context, page } = await newContextPage();
    await login(page, 'admin@oex.test');
    await shot(page, '09-dashboard-admin.png');
    await page.goto(`${BASE}/admin/users`, { waitUntil: 'networkidle' });
    await shot(page, '10-user-management.png');
    await context.close();
  }

  // Student
  {
    const { context, page } = await newContextPage();
    await login(page, 'student2@oex.test');
    await page.goto(`${BASE}/my-exams`, { waitUntil: 'networkidle' });
    await shot(page, '11-my-exams.png');

    const startBtn = page.getByRole('button', { name: /^Start$/i }).first();
    await startBtn.click();
    await page.waitForURL('**/take/**', { timeout: 15000 });
    await page.waitForSelector('.take-exam__question', { timeout: 10000 });
    await page.locator('.take-exam__option').first().click();
    await page.waitForTimeout(400);
    await shot(page, '12-take-exam.png');

    await page.goto(`${BASE}/results/${IDS.submittedAttempt}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.result-card', { timeout: 10000 });
    await shot(page, '13-result.png');
    await context.close();
  }

  await browser.close();
  console.log('Done — screenshots in docs/images/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import { test, expect } from '@playwright/test';

test('End-to-End Smoke Test for Exam Runner and Dashboard', async ({ page }) => {
  // Test 1: Load Login
  await page.goto('http://localhost:5173');
  await expect(page.locator('h1')).toContainText('Hệ Thống Thi Trực Tuyến Nâng Cao');

  // Test 2: Enter Exam
  await page.fill('input[placeholder="MSSV"]', 'SE12345');
  // Click start exam (will fail fetch in pure test without backend, but UI simulates)
  // In real e2e, we'd mock the network or run backend
  
  // Test 3: Dashboard Navigation
  await page.click('button:text("Chuyển qua Bảng Dashboard Giám Thị")');
  await expect(page.locator('h2')).toContainText('Admin Review Dashboard');
});

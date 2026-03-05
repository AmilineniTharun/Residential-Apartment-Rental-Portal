import { test, expect } from '@playwright/test';

// Use an existing test user and admin from the DB seeder
const TEST_USER = { email: 'test@example.com', password: 'password123' };
const ADMIN_USER = { email: 'admin@example.com', password: 'adminpassword' };

const timestamp = new Date().getTime();
const ISSUE_TEXT = `Automated Leaky Faucet Report ${timestamp}`;

test.describe('Maintenance Request Flow', () => {
    test.setTimeout(45000); // 45 seconds total

    test('User can submit a new maintenance request', async ({ page }) => {
        // 1. User Login
        await page.goto('http://localhost:4200/login');
        await page.fill('input[type="email"]', TEST_USER.email);
        await page.fill('input[type="password"]', TEST_USER.password);
        await page.click('button[type="submit"]');
        await page.waitForTimeout(2000); // Wait for dashboard redirect

        // 2. Navigate to User Dashboard and go to Maintenance Tab
        await page.goto('http://localhost:4200/dashboard');
        await page.waitForTimeout(2000); // Wait for dashboard data to load
        await page.click('text=Maintenance');
        await page.waitForTimeout(1000); // Wait for tab switch

        // 3. Submit Issue
        await page.fill('textarea[name="issue"]', ISSUE_TEXT);
        await page.click('button[type="submit"]:has-text("Submit Request")');

        // 4. Verify Submission Success Message & Appearance in List
        await expect(page.locator('text=Maintenance request submitted successfully!')).toBeVisible();
        await expect(page.locator(`td:has-text("${ISSUE_TEXT}")`)).toBeVisible();
        const pendingStatus = page.locator(`tr:has-text("${ISSUE_TEXT}") >> text=pending`);
        await expect(pendingStatus).toBeVisible();

        // Take screenshot of user dashboard showing the new pending request
        await page.screenshot({ path: 'C:/Users/Tharun/.gemini/antigravity/brain/3873e03a-b5ce-415b-8fe4-6aef42d3f029/user_maintenance_submitted_' + timestamp + '.png', fullPage: true });
    });

    test('Admin can resolve the maintenance request', async ({ browser }) => {
        // Use a new incognito context so sessions don't clash
        const context = await browser.newContext();
        const page = await context.newPage();

        // 1. Admin Login
        await page.goto('http://localhost:4200/login');
        await page.fill('input[type="email"]', ADMIN_USER.email);
        await page.fill('input[type="password"]', ADMIN_USER.password);
        await page.click('button[type="submit"]');
        await page.waitForTimeout(2000); // Wait for dashboard redirect

        // 2. Navigate to Admin Dashboard and go to Maintenance Tab
        await page.goto('http://localhost:4200/admin');
        await page.waitForTimeout(2000); // Wait for dashboard load
        await page.click('text=Maintenance Requests');
        await page.waitForTimeout(1000); // Wait for tab switch

        // 3. Find the specific issue we just created and wait for it to be visible
        const targetRow = page.locator(`tr:has-text("${ISSUE_TEXT}")`);
        await expect(targetRow).toBeVisible();

        // 4. Click the 'Mark Resolved' button inside that specifc row
        await targetRow.locator('button:has-text("Mark Resolved")').click();

        // 5. Verify the updated status in Admin panel
        await expect(page.locator('text=Maintenance request marked as resolved')).toBeVisible();
        await expect(targetRow.locator('span:has-text("resolved")')).toBeVisible();

        // Take screenshot of admin resolving the request
        await page.screenshot({ path: 'C:/Users/Tharun/.gemini/antigravity/brain/3873e03a-b5ce-415b-8fe4-6aef42d3f029/admin_maintenance_resolved_' + timestamp + '.png', fullPage: true });
    });
});

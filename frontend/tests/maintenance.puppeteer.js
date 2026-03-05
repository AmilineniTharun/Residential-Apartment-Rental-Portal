const puppeteer = require('puppeteer');

(async () => {
    const timestamp = new Date().getTime();
    const ISSUE_TEXT = `Automated Leaky Faucet Report ${timestamp}`;

    // Launch browser
    const browser = await puppeteer.launch({ headless: true, defaultViewport: { width: 1280, height: 800 } });

    console.log('--- STARTING MAINTENANCE REQUEST TEST ---');

    try {
        // --- PHASE 1: USER SUBMISSION ---
        console.log('Logging in as User...');
        const userPage = await browser.newPage();
        await userPage.goto('http://localhost:4200/login');
        await userPage.type('input[type="email"]', 'test@example.com');
        await userPage.type('input[type="password"]', 'password123');
        await userPage.click('button[type="submit"]');
        await userPage.waitForNavigation();

        console.log('Navigating to User Dashboard -> Maintenance Tab...');
        await userPage.goto('http://localhost:4200/dashboard');

        // Wait for tab button and click it
        await userPage.waitForSelector('button:has-text("Maintenance")');
        // Puppeteer XPath workaround for finding button by text:
        const [maintenanceTab] = await userPage.$x("//button[contains(., 'Maintenance')]");
        if (maintenanceTab) {
            await maintenanceTab.click();
        } else {
            throw new Error('Maintenance tab not found for user');
        }

        console.log('Submitting Maintenance Request...');
        await userPage.waitForSelector('textarea[name="issue"]');
        await userPage.type('textarea[name="issue"]', ISSUE_TEXT);
        await userPage.click('button[type="submit"]');

        // Wait for success message
        await userPage.waitForXPath(`//p[contains(., 'Maintenance request submitted successfully!')]`);
        console.log('✅ User successfully submitted maintenance request!');

        // Wait for it to appear in list
        await userPage.waitForXPath(`//td[contains(., '${ISSUE_TEXT}')]`);
        await userPage.screenshot({ path: `C:/Users/Tharun/.gemini/antigravity/brain/3873e03a-b5ce-415b-8fe4-6aef42d3f029/user_maintenance_submitted_${timestamp}.png`, fullPage: true });

        // --- PHASE 2: ADMIN RESOLUTION ---
        console.log('Logging in as Admin...');
        const adminPage = await browser.newPage();
        await adminPage.goto('http://localhost:4200/login');
        await adminPage.type('input[type="email"]', 'admin@example.com');
        await adminPage.type('input[type="password"]', 'adminpassword');
        await adminPage.click('button[type="submit"]');
        await adminPage.waitForNavigation();

        console.log('Navigating to Admin Dashboard -> Maintenance Requests Tab...');
        await adminPage.goto('http://localhost:4200/admin');

        const [adminMaintenanceTab] = await adminPage.$x("//button[contains(., 'Maintenance Requests')]");
        if (adminMaintenanceTab) {
            await adminMaintenanceTab.click();
        } else {
            throw new Error('Maintenance tab not found for admin');
        }

        console.log('Finding and resolving specific request...');
        // Wait for table to load
        await adminPage.waitForTimeout(1000);

        // Find row with issue text and click "Mark Resolved"
        const [targetRow] = await adminPage.$x(`//tr[contains(., '${ISSUE_TEXT}')]`);
        if (targetRow) {
            const [resolveBtn] = await targetRow.$x(`.//button[contains(., 'Mark Resolved')]`);
            if (resolveBtn) {
                await resolveBtn.click();
            } else {
                throw new Error('Mark Resolved button not found in row');
            }
        } else {
            throw new Error('Could not find maintenance row in Admin view');
        }

        // Wait for success
        await adminPage.waitForXPath(`//p[contains(., 'Maintenance request marked as resolved')]`);
        await adminPage.screenshot({ path: `C:/Users/Tharun/.gemini/antigravity/brain/3873e03a-b5ce-415b-8fe4-6aef42d3f029/admin_maintenance_resolved_${timestamp}.png`, fullPage: true });
        console.log('✅ Admin successfully resolved the maintenance request!');

        console.log('--- TEST PASSED SUCCESSFULLY ---');

    } catch (e) {
        console.error('❌ TEST FAILED:', e);
    } finally {
        await browser.close();
    }
})();

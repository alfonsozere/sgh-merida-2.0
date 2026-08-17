const puppeteer = require('puppeteer');

(async () => {
    console.log("Starting browser...");
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    // Catch all console logs and errors
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.error('PAGE ERROR:', error.message));
    page.on('response', response => {
        if (!response.ok()) {
            console.log('PAGE NETWORK ERROR:', response.url(), response.status());
        }
    });

    console.log("Navigating to app...");
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });

    console.log("Waiting for app to load...");
    
    // Simulate login if needed. 
    try {
        await page.waitForSelector('#login-form, #btn-guardar-matricula', { timeout: 5000 });
        const loginBtn = await page.$('#login-form button[type="submit"]');
        if (loginBtn) {
            console.log("Login form detected, clicking login...");
            await loginBtn.click();
            await page.waitForSelector('#btn-guardar-matricula', { timeout: 10000 });
        }
    } catch(e) {
        console.log("Timeout waiting for login or dashboard.", e.message);
    }

    console.log("Clicking save button...");
    const btnSave = await page.$('#btn-guardar-matricula');
    if (btnSave) {
        await btnSave.click();
        console.log("Button clicked!");
        
        await new Promise(r => setTimeout(r, 2000));
        
        const modalVisible = await page.evaluate(() => {
            const m = document.getElementById('modal-confirm-incompleta');
            return m ? m.style.display !== 'none' : false;
        });
        console.log("Modal visible?", modalVisible);
        
        if (modalVisible) {
            console.log("Clicking Aceptar in modal...");
            await page.click('#btn-aceptar-incompleta');
            await new Promise(r => setTimeout(r, 2000));
        }

        const btnText = await page.evaluate(() => document.getElementById('btn-guardar-matricula').textContent);
        console.log("Final button text:", btnText);
    } else {
        console.log("Could not find save button!");
    }

    await browser.close();
})();

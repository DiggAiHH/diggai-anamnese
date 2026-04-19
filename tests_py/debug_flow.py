"""Quick diagnostic: full questionnaire flow step by step"""
import json, os
from datetime import datetime, timezone
from playwright.sync_api import sync_playwright

os.environ.setdefault("PLAYWRIGHT_BROWSERS_PATH", r"D:\playwright-browsers")
BASE = "http://localhost:5173"

SEEDS = {
    "cookie_consent": json.dumps({
        "essential": True, "functional": False, "analytics": False,
        "timestamp": datetime.now(timezone.utc).isoformat(), "version": "1.0.0",
    }),
    "dsgvo_consent": "true",
    "anamnese-mode": json.dumps({"state": {"mode": "demo"}, "version": 0}),
}

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1280, "height": 720}, locale="de-DE")

    # Seed
    page.goto(BASE)
    for k, v in SEEDS.items():
        page.evaluate("(a) => localStorage.setItem(a.key, a.value)", {"key": k, "value": v})
    page.evaluate("() => localStorage.removeItem('anamnese-session')")
    page.reload()
    page.wait_for_load_state("domcontentloaded")
    page.wait_for_timeout(2000)

    # Navigate to /patient
    page.goto(f"{BASE}/patient")
    page.wait_for_load_state("domcontentloaded")
    page.wait_for_timeout(2000)

    # Click first service card
    start_btns = page.get_by_role("button", name="Jetzt starten")
    start_btns.first.click()
    page.wait_for_timeout(3000)

    # Accept consent
    label_t = page.locator("label[for='consent-treatment']")
    if label_t.count() > 0:
        label_t.click()
        page.locator("label[for='consent-data']").click()
        page.wait_for_timeout(500)
        page.get_by_role("button", name="Fragebogen starten").click()
        page.wait_for_timeout(2000)
    
    print("=== AFTER CONSENT ===")
    page.screenshot(path="debug_step1_consent_done.png")
    body = page.inner_text("body")
    print(body[:2000])
    
    # Check for buttons
    buttons = page.get_by_role("button")
    print(f"\nButtons ({buttons.count()}):")
    for i in range(min(buttons.count(), 15)):
        try:
            txt = buttons.nth(i).inner_text(timeout=500)
            vis = buttons.nth(i).is_visible()
            if vis:
                print(f"  [{i}] {repr(txt[:60])}")
        except:
            pass

    # Click "Nein" (new patient)
    nein_btn = page.get_by_role("button", name="Nein")
    if nein_btn.count() > 0:
        print(f"\nClicking 'Nein' (count={nein_btn.count()})...")
        nein_btn.first.click()
        page.wait_for_timeout(2000)
        
        # Dismiss recovery dialog if it appears
        try:
            fort_btn = page.get_by_role("button", name="Fortsetzen")
            if fort_btn.count() > 0 and fort_btn.first.is_visible():
                print("Recovery dialog appeared! Clicking Fortsetzen...")
                fort_btn.first.click()
                page.wait_for_timeout(1000)
        except:
            pass
        
        print("\n=== AFTER 'Nein' (new patient) ===")
        page.screenshot(path="debug_step2_after_nein.png")
        body2 = page.inner_text("body")
        print(body2[:2000])
        
        # Check inputs
        inputs = page.locator("input")
        print(f"\nInputs ({inputs.count()}):")
        for i in range(min(inputs.count(), 10)):
            try:
                vis = inputs.nth(i).is_visible()
                typ = inputs.nth(i).get_attribute("type")
                plh = inputs.nth(i).get_attribute("placeholder")
                print(f"  [{i}] type={typ}, placeholder={plh}, visible={vis}")
            except:
                pass
                
        # Check visible buttons
        buttons2 = page.get_by_role("button")
        print(f"\nButtons ({buttons2.count()}):")
        for i in range(min(buttons2.count(), 15)):
            try:
                txt = buttons2.nth(i).inner_text(timeout=500)
                vis = buttons2.nth(i).is_visible()
                if vis:
                    print(f"  [{i}] {repr(txt[:60])}")
            except:
                pass
        
        # Try clicking Weiter without filling
        weiter = page.get_by_role("button", name="Weiter", exact=True)
        if weiter.count() > 0 and weiter.first.is_visible():
            print(f"\nWeiter button found, enabled={weiter.first.is_enabled()}")
            weiter.first.click(force=True)
            page.wait_for_timeout(1000)
            page.screenshot(path="debug_step3_after_empty_weiter.png")
            # Check for errors
            errs = page.locator("[aria-invalid='true'], [role='alert'], .text-red-500, .text-destructive, .border-red-500")
            print(f"Error indicators: {errs.count()}")
            body3 = page.inner_text("body")
            if "Pflichtfeld" in body3 or "erforderlich" in body3 or "required" in body3:
                print("Validation message found!")
            else:
                print(f"body snippet: {body3[:500]}")
    
    browser.close()
    print("\nDone.")

"""Diagnostic script to inspect the actual UI structure of the Anamnese app."""
import os
os.environ["PLAYWRIGHT_BROWSERS_PATH"] = r"D:\playwright-browsers"

from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:5173"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(locale="de-DE", viewport={"width": 1280, "height": 720})
    page = ctx.new_page()

    # --- 1) Home page ---
    page.goto(BASE_URL)
    page.wait_for_load_state("networkidle")
    print("=== PAGE TITLE ===")
    print(page.title())

    print("\n=== LANGUAGE SELECTOR ===")
    lang_btn = page.locator("[data-testid='language-selector']")
    if lang_btn.count() > 0:
        print(f"  text: '{lang_btn.inner_text()}'")
        print(f"  html: {lang_btn.evaluate('el => el.outerHTML')[:300]}")
    else:
        print("  NOT FOUND by data-testid")
        # Try other selectors
        for sel in ["button:has-text('Sprache')", "button:has-text('DE')", "[aria-label*='Sprache']", "[aria-label*='language']"]:
            alt = page.locator(sel)
            if alt.count() > 0:
                print(f"  Found by '{sel}': '{alt.first.inner_text()}'")

    print("\n=== SCROLL WIDTH (for mobile overflow check) ===")
    sw = page.evaluate("document.documentElement.scrollWidth")
    cw = page.evaluate("document.documentElement.clientWidth")
    print(f"  scrollWidth={sw}, clientWidth={cw}, overflow={sw > cw}")

    # --- 2) /patient page ---
    page.goto(f"{BASE_URL}/patient")
    page.wait_for_load_state("networkidle")
    print("\n=== /patient BUTTONS ===")
    buttons = page.locator("button")
    for i in range(min(buttons.count(), 20)):
        btn = buttons.nth(i)
        if btn.is_visible():
            txt = btn.inner_text().strip().replace("\n", " ")
            if txt:
                print(f"  Button[{i}]: '{txt}'")

    print("\n=== /patient ALL LINKS ===")
    links = page.locator("a[href]")
    for i in range(min(links.count(), 15)):
        link = links.nth(i)
        if link.is_visible():
            href = link.get_attribute("href")
            txt = link.inner_text().strip()[:50]
            if txt:
                print(f"  Link: '{txt}' -> {href}")

    # --- 3) Check cookie/consent dialogs ---
    print("\n=== DIALOGS / MODALS ===")
    for sel in ["[role='dialog']", "[role='alertdialog']", ".modal", "[data-state='open']"]:
        els = page.locator(sel)
        if els.count() > 0:
            for j in range(els.count()):
                txt = els.nth(j).inner_text()[:100]
                print(f"  {sel}[{j}]: '{txt}'")

    # Try clicking the start button
    print("\n=== TRYING START BUTTONS ===")
    for label in ["Jetzt starten", "Termin", "Start", "Anamnese starten", "Fragebogen", "Neue Anamnese"]:
        btn = page.locator(f"button:has-text('{label}')")
        if btn.count() > 0:
            print(f"  FOUND: '{label}' (count={btn.count()}, text='{btn.first.inner_text().strip()[:60]}')")

    # Also search link-style buttons
    for label in ["Jetzt starten", "Termin", "Start", "Anamnese"]:
        link = page.locator(f"a:has-text('{label}')")
        if link.count() > 0:
            print(f"  FOUND link: '{label}' -> {link.first.get_attribute('href')}")

    # --- 4) Impressum ---
    print("\n=== /impressum ===")
    resp = page.goto(f"{BASE_URL}/impressum")
    print(f"  Status: {resp.status if resp else 'none'}")
    page.wait_for_load_state("networkidle")
    main = page.locator("main#main-content")
    print(f"  main#main-content visible: {main.is_visible() if main.count() > 0 else 'NOT FOUND'}")

    browser.close()
    print("\n=== DONE ===")

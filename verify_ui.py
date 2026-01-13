from playwright.sync_api import sync_playwright
import os
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # Desktop Context
        context_desktop = browser.new_context(viewport={'width': 1400, 'height': 900})
        page_desktop = context_desktop.new_page()
        page_desktop.goto("http://localhost:8080/index.html")
        time.sleep(2) # Allow animations to settle
        page_desktop.screenshot(path="screenshot_desktop.png")
        print("Desktop screenshot taken.")

        # Mobile Context (iPhone 12 Pro)
        iphone_12 = p.devices['iPhone 12 Pro']
        context_mobile = browser.new_context(**iphone_12)
        page_mobile = context_mobile.new_page()
        page_mobile.goto("http://localhost:8080/index.html")
        time.sleep(2)
        page_mobile.screenshot(path="screenshot_mobile.png")
        print("Mobile screenshot taken.")

        browser.close()

if __name__ == "__main__":
    run()

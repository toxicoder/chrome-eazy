import os
from pathlib import Path
from playwright.sync_api import sync_playwright

def verify_sidebar():
    with sync_playwright() as p:
        # Get the absolute path to the extension
        extension_path = os.path.abspath('.')

        # A temporary user data dir is needed to load extensions
        user_data_dir = "/tmp/test-user-data-dir"

        context = p.chromium.launch_persistent_context(
            user_data_dir,
            headless=True,
            args=[
                f"--disable-extensions-except={extension_path}",
                f"--load-extension={extension_path}",
            ],
        )

        # The service worker is where we can get the extension's ID from
        if not context.service_workers:
            service_worker = context.wait_for_event("serviceworker")
        else:
            service_worker = context.service_workers[0]

        extension_id = service_worker.url.split("/")[2]

        # Navigate to the sidebar page
        page = context.new_page()
        page.goto(f"chrome-extension://{extension_id}/sidebar.html")

        # Wait for the content to be loaded
        page.wait_for_selector("#create-workspace-btn")

        # Take a screenshot
        screenshot_path = "jules-scratch/verification/verification.png"
        page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

        context.close()

if __name__ == "__main__":
    verify_sidebar()

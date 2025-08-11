import os
import tempfile
import time
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

def test_sidebar_loads_and_has_correct_title():
    # Get the absolute path to the extension directory
    extension_path = Path(os.getcwd()).resolve()

    # Create a temporary user data directory for the browser
    with tempfile.TemporaryDirectory() as user_data_dir:
        with sync_playwright() as p:
            # Launch a persistent browser context with the extension loaded
            context = p.chromium.launch_persistent_context(
                user_data_dir,
                headless=True,
                args=[
                    f"--disable-extensions-except={extension_path}",
                    f"--load-extension={extension_path}",
                ],
            )

            # Give the extension a moment to load
            time.sleep(5)

            print("Service workers found:", context.service_workers)

            try:
                # The service worker's URL contains the extension ID.
                if context.service_workers:
                    service_worker = context.service_workers[0]
                else:
                    service_worker = context.wait_for_event("serviceworker", timeout=10000)

                extension_id = service_worker.url.split('/')[2]

                # Now, create a new page and navigate to the sidebar's URL
                page = context.new_page()
                page.goto(f"chrome-extension://{extension_id}/sidebar.html")

                # Verify that the title of the sidebar is "Sidebar"
                expect(page).to_have_title("Sidebar")

                # Verify that the main heading is visible
                heading = page.get_by_role("heading", name="Chrome Eazy")
                expect(heading).to_be_visible()

                # Take a screenshot for visual verification
                page.screenshot(path="jules-scratch/verification/verification.png")

            finally:
                context.close()


if __name__ == "__main__":
    test_sidebar_loads_and_has_correct_title()

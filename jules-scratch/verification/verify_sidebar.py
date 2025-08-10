import asyncio
from playwright.async_api import async_playwright
import os

async def main():
    async with async_playwright() as p:
        extension_path = os.getcwd()
        browser_context = await p.chromium.launch_persistent_context(
            "",
            headless=True,
            args=[
                f"--disable-extensions-except={extension_path}",
                f"--load-extension={extension_path}",
            ],
        )
        page = await browser_context.new_page()
        await page.goto(f"file://{os.getcwd()}/sidebar.html")
        # Wait for the web components to load
        await page.wait_for_timeout(3000)
        await page.screenshot(path="jules-scratch/verification/verification.png")
        await browser_context.close()

if __name__ == "__main__":
    asyncio.run(main())

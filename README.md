# chrome-eazy

**Supercharge your browser workflow by organizing your tabs into clean, distinct workspaces.**

`chrome-eazy` is a Chrome extension for users who juggle multiple projects or contexts. It uses the Side Panel API to create a central hub for managing "workspaces"—logical groups of tabs that you can switch between instantly.

---

## Features

- **✅ Workspace Management:** Create and name workspaces to group your tabs by task, project, or any other category.
- **🚀 One-Click Switching:** Activate a workspace to instantly bring all its tabs into focus while hiding others.
- **🙈 Automatic Tab Hiding:** Inactive workspaces have their tabs neatly tucked away into a collapsed tab group, reducing clutter.
- **➕ Easily Add Tabs:** Add the current tab to your active workspace with a single click.
- **🗂️ Centralized View:** See all your workspaces and the tabs within the active one, all from the comfort of the Chrome Side Panel.

---

## Installation

Since the extension is in active development, you'll need to load it manually in Chrome's developer mode.

1.  **Download the Code:** Clone or download this repository to your local machine.
    ```bash
    git clone https://github.com/toxicoder/chrome-eazy.git
    ```
2.  **Open Chrome Extensions:** Open Google Chrome and navigate to `chrome://extensions`.
3.  **Enable Developer Mode:** In the top-right corner of the Extensions page, toggle on **Developer mode**.
4.  **Load the Extension:** Click the **"Load unpacked"** button that appears and select the `chrome-eazy` directory you just downloaded.

The `chrome-eazy` icon should now appear in your Chrome toolbar. Clicking it will open the Side Panel.

---

## How to Use

1.  **Open the Side Panel:** Click the `chrome-eazy` extension icon in your toolbar to open the Side Panel.
2.  **Create a Workspace:**
    - Click the **"Create Workspace"** button.
    - Enter a name for your new workspace (e.g., "Project Phoenix," "Social Media").
    - The new workspace will appear in the list. The first one you create is automatically activated.
3.  **Add Tabs to a Workspace:**
    - Make sure the desired workspace is active (it will be highlighted).
    - Navigate to the tab you want to add.
    - In the side panel, click the **"Add Current Tab"** button.
    - The tab will now appear in the list for the active workspace.
4.  **Switch Between Workspaces:**
    - Simply click on any workspace icon in the side panel.
    - The tabs for the selected workspace will become visible, and all other workspace tabs will be hidden.

---

## How It Works

`chrome-eazy` leverages several modern Chrome Extension APIs to provide a seamless experience:

-   **`chrome.sidePanel`**: This API is used to create the main user interface, which lives in the browser's side panel. The UI is built with HTML, CSS, and JavaScript (`sidebar.html`, `sidebar.css`, `sidebar.js`).
-   **`chrome.storage.local`**: All workspace data, including the list of workspaces and the tabs they contain, is stored in the browser's local storage. This ensures your workspaces persist across browser sessions.
-   **`chrome.tabGroups`**: This is the magic behind showing and hiding tabs. When you switch to a new workspace, the tabs from all other workspaces are grouped together into a single, collapsed group titled "Inactive Workspaces". When you switch back, tabs are ungrouped and restored.
-   **`background.js`**: This is the service worker that runs in the background. It listens for browser events (like a tab closing) to keep the workspace data in sync and handles the core logic of showing and hiding tabs by communicating with the `tabGroups` API.
-   **`sidebar.js`**: This script manages the entire side panel UI. It's responsible for rendering the list of workspaces and tabs, handling user clicks, and communicating with the background script to trigger actions.

---

## Contributing

This project is being built with the assistance of a cutting-edge coding LLM. Development is guided by a series of concise, bite-sized tasks. If you're interested in contributing, please refer to the project's issue tracker or development plan for the next available task.

## Support My Projects

If you find this repository helpful and would like to support its development, consider making a donation:

### GitHub Sponsors
[![Sponsor](https://img.shields.io/badge/Sponsor-%23EA4AAA?style=for-the-badge&logo=github)](https://github.com/sponsors/toxicoder)

### Buy Me a Coffee
<a href="https://www.buymeacoffee.com/toxicoder" target="_blank">
    <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="41" width="174">
</a>

### PayPal
[![PayPal](https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif)](https://www.paypal.com/donate/?hosted_button_id=LSHNL8YLSU3W6)

### Ko-fi
<a href="https://ko-fi.com/toxicoder" target="_blank">
    <img src="https://storage.ko-fi.com/cdn/kofi3.png" alt="Ko-fi" height="41" width="174">
</a>

### Coinbase
[![Donate via Coinbase](https://img.shields.io/badge/Donate%20via-Coinbase-0052FF?style=for-the-badge&logo=coinbase&logoColor=white)](https://commerce.coinbase.com/checkout/e07dc140-d9f7-4818-b999-fdb4f894bab7)

Your support helps maintain and improve this collection of development tools and templates. Thank you for contributing to open source!

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

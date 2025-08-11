import 'https://esm.run/@material/web/list/list.js';
import 'https://esm.run/@material/web/list/list-item.js';
import 'https://esm.run/@material/web/card/elevated-card.js';
import 'https://esm.run/@material/web/icon/icon.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- Greeting ---
    function setGreeting() {
        const greetingEl = document.querySelector('.dashboard-header h1');
        const hour = new Date().getHours();
        let greeting;
        if (hour < 12) {
            greeting = 'Good Morning!';
        } else if (hour < 18) {
            greeting = 'Good Afternoon!';
        } else {
            greeting = 'Good Evening!';
        }
        greetingEl.textContent = greeting;
    }

    // --- Render Functions ---
    function renderWorkspaces(workspaces) {
        const grid = document.getElementById('workspaces-grid');
        grid.innerHTML = '';
        if (!workspaces || workspaces.length === 0) {
            grid.innerHTML = `
                <div class="empty-state-container">
                    <md-icon>space_dashboard</md-icon>
                    <h3>No Workspaces</h3>
                    <p>Click the extension icon to open the side panel and create one!</p>
                </div>
            `;
            return;
        }
        workspaces.forEach(workspace => {
            const card = document.createElement('md-elevated-card');
            card.dataset.workspaceId = workspace.id;
            card.innerHTML = `
                <div class="card-content">
                    <md-icon>space_dashboard</md-icon>
                    <div class="text-content">
                        <div class="title">${workspace.name}</div>
                    </div>
                </div>
            `;
            // In a real scenario, this would open the workspace. For now, it does nothing.
            grid.appendChild(card);
        });
    }

    function renderBookmarks(bookmarks) {
        const grid = document.getElementById('bookmarks-grid');
        grid.innerHTML = '';
        if (!bookmarks || bookmarks.length === 0) {
            grid.innerHTML = `
                <div class="empty-state-container">
                    <md-icon>bookmark</md-icon>
                    <h3>No Recent Bookmarks</h3>
                    <p>Your recently added bookmarks will appear here.</p>
                </div>
            `;
            return;
        }
        bookmarks.slice(0, 6).forEach(bookmark => { // Show up to 6 bookmarks
            const card = document.createElement('md-elevated-card');
            card.className = 'bookmark-card';
            const hostname = new URL(bookmark.url).hostname;
            card.innerHTML = `
                <div class="card-content">
                    <img class="icon" src="https://www.google.com/s2/favicons?sz=32&domain=${hostname}" alt="">
                    <div class="text-content">
                        <div class="title">${bookmark.title || hostname}</div>
                        <div class="hostname">${hostname}</div>
                    </div>
                </div>
            `;
            card.addEventListener('click', () => chrome.tabs.create({ url: bookmark.url }));
            grid.appendChild(card);
        });
    }

    function renderRecentTabs(sessions) {
        const list = document.getElementById('recent-tabs-list');
        list.innerHTML = '';
        const filteredSessions = sessions.filter(s => s.tab && s.tab.url);

        if (!filteredSessions || filteredSessions.length === 0) {
            const placeholder = document.createElement('md-list-item');
            placeholder.headline = "No recently closed tabs.";
            placeholder.disabled = true;
            list.appendChild(placeholder);
            return;
        }

        filteredSessions.slice(0, 10).forEach(session => { // Show up to 10 tabs
            const item = document.createElement('md-list-item');
            item.headline = session.tab.title || session.tab.url;
            item.supportingText = new URL(session.tab.url).hostname;

            const favicon = document.createElement('img');
            favicon.slot = 'start';
            favicon.className = 'favicon';
            favicon.src = `https://www.google.com/s2/favicons?sz=32&domain=${new URL(session.tab.url).hostname}`;
            item.appendChild(favicon);

            item.addEventListener('click', () => {
                if (session.tab.sessionId) {
                    chrome.sessions.restore(session.tab.sessionId);
                } else {
                    chrome.tabs.create({ url: session.tab.url });
                }
            });
            list.appendChild(item);
        });
    }


    // --- Data Fetching Functions ---
    async function loadWorkspaces() {
        if (chrome.storage && chrome.storage.local) {
            const { workspaces = [] } = await chrome.storage.local.get({ workspaces: [] });
            renderWorkspaces(workspaces);
        }
    }

    async function loadBookmarks() {
        if (chrome.bookmarks) {
            chrome.bookmarks.getRecent(12, (bookmarks) => {
                renderBookmarks(bookmarks);
            });
        }
    }

    async function loadRecentTabs() {
        if (chrome.sessions) {
            chrome.sessions.getRecentlyClosed({ maxResults: 25 }, (sessions) => {
                renderRecentTabs(sessions);
            });
        }
    }


    // --- Initial Load ---
    setGreeting();
    loadWorkspaces();
    loadBookmarks();
    loadRecentTabs();

});

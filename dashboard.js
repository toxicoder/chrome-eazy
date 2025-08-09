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
            grid.innerHTML = '<p class="placeholder">No workspaces created yet.</p>';
            return;
        }
        workspaces.forEach(workspace => {
            const card = document.createElement('md-elevated-card');
            card.dataset.workspaceId = workspace.id;
            card.innerHTML = `
                <div class="card-content">
                    <div class="icon">${workspace.name.charAt(0).toUpperCase()}</div>
                    <div class="title">${workspace.name}</div>
                </div>
            `;
            // In a real scenario, this would open the workspace. For now, it does nothing.
            grid.appendChild(card);
        });
    }

    // function renderBookmarks(bookmarks) {
    //     const grid = document.getElementById('bookmarks-grid');
    //     grid.innerHTML = '';
    //     if (!bookmarks || bookmarks.length === 0) {
    //         grid.innerHTML = '<p class="placeholder">No recent bookmarks found.</p>';
    //         return;
    //     }
    //     bookmarks.slice(0, 6).forEach(bookmark => { // Show up to 6 bookmarks
    //         const card = document.createElement('md-elevated-card');
    //         card.className = 'bookmark-card';
    //         card.innerHTML = `
    //             <div class="card-content">
    //                 <img class="icon" src="https://www.google.com/s2/favicons?sz=32&domain=${new URL(bookmark.url).hostname}" alt="">
    //                 <div class="title">${bookmark.title}</div>
    //             </div>
    //         `;
    //         card.addEventListener('click', () => window.open(bookmark.url, '_blank'));
    //         grid.appendChild(card);
    //     });
    // }

    // function renderRecentTabs(sessions) {
    //     const list = document.getElementById('recent-tabs-list');
    //     list.innerHTML = '';
    //     if (!sessions || sessions.length === 0) {
    //         list.innerHTML = '<p class="placeholder">No recently closed tabs.</p>';
    //         return;
    //     }
    //     sessions.slice(0, 10).forEach(session => { // Show up to 10 tabs
    //         if (session.tab) {
    //             const item = document.createElement('md-list-item');
    //             item.headline = session.tab.title;
    //             item.href = session.tab.url;
    //             item.target = '_blank';
    //             item.innerHTML = `
    //                 <img slot="start" class="favicon" src="https://www.google.com/s2/favicons?sz=32&domain=${new URL(session.tab.url).hostname}" alt="">
    //                 ${session.tab.title}
    //             `;
    //             list.appendChild(item);
    //         }
    //     });
    // }


    // --- Data Fetching Functions ---
    async function loadWorkspaces() {
        if (chrome.storage && chrome.storage.local) {
            const { workspaces = [] } = await chrome.storage.local.get({ workspaces: [] });
            renderWorkspaces(workspaces);
        }
    }

    // async function loadBookmarks() {
    //     if (chrome.bookmarks) {
    //         chrome.bookmarks.getRecent(12, (bookmarks) => {
    //             renderBookmarks(bookmarks);
    //         });
    //     }
    // }

    // async function loadRecentTabs() {
    //     if (chrome.sessions) {
    //         chrome.sessions.getRecentlyClosed({ maxResults: 10 }, (sessions) => {
    //             renderRecentTabs(sessions);
    //         });
    //     }
    // }


    // --- Initial Load ---
    setGreeting();
    loadWorkspaces();
    // loadBookmarks();
    // loadRecentTabs();

});

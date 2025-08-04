document.addEventListener('DOMContentLoaded', function() {
    const createWorkspaceBtn = document.querySelector('.create-workspace-btn');
    const addTabBtn = document.querySelector('.add-tab-btn');
    const workspaceList = document.querySelector('.workspace-list');
    const tabList = document.querySelector('.tab-list');

    const ACTIVE_WORKSPACE_ID_KEY = 'activeWorkspaceId';

    async function renderWorkspaces() {
        const { workspaces = [] } = await chrome.storage.local.get({ workspaces: [] });
        const { [ACTIVE_WORKSPACE_ID_KEY]: activeWorkspaceId } = await chrome.storage.local.get(ACTIVE_WORKSPACE_ID_KEY);

        workspaceList.innerHTML = ''; // Clear existing workspaces
        workspaces.forEach(workspace => {
            const workspaceEl = document.createElement('div');
            workspaceEl.className = 'workspace-icon';
            workspaceEl.textContent = workspace.name.charAt(0).toUpperCase();
            workspaceEl.title = workspace.name;
            workspaceEl.dataset.workspaceId = workspace.id;

            if (workspace.id === activeWorkspaceId) {
                workspaceEl.classList.add('active');
            }

            workspaceEl.addEventListener('click', handleWorkspaceClick);
            workspaceList.appendChild(workspaceEl);
        });

        renderTabsForActiveWorkspace();
    }

    async function renderTabs(tabIds) {
        tabList.innerHTML = ''; // Clear existing tabs

        if (!tabIds || tabIds.length === 0) {
            tabList.innerHTML = '<div class="tab-item">No tabs in this workspace yet.</div>';
            return;
        }

        try {
            // Filter out any invalid tab IDs that might have been stored.
            const validTabIds = tabIds.filter(id => typeof id === 'number');
            if (validTabIds.length === 0) {
                tabList.innerHTML = '<div class="tab-item">No tabs in this workspace yet.</div>';
                return;
            }

            const tabsInfo = await chrome.tabs.get(validTabIds);
            tabsInfo.forEach(tab => {
                const tabEl = document.createElement('div');
                tabEl.className = 'tab-item';
                tabEl.title = tab.title;
                tabEl.dataset.tabId = tab.id;

                // Add favicon if it exists
                if (tab.favIconUrl) {
                    const favicon = document.createElement('img');
                    favicon.src = tab.favIconUrl;
                    favicon.className = 'favicon';
                    tabEl.appendChild(favicon);
                }

                const tabTitle = document.createElement('span');
                tabTitle.textContent = tab.title;
                tabEl.appendChild(tabTitle);

                tabEl.addEventListener('click', () => {
                    chrome.tabs.update(tab.id, { active: true });
                    chrome.windows.update(tab.windowId, { focused: true });
                });
                tabList.appendChild(tabEl);
            });
        } catch (error) {
            console.error("Error rendering tabs:", error);
            // This can happen if a tab was closed but not yet removed from the workspace data.
            tabList.innerHTML = '<div class="tab-item">Could not load all tabs. They may have been closed.</div>';
        }
    }

    async function renderTabsForActiveWorkspace() {
        const { workspaces = [] } = await chrome.storage.local.get({ workspaces: [] });
        const { [ACTIVE_WORKSPACE_ID_KEY]: activeWorkspaceId } = await chrome.storage.local.get(ACTIVE_WORKSPACE_ID_KEY);

        const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);

        if (activeWorkspace && activeWorkspace.tabs) {
            renderTabs(activeWorkspace.tabs);
        } else {
            renderTabs([]); // Render empty state
        }
    }

    function handleWorkspaceClick(event) {
        const workspaceId = event.target.dataset.workspaceId;
        activateWorkspace(workspaceId);
    }

    async function activateWorkspace(workspaceId) {
        await chrome.storage.local.set({ [ACTIVE_WORKSPACE_ID_KEY]: workspaceId });

        const { workspaces = [] } = await chrome.storage.local.get({ workspaces: [] });
        const allTabs = await chrome.tabs.query({});
        const allTabIds = new Set(allTabs.map(t => t.id));

        let workspacesNeedUpdate = false;

        const tabsToShow = [];
        const tabsToHide = [];

        for (const workspace of workspaces) {
            const originalTabCount = workspace.tabs.length;
            workspace.tabs = workspace.tabs.filter(tabId => allTabIds.has(tabId));
            if(workspace.tabs.length !== originalTabCount) {
                workspacesNeedUpdate = true;
            }

            const workspaceTabs = Array.isArray(workspace.tabs) ? workspace.tabs : [];
            if (workspace.id === workspaceId) {
                tabsToShow.push(...workspaceTabs);
            } else {
                tabsToHide.push(...workspaceTabs);
            }
        }

        if (workspacesNeedUpdate) {
            await chrome.storage.local.set({ workspaces });
        }

        chrome.runtime.sendMessage({ action: 'showTabs', tabIds: tabsToShow });
        chrome.runtime.sendMessage({ action: 'hideTabs', tabIds: tabsToHide });

        renderWorkspaces();
    }

    async function addCurrentTabToActiveWorkspace() {
        const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const { [ACTIVE_WORKSPACE_ID_KEY]: activeWorkspaceId } = await chrome.storage.local.get(ACTIVE_WORKSPACE_ID_KEY);

        if (!activeWorkspaceId) {
            alert('Please select a workspace first!');
            return;
        }

        if (!currentTab) {
            alert('No active tab found.');
            return;
        }

        const { workspaces = [] } = await chrome.storage.local.get({ workspaces: [] });
        const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);

        if (activeWorkspace) {
            // Ensure tabs array exists
            if (!Array.isArray(activeWorkspace.tabs)) {
                activeWorkspace.tabs = [];
            }
            // Add tab if it's not already there
            if (!activeWorkspace.tabs.includes(currentTab.id)) {
                activeWorkspace.tabs.push(currentTab.id);
                await chrome.storage.local.set({ workspaces });
                renderTabsForActiveWorkspace();
            } else {
                alert('This tab is already in the active workspace.');
            }
        }
    }

    createWorkspaceBtn.addEventListener('click', function() {
        const workspaceName = prompt('Enter a name for the new workspace:');
        if (workspaceName) {
            chrome.storage.local.get({ workspaces: [] }, function(data) {
                const workspaces = data.workspaces;
                const newWorkspace = {
                    id: 'workspace-' + Date.now(),
                    name: workspaceName,
                    tabs: [] // array of tab IDs
                };
                workspaces.push(newWorkspace);
                chrome.storage.local.set({ workspaces: workspaces }, function() {
                    if (workspaces.length === 1) {
                        activateWorkspace(newWorkspace.id);
                    } else {
                        renderWorkspaces();
                    }
                });
            });
        }
    });

    addTabBtn.addEventListener('click', addCurrentTabToActiveWorkspace);

    // Listen for messages from the background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'refresh') {
            renderWorkspaces();
        }
    });

    renderWorkspaces();
});

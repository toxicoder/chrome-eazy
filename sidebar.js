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

    async function renderTabsForActiveWorkspace() {
        const { workspaces = [] } = await chrome.storage.local.get({ workspaces: [] });
        const { [ACTIVE_WORKSPACE_ID_KEY]: activeWorkspaceId } = await chrome.storage.local.get(ACTIVE_WORKSPACE_ID_KEY);

        tabList.innerHTML = '';

        const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);

        if (activeWorkspace && activeWorkspace.tabs.length > 0) {
            const tabsInfo = await chrome.tabs.get(activeWorkspace.tabs.filter(t => typeof t === 'number'));
            tabsInfo.forEach(tab => {
                const tabEl = document.createElement('div');
                tabEl.className = 'tab-item';
                tabEl.textContent = tab.title;
                tabEl.title = tab.title;
                tabEl.dataset.tabId = tab.id;
                tabEl.addEventListener('click', () => {
                    chrome.tabs.update(tab.id, { active: true });
                    chrome.windows.update(tab.windowId, { focused: true });
                });
                tabList.appendChild(tabEl);
            });
        } else {
            tabList.innerHTML = '<div class="tab-item">No tabs in this workspace yet.</div>';
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

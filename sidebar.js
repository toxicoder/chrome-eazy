document.addEventListener('DOMContentLoaded', function() {
    // The main logic for the sidebar.
    function main() {
        const createWorkspaceBtn = document.getElementById('create-workspace-btn');
        const createWorkspaceDialog = document.getElementById('create-workspace-dialog');
        const workspaceNameInput = document.getElementById('workspace-name-input');
        const addTabBtn = document.getElementById('add-tab-btn');
        const workspaceList = document.querySelector('.workspace-list');
        const tabList = document.querySelector('.tab-list');
        const tabs = document.querySelector('md-tabs');

        const ACTIVE_WORKSPACE_ID_KEY = 'activeWorkspaceId';

        async function renderWorkspaces() {
            const { workspaces = [] } = await chrome.storage.local.get({ workspaces: [] });
            const { [ACTIVE_WORKSPACE_ID_KEY]: activeWorkspaceId } = await chrome.storage.local.get(ACTIVE_WORKSPACE_ID_KEY);

            workspaceList.innerHTML = ''; // Clear existing workspaces
            if (workspaces.length === 0) {
                // Handle empty state if necessary, maybe a placeholder in the list
                const placeholder = document.createElement('md-list-item');
                placeholder.headline = "Create a workspace to begin";
                placeholder.disabled = true;
                workspaceList.appendChild(placeholder);
            } else {
                workspaces.forEach(workspace => {
                    const item = document.createElement('md-list-item');
                    item.dataset.workspaceId = workspace.id;
                    item.headline = workspace.name;
                    item.innerHTML = `
                        <md-icon slot="start">space_dashboard</md-icon>
                        ${workspace.name}
                    `;
                    if (workspace.id === activeWorkspaceId) {
                        item.classList.add('active');
                    }
                    workspaceList.appendChild(item);
                });
            }

            renderTabsForActiveWorkspace();
        }

        async function renderTabs(tabIds) {
            tabList.innerHTML = ''; // Clear existing tabs

            if (!tabIds || tabIds.length === 0) {
                const placeholder = document.createElement('md-list-item');
                placeholder.headline = "No tabs in this workspace yet.";
                placeholder.disabled = true;
                tabList.appendChild(placeholder);
                return;
            }

            try {
                const validTabIds = tabIds.filter(id => typeof id === 'number');
                if (validTabIds.length === 0) {
                    return renderTabs([]); // Recurse with empty to show placeholder
                }

                const tabsInfo = await chrome.tabs.get(validTabIds);
                tabsInfo.forEach(tab => {
                    const item = document.createElement('md-list-item');
                    item.headline = tab.title;
                    item.supportingText = new URL(tab.url).hostname;
                    item.dataset.tabId = tab.id;

                    if (tab.favIconUrl) {
                        const favicon = document.createElement('img');
                        favicon.src = tab.favIconUrl;
                        favicon.className = 'favicon';
                        favicon.slot = 'start';
                        item.appendChild(favicon);
                    }

                    const closeButton = document.createElement('md-icon-button');
                    closeButton.slot = 'end';
                    closeButton.innerHTML = '<md-icon>close</md-icon>';
                    closeButton.addEventListener('click', (e) => {
                        e.stopPropagation(); // Prevent the list item's click event
                        removeTabFromWorkspace(tab.id);
                    });
                    item.appendChild(closeButton);

                    item.addEventListener('click', () => {
                        chrome.tabs.update(tab.id, { active: true });
                        chrome.windows.update(tab.windowId, { focused: true });
                    });
                    tabList.appendChild(item);
                });
            } catch (error) {
                console.error("Error rendering tabs:", error);
                const errorItem = document.createElement('md-list-item');
                errorItem.headline = "Could not load tabs.";
                errorItem.supportingText = "They may have been closed.";
                errorItem.disabled = true;
                tabList.appendChild(errorItem);
                // Attempt to clean up stale tabs from storage
                await removeInvalidTabsFromWorkspace();
            }
        }

        async function removeInvalidTabsFromWorkspace() {
            const { workspaces = [] } = await chrome.storage.local.get({ workspaces: [] });
            const { [ACTIVE_WORKSPACE_ID_KEY]: activeWorkspaceId } = await chrome.storage.local.get(ACTIVE_WORKSPACE_ID_KEY);
            const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);

            if (activeWorkspace && activeWorkspace.tabs) {
                const allTabs = await chrome.tabs.query({});
                const allTabIds = new Set(allTabs.map(t => t.id));
                const originalCount = activeWorkspace.tabs.length;
                activeWorkspace.tabs = activeWorkspace.tabs.filter(tabId => allTabIds.has(tabId));

                if (originalCount !== activeWorkspace.tabs.length) {
                    await chrome.storage.local.set({ workspaces });
                }
            }
        }

        async function removeTabFromWorkspace(tabId) {
            const { workspaces = [] } = await chrome.storage.local.get({ workspaces: [] });
            const { [ACTIVE_WORKSPACE_ID_KEY]: activeWorkspaceId } = await chrome.storage.local.get(ACTIVE_WORKSPACE_ID_KEY);
            const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);

            if (activeWorkspace && activeWorkspace.tabs) {
                activeWorkspace.tabs = activeWorkspace.tabs.filter(id => id !== tabId);
                await chrome.storage.local.set({ workspaces });
                await renderTabsForActiveWorkspace(); // Re-render the list
            }
        }

        async function renderTabsForActiveWorkspace() {
            const { workspaces = [] } = await chrome.storage.local.get({ workspaces: [] });
            const { [ACTIVE_WORKSPACE_ID_KEY]: activeWorkspaceId } = await chrome.storage.local.get(ACTIVE_WORKSPACE_ID_KEY);
            const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
            renderTabs(activeWorkspace ? activeWorkspace.tabs : []);
        }

        function handleWorkspaceListClick(event) {
            const listItem = event.target.closest('md-list-item');
            if (listItem && !listItem.disabled) {
                const workspaceId = listItem.dataset.workspaceId;
                if (workspaceId) {
                    activateWorkspace(workspaceId);
                }
            }
        }

        async function activateWorkspace(workspaceId) {
            await chrome.storage.local.set({ [ACTIVE_WORKSPACE_ID_KEY]: workspaceId });
            // The message passing logic to show/hide tabs can be complex and depends
            // on the background script. For now, we'll just re-render the UI.
            // A more robust solution would involve messaging the background script
            // to handle tab visibility based on the active workspace.
            chrome.runtime.sendMessage({ action: 'workspaceActivated', workspaceId });
        }

        async function addCurrentTabToActiveWorkspace() {
            const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const { [ACTIVE_WORKSPACE_ID_KEY]: activeWorkspaceId } = await chrome.storage.local.get(ACTIVE_WORKSPACE_ID_KEY);

            if (!activeWorkspaceId) {
                // TODO: Replace with a snackbar/toast notification
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
                if (!Array.isArray(activeWorkspace.tabs)) activeWorkspace.tabs = [];
                if (!activeWorkspace.tabs.includes(currentTab.id)) {
                    activeWorkspace.tabs.push(currentTab.id);
                    await chrome.storage.local.set({ workspaces });
                    renderTabsForActiveWorkspace();
                } else {
                    alert('This tab is already in the active workspace.');
                }
            }
        }

        async function handleCreateWorkspaceDialogClose(event) {
            if (event.detail.action === 'create') {
                const workspaceName = workspaceNameInput.value.trim();
                if (workspaceName) {
                    const { workspaces = [] } = await chrome.storage.local.get({ workspaces: [] });
                    const newWorkspace = {
                        id: 'workspace-' + Date.now(),
                        name: workspaceName,
                        tabs: []
                    };
                    workspaces.push(newWorkspace);
                    await chrome.storage.local.set({ workspaces });

                    // Activate the new workspace immediately
                    await activateWorkspace(newWorkspace.id);
                }
            }
            // Reset input value
            workspaceNameInput.value = '';
        }

        // --- Event Listeners ---
        createWorkspaceBtn.addEventListener('click', () => createWorkspaceDialog.show());
        createWorkspaceDialog.addEventListener('closed', handleCreateWorkspaceDialogClose);
        addTabBtn.addEventListener('click', addCurrentTabToActiveWorkspace);
        workspaceList.addEventListener('click', handleWorkspaceListClick);
        tabs.addEventListener('change', () => {
            const selectedTab = tabs.selected;
            if (selectedTab === 0) { // Workspaces
                workspaceList.style.display = 'block';
                tabList.style.display = 'none';
            } else { // Tabs
                workspaceList.style.display = 'none';
                tabList.style.display = 'block';
            }
        });

        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'refresh') {
                renderWorkspaces();
            }
        });

        // --- Initial Load ---
        renderWorkspaces();
    }

    // Wait for all Material Web Components to be defined before running the main logic.
    // This prevents race conditions where the script tries to access properties or methods
    // of components that haven't been fully initialized yet.
    Promise.all([
        customElements.whenDefined('md-filled-button'),
        customElements.whenDefined('md-outlined-button'),
        customElements.whenDefined('md-icon-button'),
        customElements.whenDefined('md-fab'),
        customElements.whenDefined('md-list'),
        customElements.whenDefined('md-list-item'),
        customElements.whenDefined('md-dialog'),
        customElements.whenDefined('md-filled-text-field'),
        customElements.whenDefined('md-tabs'),
        customElements.whenDefined('md-primary-tab'),
        customElements.whenDefined('md-icon'),
    ]).then(main).catch(error => {
        console.error('One or more Material Web Components failed to load.', error);
    });
});

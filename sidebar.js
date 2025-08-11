import '@material/web/all.js';
import {
    styles as typescaleStyles
} from '@material/web/typography/md-typescale-styles.js';

document.adoptedStyleSheets.push(typescaleStyles.styleSheet);

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

    function showSnackbar(message) {
        const snackbar = document.getElementById('snackbar-dialog');
        const messageElement = document.getElementById('snackbar-message');
        if (!snackbar || !messageElement) return;

        messageElement.textContent = message;
        snackbar.show();

        // Automatically close after 3 seconds
        setTimeout(() => {
            snackbar.close();
        }, 3000);
    }

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
                    item.type = 'button';
                item.dataset.workspaceId = workspace.id;
                item.headline = workspace.name;

                    const icon = document.createElement('md-icon');
                    icon.slot = 'start';
                    icon.innerHTML = 'space_dashboard';
                    item.appendChild(icon);

                if (workspace.id === activeWorkspaceId) {
                    item.classList.add('active');
                }

                const editButton = document.createElement('md-icon-button');
                editButton.innerHTML = '<md-icon>edit</md-icon>';
                editButton.slot = 'end';
                editButton.dataset.workspaceId = workspace.id;
                editButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    handleEditWorkspace(workspace);
                });

                const deleteButton = document.createElement('md-icon-button');
                deleteButton.innerHTML = '<md-icon>delete</md-icon>';
                deleteButton.slot = 'end';
                deleteButton.dataset.workspaceId = workspace.id;
                deleteButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    handleDeleteWorkspace(workspace);
                });

                item.appendChild(editButton);
                item.appendChild(deleteButton);
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
                    item.type = 'button';
                item.headline = tab.title;
                item.supportingText = new URL(tab.url).hostname;
                item.dataset.tabId = tab.id;

                if (tab.favIconUrl) {
                        const icon = document.createElement('md-icon');
                        icon.slot = 'start';
                    const favicon = document.createElement('img');
                    favicon.src = tab.favIconUrl;
                    favicon.className = 'favicon';
                        icon.appendChild(favicon);
                        item.appendChild(icon);
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
            showSnackbar('Please select or create a workspace first!');
            return;
        }
        if (!currentTab) {
            showSnackbar('No active tab found.');
            return;
        }

        const { workspaces = [] } = await chrome.storage.local.get({ workspaces: [] });
        const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);

        if (activeWorkspace) {
            if (!Array.isArray(activeWorkspace.tabs)) activeWorkspace.tabs = [];
            if (!activeWorkspace.tabs.includes(currentTab.id)) {
                activeWorkspace.tabs.push(currentTab.id);
                await chrome.storage.local.set({ workspaces });
                showSnackbar(`Tab added to "${activeWorkspace.name}".`);
                renderTabsForActiveWorkspace();
            } else {
                showSnackbar('This tab is already in the active workspace.');
            }
        }
    }

    // --- Workspace Management Functions ---

    function handleDeleteWorkspace(workspace) {
        const deleteDialog = document.getElementById('delete-confirm-dialog');
        const confirmBtn = document.getElementById('delete-confirm-btn');
        const cancelBtn = document.getElementById('delete-cancel-btn');

        const confirmHandler = async () => {
            await deleteWorkspace(workspace.id);
            deleteDialog.close();
        };

        const cancelHandler = () => {
            deleteDialog.close();
        };

        // Use { once: true } to auto-cleanup listeners after dialog interaction
        confirmBtn.addEventListener('click', confirmHandler, { once: true });
        cancelBtn.addEventListener('click', cancelHandler, { once: true });
        deleteDialog.addEventListener('closed', () => {
            // Remove listeners if the dialog was closed without a button click (e.g., ESC key)
            confirmBtn.removeEventListener('click', confirmHandler);
            cancelBtn.removeEventListener('click', cancelHandler);
        }, { once: true });


        deleteDialog.show();
    }

    async function deleteWorkspace(workspaceId) {
        let { workspaces = [] } = await chrome.storage.local.get({ workspaces: [] });
        const workspaceToDelete = workspaces.find(w => w.id === workspaceId);

        if (workspaceToDelete && workspaceToDelete.tabs && workspaceToDelete.tabs.length > 0) {
            // Ungroup all tabs in the workspace
            try {
                // Filter for valid tab IDs that still exist
                const allTabs = await chrome.tabs.query({});
                const allTabIds = new Set(allTabs.map(t => t.id));
                const tabsToUngroup = workspaceToDelete.tabs.filter(tabId => allTabIds.has(tabId));

                if (tabsToUngroup.length > 0) {
                    await chrome.tabs.ungroup(tabsToUngroup);
                }
            } catch (error) {
                console.warn("Could not ungroup tabs. They might have been closed or already ungrouped.", error);
            }
        }

        // Remove the workspace from the array
        workspaces = workspaces.filter(w => w.id !== workspaceId);
        await chrome.storage.local.set({ workspaces });

        // If the deleted workspace was the active one, clear the active workspace
        const { [ACTIVE_WORKSPACE_ID_KEY]: activeWorkspaceId } = await chrome.storage.local.get(ACTIVE_WORKSPACE_ID_KEY);
        if (activeWorkspaceId === workspaceId) {
            await chrome.storage.local.remove(ACTIVE_WORKSPACE_ID_KEY);
        }

        showSnackbar(`Workspace "${workspaceToDelete.name}" deleted.`);
        renderWorkspaces(); // Refresh the list
    }

    function handleEditWorkspace(workspace) {
        const editDialog = document.getElementById('edit-workspace-dialog');
        const editForm = document.getElementById('edit-workspace-form');
        const editInput = document.getElementById('edit-workspace-name-input');

        editInput.value = workspace.name;

        editDialog.addEventListener('closed', async (event) => {
            if (event.detail.action === 'save') {
                const newName = editInput.value.trim();
                if (newName && newName !== workspace.name) {
                    await updateWorkspaceName(workspace.id, newName);
                }
            }
            // No need to reset input here, it's reset when the dialog is next opened.
        }, { once: true }); // Use once to avoid multiple listeners

        editDialog.show();
    }

    async function updateWorkspaceName(workspaceId, newName) {
        const { workspaces = [] } = await chrome.storage.local.get({ workspaces: [] });
        const workspaceToUpdate = workspaces.find(w => w.id === workspaceId);
        if (workspaceToUpdate) {
            workspaceToUpdate.name = newName;
            await chrome.storage.local.set({ workspaces });
            showSnackbar(`Workspace renamed to "${newName}".`);
            renderWorkspaces();
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

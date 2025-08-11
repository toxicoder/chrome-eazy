// At the top of your sidebar.js
import 'https://esm.run/@material/web/all.js';
import { styles as typescaleStyles } from 'https://esm.run/@material/web/typography/md-typescale-styles.js';
document.adoptedStyleSheets.push(typescaleStyles.styleSheet);

// --- Inside your main function ---
const workspaceList = document.querySelector('.workspace-list');
const workspaceMenu = document.getElementById('workspace-menu');
const editMenuItem = document.getElementById('edit-workspace-menu-item');
const deleteMenuItem = document.getElementById('delete-workspace-menu-item');
let currentWorkspaceIdForMenu = null;


async function renderWorkspaces() {
    // ... (get workspaces and activeWorkspaceId as before) ...
    const { workspaces = [] } = await chrome.storage.local.get({ workspaces: [] });
    const { activeWorkspaceId } = await chrome.storage.local.get('activeWorkspaceId');

    workspaceList.innerHTML = ''; // Clear list

    workspaces.forEach(workspace => {
        const item = document.createElement('md-list-item');
        item.headline = workspace.name;
        item.supportingText = `${workspace.tabs.length} Tabs`;
        item.dataset.workspaceId = workspace.id;

        // Active state
        if (workspace.id === activeWorkspaceId) {
            item.classList.add('active');
        }

        const startIcon = document.createElement('md-icon');
        startIcon.slot = 'start';
        startIcon.innerHTML = 'space_dashboard';
        item.appendChild(startIcon);

        // 'More options' button
        const menuButton = document.createElement('md-icon-button');
        menuButton.slot = 'end';
        menuButton.innerHTML = '<md-icon>more_vert</md-icon>';
        menuButton.id = `menu-anchor-${workspace.id}`; // Unique ID for anchoring
        menuButton.dataset.workspaceId = workspace.id;
        menuButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent the list item from firing its own click event
            workspaceMenu.anchor = e.currentTarget.id;
            currentWorkspaceIdForMenu = e.currentTarget.dataset.workspaceId;
            workspaceMenu.show();
        });

        item.appendChild(menuButton);
        workspaceList.appendChild(item);
    });

     // Add event listeners for menu items
    editMenuItem.onclick = () => handleEditWorkspace(currentWorkspaceIdForMenu);
    deleteMenuItem.onclick = () => handleDeleteWorkspace(currentWorkspaceIdForMenu);

}

// Add a click handler for the list itself to activate workspaces
workspaceList.addEventListener('click', (event) => {
    const listItem = event.target.closest('md-list-item');
    if (listItem && listItem.dataset.workspaceId) {
        activateWorkspace(listItem.dataset.workspaceId);
    }
});

async function activateWorkspace(workspaceId) {
    const { activeWorkspaceId: currentActiveId } = await chrome.storage.local.get('activeWorkspaceId');

    if (currentActiveId !== workspaceId) {
        await chrome.storage.local.set({ activeWorkspaceId: workspaceId });
        chrome.runtime.sendMessage({ action: 'workspaceActivated', workspaceId });
    }
    await renderWorkspaces();
}

async function handleEditWorkspace(workspaceId) {
    const { workspaces = [] } = await chrome.storage.local.get('workspaces');
    const workspace = workspaces.find(w => w.id === workspaceId);
    if (!workspace) return;

    const editDialog = document.getElementById('edit-workspace-dialog');
    editDialog.innerHTML = `
        <div slot="headline">Edit Workspace</div>
        <form id="edit-workspace-form" slot="content" method="dialog">
            <md-filled-text-field
                label="Workspace name"
                required
                value="${workspace.name}"
                id="edit-workspace-name-input"
            ></md-filled-text-field>
        </form>
        <div slot="actions">
            <md-outlined-button form="edit-workspace-form" value="cancel">Cancel</md-outlined-button>
            <md-filled-button form="edit-workspace-form" value="save" autofocus>Save</md-filled-button>
        </div>
    `;

    editDialog.addEventListener('closed', async (event) => {
        if (event.detail.action === 'save') {
            const newName = editDialog.querySelector('#edit-workspace-name-input').value.trim();
            if (newName && newName !== workspace.name) {
                workspace.name = newName;
                await chrome.storage.local.set({ workspaces });
                await renderWorkspaces();
            }
        }
    }, { once: true });

    editDialog.show();
}

async function handleDeleteWorkspace(workspaceId) {
    const deleteDialog = document.getElementById('delete-confirm-dialog');
    deleteDialog.innerHTML = `
        <div slot="headline">Confirm Deletion</div>
        <div slot="content">
            Are you sure you want to delete this workspace? Its tabs will be ungrouped.
        </div>
        <div slot="actions">
            <md-outlined-button value="cancel">Cancel</md-outlined-button>
            <md-filled-button value="delete" autofocus>Delete</md-filled-button>
        </div>
    `;

    deleteDialog.addEventListener('closed', async (event) => {
        if (event.detail.action === 'delete') {
            let { workspaces = [] } = await chrome.storage.local.get({ workspaces: [] });
            const workspaceToDelete = workspaces.find(w => w.id === workspaceId);

            if (workspaceToDelete && workspaceToDelete.tabs && workspaceToDelete.tabs.length > 0) {
                try {
                    const allTabs = await chrome.tabs.query({});
                    const allTabIds = new Set(allTabs.map(t => t.id));
                    const tabsToUngroup = workspaceToDelete.tabs.filter(tabId => allTabIds.has(tabId));
                    if (tabsToUngroup.length > 0) {
                        await chrome.tabs.ungroup(tabsToUngroup);
                    }
                } catch (error) {
                    console.warn("Could not ungroup tabs.", error);
                }
            }

            workspaces = workspaces.filter(w => w.id !== workspaceId);
            await chrome.storage.local.set({ workspaces });

            const { activeWorkspaceId } = await chrome.storage.local.get('activeWorkspaceId');
            if (activeWorkspaceId === workspaceId) {
                await chrome.storage.local.remove('activeWorkspaceId');
            }
            await renderWorkspaces();
        }
    }, { once: true });

    deleteDialog.show();
}


const createWorkspaceBtn = document.getElementById('create-workspace-btn');
const createWorkspaceDialog = document.getElementById('create-workspace-dialog');

createWorkspaceBtn.addEventListener('click', () => {
    createWorkspaceDialog.innerHTML = `
        <div slot="headline">Create New Workspace</div>
        <form id="create-workspace-form" slot="content" method="dialog">
            <md-filled-text-field
                label="Workspace name"
                required
                autofocus
                id="workspace-name-input"
            ></md-filled-text-field>
        </form>
        <div slot="actions">
            <md-outlined-button form="create-workspace-form" value="cancel">Cancel</md-outlined-button>
            <md-filled-button form="create-workspace-form" value="create">Create</md-filled-button>
        </div>
    `;
    createWorkspaceDialog.show();
});

createWorkspaceDialog.addEventListener('closed', async (event) => {
    if (event.detail.action === 'create') {
        const input = createWorkspaceDialog.querySelector('#workspace-name-input');
        const workspaceName = input.value.trim();
        if (workspaceName) {
            const { workspaces = [] } = await chrome.storage.local.get({ workspaces: [] });
            const newWorkspace = {
                id: 'workspace-' + Date.now(),
                name: workspaceName,
                tabs: []
            };
            workspaces.push(newWorkspace);
            await chrome.storage.local.set({ workspaces });
            await activateWorkspace(newWorkspace.id);
        }
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'refresh') {
        renderWorkspaces();
    }
});

// Initial render
renderWorkspaces();

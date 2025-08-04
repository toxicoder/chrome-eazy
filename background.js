chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));
});

const HIDDEN_GROUP_TITLE = "Inactive Workspaces";

const HIDDEN_GROUP_ID_KEY = "hiddenGroupId";

async function hideTabs(tabIds) {
  if (!tabIds || tabIds.length === 0) return;

  try {
    const data = await chrome.storage.local.get(HIDDEN_GROUP_ID_KEY);
    let groupId = data[HIDDEN_GROUP_ID_KEY];

    // If a group ID exists, check if the group is still valid
    if (groupId) {
      try {
        await chrome.tabGroups.get(groupId);
      } catch (error) {
        // The group doesn't exist anymore, so we'll create a new one.
        groupId = null;
        await chrome.storage.local.remove(HIDDEN_GROUP_ID_KEY);
      }
    }

    // If no valid group ID, create a new group
    if (!groupId) {
      const newGroupId = await chrome.tabs.group({ tabIds });
      await chrome.tabGroups.update(newGroupId, {
        title: HIDDEN_GROUP_TITLE,
        collapsed: true,
      });
      await chrome.storage.local.set({ [HIDDEN_GROUP_ID_KEY]: newGroupId });
    } else {
      await chrome.tabs.group({ tabIds, groupId });
    }
  } catch (error) {
    // A common error is trying to group a tab that is already in a group.
    // We can ungroup them first and then regroup them.
    if (error.message.includes("Tabs cannot be in the same group more than once")) {
        console.warn("Some tabs were already in the hidden group. This is expected.");
    } else if (error.message.includes("No current window")) {
        console.warn("Cannot hide tabs without a window focus.");
    }
    else {
      console.error("Error hiding tabs:", error);
    }
  }
}

async function showTabs(tabIds) {
  if (!tabIds || tabIds.length === 0) return;
  try {
    await chrome.tabs.ungroup(tabIds);
  } catch (error) {
    // This can happen if the tabs are not in any group, which is fine.
    if (error.message.includes("No tab group with id")) {
        console.warn("Tried to ungroup tabs that were not in a group.");
    } else {
        console.error("Error showing tabs:", error);
    }
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'workspaceActivated') {
    handleWorkspaceActivation(request.workspaceId);
  }
  // To indicate that we will respond asynchronously.
  return true;
});

async function handleWorkspaceActivation(activeWorkspaceId) {
    const { workspaces = [] } = await chrome.storage.local.get({ workspaces: [] });
    const allTabs = await chrome.tabs.query({});
    const allTabIds = new Set(allTabs.map(t => t.id));

    let workspacesNeedUpdate = false;
    const tabsToShow = [];
    const tabsToHide = [];

    for (const workspace of workspaces) {
        // Clean up tabs that no longer exist
        const originalTabCount = workspace.tabs.length;
        workspace.tabs = workspace.tabs.filter(tabId => allTabIds.has(tabId));
        if (workspace.tabs.length !== originalTabCount) {
            workspacesNeedUpdate = true;
        }

        const workspaceTabs = Array.isArray(workspace.tabs) ? workspace.tabs : [];
        if (workspace.id === activeWorkspaceId) {
            tabsToShow.push(...workspaceTabs);
        } else {
            tabsToHide.push(...workspaceTabs);
        }
    }

    if (workspacesNeedUpdate) {
        await chrome.storage.local.set({ workspaces });
    }

    // Hide inactive tabs first to avoid visual flickering
    await hideTabs(tabsToHide);
    await showTabs(tabsToShow);

    // Refresh the sidebar to show the correct state
    chrome.runtime.sendMessage({ action: "refresh" });
}

const ACTIVE_WORKSPACE_ID_KEY = 'activeWorkspaceId';

// Listener for when a new tab is created
chrome.tabs.onCreated.addListener(async (tab) => {
    const { [ACTIVE_WORKSPACE_ID_KEY]: activeWorkspaceId } = await chrome.storage.local.get(ACTIVE_WORKSPACE_ID_KEY);
    if (!activeWorkspaceId) {
        return; // Do nothing if no workspace is active
    }

    let { workspaces = [] } = await chrome.storage.local.get({ workspaces: [] });
    const workspaceIndex = workspaces.findIndex(w => w.id === activeWorkspaceId);

    if (workspaceIndex !== -1) {
        // Add the new tab to the active workspace
        workspaces[workspaceIndex].tabs.push(tab.id);
        await chrome.storage.local.set({ workspaces });
        // Notify sidebar to refresh
        chrome.runtime.sendMessage({ action: "refresh" });
    }
});

// Listener for when a tab is closed
chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
    let { workspaces = [] } = await chrome.storage.local.get({ workspaces: [] });
    let changed = false;

    // Find the tab in any workspace and remove it
    workspaces.forEach(workspace => {
        const tabIndex = workspace.tabs.indexOf(tabId);
        if (tabIndex > -1) {
            workspace.tabs.splice(tabIndex, 1);
            changed = true;
        }
    });

    if (changed) {
        await chrome.storage.local.set({ workspaces });
        // Notify sidebar to refresh
        chrome.runtime.sendMessage({ action: "refresh" });
    }
});

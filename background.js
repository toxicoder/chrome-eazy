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
  if (request.action === 'hideTabs') {
    hideTabs(request.tabIds);
  } else if (request.action === 'showTabs') {
    showTabs(request.tabIds);
  }
  // To indicate that we will respond asynchronously.
  return true;
});

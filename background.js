chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));
});

const HIDDEN_GROUP_TITLE = "Inactive Workspaces";

async function hideTabs(tabIds) {
  try {
    const [hiddenGroup] = await chrome.tabGroups.query({ title: HIDDEN_GROUP_TITLE });

    if (hiddenGroup) {
      await chrome.tabs.group({ tabIds, groupId: hiddenGroup.id });
    } else {
      const newGroupId = await chrome.tabs.group({ tabIds });
      await chrome.tabGroups.update(newGroupId, { title: HIDDEN_GROUP_TITLE, collapsed: true });
    }
  } catch (error) {
    console.error("Error hiding tabs:", error);
  }
}

async function showTabs(tabIds) {
  try {
    await chrome.tabs.ungroup(tabIds);
  } catch (error) {
    console.error("Error showing tabs:", error);
  }
}

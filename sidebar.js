document.addEventListener('DOMContentLoaded', function() {
    const createWorkspaceBtn = document.querySelector('.create-workspace-btn');
    const workspaceList = document.querySelector('.workspace-list');

    function renderWorkspaces() {
        chrome.storage.local.get({workspaces: []}, function(data) {
            const workspaces = data.workspaces;
            workspaceList.innerHTML = ''; // Clear existing workspaces
            workspaces.forEach(workspace => {
                const workspaceEl = document.createElement('div');
                workspaceEl.className = 'workspace-icon';
                workspaceEl.textContent = workspace.name.charAt(0).toUpperCase();
                workspaceEl.title = workspace.name;
                workspaceList.appendChild(workspaceEl);
            });
        });
    }

    renderWorkspaces();

    createWorkspaceBtn.addEventListener('click', function() {
        const workspaceName = prompt('Enter a name for the new workspace:');
        if (workspaceName) {
            chrome.storage.local.get({workspaces: []}, function(data) {
                const workspaces = data.workspaces;
                const newWorkspace = {
                    id: 'workspace-' + Date.now(),
                    name: workspaceName,
                    tabs: []
                };
                workspaces.push(newWorkspace);
                chrome.storage.local.set({workspaces: workspaces}, function() {
                    renderWorkspaces();
                });
            });
        }
    });
});

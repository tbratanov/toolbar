import { gssPromise, getCurrentEntityTypes } from './gss.js';
import { allApplicationsObs } from './applications.js';
import { startApp, allWorkspacesObs, openWorkspace } from './glue-related.js';
import { clearSearch, getAppIcon } from './utils.js';

let gss;
let clientAppsObs = new rxjs.BehaviorSubject([]);
let instrumentAppsObs = new rxjs.BehaviorSubject([]);
let clientWorkspacesObs = new rxjs.BehaviorSubject([]);
let instrumentWorkspacesObs = new rxjs.BehaviorSubject([]);

init();
async function init() {
  gss = await gssPromise;
  console.log('gss ready');
  allApplicationsObs
    .subscribe(apps => {
      let clientApps = [];
      let instrumentApps = [];
      apps.forEach(app => {
        let consumes = app.userProperties && app.userProperties.consumes;
        if (consumes) {
          let appDescription = {name: app.name, displayName: app.title, icon: getAppIcon(app)};

          if (consumes.includes('Client')) {
            clientApps.push(appDescription);
          } else if (consumes.includes('Instrument')) {
            instrumentApps.push(appDescription);
          }
        }
      });

      clientAppsObs.next(clientApps);
      instrumentAppsObs.next(instrumentApps);
    });

  allWorkspacesObs
    .subscribe(workspaces => {
      let clientWorkspaces = [];
      let instrumentWorkspaces = [];

      workspaces.forEach(workspace => {
        let workspaceApps = [];
        workspace.canvas.lanes.forEach(lane => {
          lane.items.forEach(tabGroup => {
            workspaceApps = workspaceApps.concat(tabGroup.items.map(item => item.name));
          });
        });

        if (clientAppsObs.value.find(app => workspaceApps.includes(app.name))) {
          clientWorkspaces.push(workspace.name);
        }

        if (instrumentAppsObs.value.find(app => workspaceApps.includes(app.name))) {
          instrumentWorkspaces.push(workspace.name);
        }
      });

      clientWorkspacesObs.next(clientWorkspaces);
      instrumentWorkspacesObs.next(instrumentWorkspaces);
    });
}

function handleClientAndInstrumentClicks() {
  document.addEventListener('click', (e) => {
    if (e.target.matches('[client-app-id], [client-app-id] *')) {
      let appId = e.path.find(e => e && e.getAttribute('client-app-id')).getAttribute('client-app-id');
      let clientId = e.path.find(e => e && e.getAttribute('client-id')).getAttribute('client-id');
      startApp(appId, { contact: { ids: [{ systemName: 'rest.id', nativeId: clientId }] }, clientId });
      if (!e.ctrlKey) {
        clearSearch();
      }
    }

    if (e.target.matches('[instrument-app-id], [instrument-app-id] *')) {
      let appId = e.path.find(e => e && e.getAttribute('instrument-app-id')).getAttribute('instrument-app-id');
      let insturmentId = e.path.find(e => e && e.getAttribute('instrument-id')).getAttribute('instrument-id');
      startApp(appId, {ric: insturmentId});
      if (!e.ctrlKey) {
        clearSearch();
      }
    }

    if (e.target.matches('[workspace-id], [workspace-id] *')) {
      let workspaceId = e.path.find(e => e.getAttribute && e.getAttribute('workspace-id')).getAttribute('workspace-id');
      let clientIdElement = e.path.find(e => e.getAttribute && e.getAttribute('client-id'));
      let instrumentIdElement = e.path.find(e => e.getAttribute && e.getAttribute('instrument-id'));
      if (clientIdElement) {
        let clientId = clientIdElement.getAttribute('client-id');
        openWorkspace(workspaceId, {clientId});
      } else if (instrumentIdElement) {
        let instrumentId = instrumentIdElement.getAttribute('instrument-id');
        openWorkspace(workspaceId, {ric: instrumentId});
      }

      if (!e.ctrlKey) {
        clearSearch();
      }
    }
  });
}

async function searchClients(search) {
  return new Promise(async (res, rej) => {
    await gssPromise;
    if (getCurrentEntityTypes().includes('Client')) {
      let searchQuery =  gss.createQuery('Client');
      searchQuery.onData(res);
      searchQuery.search(
        {name: 'name.value', value: search.trim().toLowerCase()},
        {name: 'email.value', value: search.trim().toLowerCase()},
        {name: 'id.value', value: search.trim().toLowerCase()},
      );

      setTimeout(() => {
        rej(new Error('Timeout'));
      }, 1500);
    } else {
      res({entities: []});
    }
  });
}

async function searchInstruments(search) {
  return new Promise(async (res, rej) => {
    if (getCurrentEntityTypes().includes('Instrument')) {
      await gssPromise;
      let searchQuery =  gss.createQuery('Instrument');
      searchQuery.onData(res);
      searchQuery.search(
        {name: 'ric', value: search.trim().toLowerCase()},
      );

      setTimeout(() => {
        rej(new Error('Timeout'));
      }, 1500);
    } else {
      res({entities: []});
    }
  });
}


function clientHTMLTemplate(client, options = {}) {
  let keysPriority = ['name', 'email', 'id'];
  let matchedKey = keysPriority.find(key => client[key].isMatch);
  let apps = getClientApps();
  let workspaces = getWorkspaces('Client');

  if (!apps && !workspaces) {
    return '';
  }

  return `<li class="nav-item" client-id="${client.id.value}">
    <div class="nav-link action-menu">
      <span class="icon-size-16">
        <i class="icon-user-o" draggable="false"></i>
      </span>
      <span class="title-client">${client[matchedKey].value}</span>
    </div>
    ${apps}
    ${workspaces}
  </li>`;
}

function instrumentHTMLTemplate(instrument, options = {}) {
  let apps = getInstrumentApps();
  let workspaces = getWorkspaces('Instrument');

  if (!apps && !workspaces) {
    return '';
  }

  return `<li class="nav-item" instrument-id="${instrument.ric}">
    <div class="nav-link action-menu">
      <span class="icon-size-16">
        <i class="icon-chart-line" draggable="false"></i>
      </span>
      <span class="title-instrument">${instrument.ric}</span>
    </div>
    ${apps}
    ${workspaces}
  </li>`;
}

function getClientApps() {
  if (!clientAppsObs.value.length) {
    return '';
  } else {
    let clientAppsHTML = '';
    clientAppsObs.value.forEach(clientApp => {
      clientAppsHTML += `<li class="nav-link" client-app-id="${clientApp.name}">
        ${clientApp.icon}
        ${clientApp.displayName}
      </li>`;
    });

    return `<ul class="second-level client-apps">${clientAppsHTML}</ul>`;
  }
}

function getInstrumentApps() {
  if (!instrumentAppsObs.value.length) {
    return '';
  } else {
    let instrumentAppsHTML = '';
    instrumentAppsObs.value.forEach(instrumentApp => {
      instrumentAppsHTML += `<li class="nav-link" instrument-app-id="${instrumentApp.name}">
        ${instrumentApp.icon}
        ${instrumentApp.displayName}
      </li>`;
    });

    return `<ul class="second-level instrument-apps">${instrumentAppsHTML}</ul>`;
  }
}

function getWorkspaces(workspaceType) {
  let workspacesHTML = '';
  if (workspaceType === 'Client') {
    workspacesHTML += workspaceHTMLTemplate(clientWorkspacesObs.value);
  } else if (workspaceType === 'Instrument') {
    workspacesHTML += workspaceHTMLTemplate(instrumentWorkspacesObs.value);
  }

  return workspacesHTML ? `<ul>${workspacesHTML}</ul>` : '';
}

function workspaceHTMLTemplate(workspaces) {
  return workspaces.map(workspace => `<li class="nav-link" workspace-id="${workspace}">
    <span class="icon-size-16">
      <i class="icon-app" draggable="false"></i>
    </span>
    ${workspace} (Workspace)
  </li>`).join('');
}

export {
  searchClients,
  searchInstruments,
  clientHTMLTemplate,
  instrumentHTMLTemplate,
  handleClientAndInstrumentClicks
};

import {shutdown, gluePromise, startApp, focusApp, themeObs, changeTheme, refreshApps, glueInfo, openWindow, openNotificationPanel} from './glue-related.js';
import { setSetting, getSetting } from './settings.js';

const windowMargin = 50;
let isVertical;

function handleThemeChange() {
  // q('#change-theme').addEventListener('click', () => {
  //   let currentTheme = Array.prototype.slice.apply(q('html').classList)
  //     .find(className =>  ['dark', 'light'].indexOf(className) >= 0);
  //   let allThemes = themeObs.value.all.map(t => t.name);
  //   let currentThemeIndex = allThemes.indexOf(currentTheme);
  //   let newThemeIndex = currentThemeIndex >= allThemes.length - 1 ? 0 : currentThemeIndex + 1;
  // })
  q('.theme-select').addEventListener('click', (e) => {
    if (e.target.matches('input.select_input[type="radio"]')) {
      let themeToSelect = e.target.getAttribute('theme-name');
      changeTheme(themeToSelect);
    }
  });

  // themeObs.subscribe(themeObj => {
  //   if (themeObj) {

  //   }
  // })

  themeObs.subscribe(themeObj => {
    if (themeObj) {
      themeObj.all.forEach(theme => {
        q('html').classList.remove(theme.name);
      });

      q('html').classList.add(themeObj.selected);

      let allThemesHtml = ``;
      themeObj.all.forEach(theme => {
        allThemesHtml += `<li class="select_option">
          <input class="select_input" type="radio" name="theme" id="theme-${theme.name}" theme-name="${theme.name}" ${theme.name === themeObj.selected ? 'checked' : ''}/>
          <label class="select_label" for="theme-${theme.name}">${theme.displayName}</label></li>`;
      });

      q('.theme-select .select_options').innerHTML = allThemesHtml;
    }
  });
}

function handleOrientationChange() {
  isVertical = !!q('.view-port.vertical');
  q('#toggle .mode').innerHTML = isVertical ? 'horizontal' : 'vertical';

  q('#toggle').addEventListener('click', () => {
    q('.app').classList.add('switching-orientation');
    isVertical = !isVertical;
    q('#toggle .mode').innerHTML = isVertical ? 'horizontal' : 'vertical';

    q('.view-port').classList.add(isVertical ? 'vertical' : 'horizontal');
    q('.view-port').classList.remove(isVertical ? 'horizontal' : 'vertical');
    q('.app').classList.add(isVertical ? 'd-inline-flex' : 'h');
    q('.app').classList.remove(isVertical ? 'h' : 'd-inline-flex');
    qa('[column]').forEach(col => {
      if (isVertical) {
        col.classList.add('flex-column');
      } else {
        console.log('removing flex-column', col);
        col.classList.remove('flex-column');
      }
    });

    setTimeout(() => {
      q('.app').classList.remove('switching-orientation');
    });
  });
}

function handleAboutClick() {
  q('#open-about').addEventListener('click', () => {
    openWindow('Glue42 About', location.origin + '/about.html', {
      isSticky: false,
      mode: 'html',
      allowCollapse: false,
      allowMaximize: false,
      allowMinimize: false,
      allowClose: false,
      width: 300,
      height: 300
    });
  //   q('.modal.about').classList.add('show')
  });
}

function handleShutdownClick() {
  q('#shutdown').addEventListener('click', () => {
    shutdown();
  });
}

function handleTopMenuClicks() {
  document.addEventListener('click', (e) => {

    if (e.target.matches('[menu-button-id="apps"], [menu-button-id="apps"] *') && e.altKey) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      setSetting('showHiddenApps', !getSetting('showHiddenApps'));
      refreshApps();
      return;
    }

    if (e.target.matches('[menu-button-id], [menu-button-id] *')) {
      //open selected drawer (apps, layouts)
      let topElement = e.path.find(e => e.getAttribute('menu-button-id'));
      let menuId = topElement.getAttribute('menu-button-id');
      qa(`[menu-id]:not([menu-id="${menuId}"])`).forEach(menu => {
        menu.classList.add('hide');
      });
      qa(`[menu-id]:not([menu-button-id="${menuId}"]) .chavron`).forEach(menuBtnChavron => {
        menuBtnChavron.classList.remove('chavron-rotate');
      });


      let menuToToggle = q(`[menu-id="${menuId}"]`);
      menuToToggle.addEventListener('transitionend', focusMenuInputAfterTransition);
      menuToToggle.classList.toggle('hide');

      toggleTopButtonState(menuId);

      let hasVisibleDrawers = q('.toggle-content:not(.hide)');
      if (hasVisibleDrawers) {
        q('.app').classList.add('has-drawer');
      } else {
        q('.app').classList.remove('has-drawer');
      }

    } else if (e.target.matches('#fav-apps .nav-item, #fav-apps .nav-item *')) {
      //start or focus an app from the favorites list
      let topElement = e.path.find(e => e.classList && e.classList.contains('nav-item'));
      let appName = topElement.getAttribute('app-name');
      let isActive =  topElement.classList.contains('app-active');

      if (isActive) {
        focusApp(appName);
      } else {
        startApp(appName);
      }
    }
  });
}

function handleCloseDrawerClicks() {
  document.addEventListener('click', (e) => {
    if (e.target.matches('.close-drawer, .close-drawer *')) {
      let menu = e.path.find(e => e && e.getAttribute('menu-id'));
      let menuId = menu && menu.getAttribute('menu-id');
      if (menuId) {
        q(`[menu-button-id="${menuId}"]`).click();
        // q('.expand').classList.remove('expand');
      }
    }
  });
}

function toggleTopButtonState(id) {
  qa(`[menu-button-id="${id}"] .chavron`).forEach(chavron => chavron.classList.toggle('chavron-rotate'));
  qa(`[menu-button-id="${id}"] > a`).forEach(chavron => chavron.classList.toggle('active'));

  qa(`[menu-button-id]:not([menu-button-id="${id}"]) .chavron`).forEach(chavron => chavron.classList.remove('chavron-rotate'));
  qa(`[menu-button-id]:not([menu-button-id="${id}"]) > a`).forEach(chavron => chavron.classList.remove('active'));

}

function focusMenuInputAfterTransition(e) {
  if (!e.propertyName || e.propertyName !=='width') {
    return;
  }

  let menu = e.srcElement;
  menu.removeEventListener('transitionend', focusMenuInputAfterTransition);
  if (!menu.classList.contains('hide')) {
    let autofocusInput = menu.querySelector('input[autofocus]');
    if (autofocusInput) {
      autofocusInput.focus();
    }
  }
}

function handleModalClose() {
  document.addEventListener('click', (e) => {
    if (e.target.matches('.modal [data-dismiss="modal"], .modal [data-dismiss="modal"] *')) {
      let modal = e.path.find(el => el.classList.contains('modal'));
      modal.classList.remove('show');
    }
  });
}

async function handleMouseHover() {
  q('#toggle').click();
  q('#fav-apps').addEventListener('mousewheel', (e) => {
    // console.log(e.deltaY);
    // q('#fav-apps').scrollLeft += e.deltaY;
    e.preventDefault();
    q('#fav-apps').scrollBy({left:e.deltaY, behavior: 'smooth'});
  });

  let closeTimeout;

  q('.app').addEventListener('mouseenter', (e) => {
    q('.view-port').classList.add('expand');
    q('.app').classList.add('expand-wrapper');
    if (closeTimeout) {
      clearTimeout(closeTimeout);
    }
  });

  q('.app').addEventListener('mouseleave', (e) => {
    let {offsetWidth: viewPortWidth, offsetHeight: viewPortHeight} = q('.view-port');
    let margin = windowMargin;

    if (e.x < (viewPortWidth + margin) && e.x > margin && e.y < (viewPortHeight + margin -6) && e.y > margin) {
      console.log('fake leave');
      // return;
    }

    if (qa('.toggle-content:not(.hide)').length > 0 || qa('.dropdown-menu.show').length > 0) {
      return;
    }

    closeTimeout = setTimeout(() => {
      q('.view-port').classList.remove('expand');
      q('.app').classList.remove('expand-wrapper');
      qa('.toggle-content').forEach(e => e.classList.add('hide'));
      // qa('[dropdown-id].show').forEach(e => e.classList.remove('show'));
    }, 500);
  });
}

function handleNotificationClick() {
  q('#notification-panel').addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    openNotificationPanel();
  });
}

function populateAbouPage() {


  if (getSetting('showTutorial')) {
    q('#settings-content .show-tutorial').setAttribute('checked', true);
  } else {
    q('#settings-content .show-tutorial').removeAttribute('checked');
  }

  q('#settings-content .show-tutorial').addEventListener('change', (e) => setSetting('showTutorial', e.srcElement.checked));

}

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


export {
  handleOrientationChange,
  handleThemeChange,
  handleAboutClick,
  handleShutdownClick,
  handleTopMenuClicks,
  handleCloseDrawerClicks,
  handleNotificationClick,
  handleModalClose,
  handleMouseHover,
  populateAbouPage,
  windowMargin,
  escapeHtml
};
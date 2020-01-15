import * as glueModule from './glue-related.js';

let topMenuVisibleObs = new rxjs.BehaviorSubject(false);
let layoutDropDownVisibleObs = new rxjs.BehaviorSubject(false);

function handleDropDownClicks() {
  document.addEventListener('click', (e) => {
    if (e.target.matches('[dropdown-button-id], [dropdown-button-id] *')) {
      //dropdown button click  - toggle dropdown
      let btnElement = e.path.find(e => e.getAttribute('dropdown-button-id'));
      let menuId = btnElement.getAttribute('dropdown-button-id');
      let menu = q(`[dropdown-id="${menuId}"]`);
      menu.classList.toggle('show');
      topMenuVisibleObs.next(menu.classList.contains('show'));
    } else {
      //click is not on dropdown button - close opened dropdowns
      qa(`[dropdown-id].show`).forEach(e => e.classList.remove('show'));
      topMenuVisibleObs.next(false);
    }
  });
}



let layoutOpenedTimeout;

q('.layouts-nav').addEventListener('mouseenter', (e) => {
  if (e.target.matches && e.target.matches('.horizontal .layouts-nav, .horizontal .layouts-nav *')) {
    console.log('layout ', true);
    layoutOpenedTimeout = setTimeout(() => {
      layoutDropDownVisibleObs.next(true);
    }, 300);
  }
});

q('.layouts-nav').addEventListener('mouseleave', (e) => {
  if (e.target.matches && e.target.matches('.horizontal .layouts-nav, .horizontal .layouts-nav *')) {
    layoutDropDownVisibleObs.next(false);
    if (layoutOpenedTimeout) {
      clearInterval(layoutOpenedTimeout);
    }
  }
});

let appBoundsObs = new rxjs.BehaviorSubject({
  width: Math.round(q('.app').offsetWidth),
  height: Math.round(q('.app').offsetHeight),
  left: 200,
  top: 50
});
window.appBoundsObs = appBoundsObs;

glueModule.boundsObs
  .subscribe(bounds => {
    q('.view-port').classList.add('expand');
    q('.app').classList.add('expand-wrapper');
  });

glueModule.boundsObs
.pipe(rxjs.operators.filter(bounds => bounds))
.pipe(rxjs.operators.combineLatest(appBoundsObs))
.subscribe(([windowBounds, appBounds]) => {
  const monitors = glueModule.getMonitorInfo();
  let visibleAreaStart = windowBounds.left + 350;
  let toolbarCenterLeft = windowBounds.left + 350;
  let toolbarBottom = windowBounds.top + 350;

  // let currentMonitor = monitors.find(monitor => {
  //   let {workingAreaLeft, workingAreaWidth, workingAreaTop, workingAreaHeight} = monitor;
  //   // console.log(workingAreaTop, workingAreaHeight);
  //   return workingAreaLeft <= toolbarCenterLeft
  //     && ((workingAreaLeft + workingAreaWidth) >= toolbarCenterLeft)
  //     && workingAreaTop <= toolbarBottom
  //     && ((workingAreaTop + workingAreaHeight) >= toolbarBottom);
  // });
  let currentMonitor = glue.windows.my().screen;
  if (!currentMonitor) {
    return;
  }

  if(q('.app').classList.contains('has-drawer')) {
    return;
  }

  if(!q('.view-port').classList.contains('horizontal')) {
    let hasOpenLeft = document.body.classList.contains('open-left');
    let shouldOpenLeft = (windowBounds.left + windowBounds.width) > (currentMonitor.workingAreaLeft + currentMonitor.workingAreaWidth);
    if (shouldOpenLeft){
      document.body.classList.add('open-left');
    } else {
      document.body.classList.remove('open-left');
    }

    if (hasOpenLeft !== shouldOpenLeft) {
      appBoundsObs.next(true);
    }
  } else {
    let hasOpenTop = document.body.classList.contains('open-top');
    let shouldOpenTop = (windowBounds.top + windowBounds.height) > (currentMonitor.workingAreaTop + currentMonitor.workingAreaHeight);

    if (shouldOpenTop) {
      document.body.classList.add('open-top');
    } else {
      document.body.classList.remove('open-top');
    }

    if (hasOpenTop !== shouldOpenTop) {
      appBoundsObs.next(true);
    }
  }
});


function handleWidthChange() {
  const appBoundsObserver = new ResizeObserver((elements) => {
    appBoundsObs.next(true);
  });

  appBoundsObserver.observe(q('.app'));
}

appBoundsObs
.pipe(rxjs.operators.combineLatest(topMenuVisibleObs, layoutDropDownVisibleObs))
// .pipe(rxjs.operators.combineLatest())
.subscribe(([appBounds, topMenuVisible, layoutDropDownVisible]) => {
  // console.log(appBounds, topMenuVisible, layoutDropDownVisible);
  resizeVisibleArea(appBounds, topMenuVisible, layoutDropDownVisible);
});

function resizeVisibleArea(appBounds, topMenuVisible, layoutDropDownVisible) {
  let visibleAreas = [];
  appBounds = q('.app').getBoundingClientRect();
  visibleAreas.push({
    top: Math.round(appBounds.top),
    left: Math.round(appBounds.left),
    width: Math.round(appBounds.width),
    height: Math.round(appBounds.height)
  });

  if (q('.view-port.horizontal') && topMenuVisible) {
    let {top, left, width, height} = q('#menu-top').getBoundingClientRect();
    // TODO
    top = Math.round(top);
    left = Math.round(left);
    width = Math.round(width);
    height = Math.round(height);
    visibleAreas.push({top, left, width, height});
  }

  if (layoutDropDownVisible) {
    let {top, left, width, height} = q('.layout-menu-tool').getBoundingClientRect();
    // TODO
    top = Math.round(top);
    left = Math.round(left);
    width = Math.round(width);
    height = Math.round(height);
    // TODO
    visibleAreas.push({top, left, width, height});
  }

  glueModule.resizeWindowVisibleArea(visibleAreas);
}


export {
  handleWidthChange,
  handleDropDownClicks
}
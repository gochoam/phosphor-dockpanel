/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2015, PhosphorJS Contributors
|
| Distributed under the terms of the BSD 3-Clause License.
|
| The full license is in the file LICENSE, distributed with this software.
|----------------------------------------------------------------------------*/
'use strict';

import {
  DockSplitPanel
} from './docksplitpanel';

import {
  DockTabPanel
} from './docktabpanel';


/**
 *
 */
var BORDER_SIZE = 30;



/**
 *
 */
export
const enum DropZone {
  /**
   *
   */
  BorderTop,

  /**
   *
   */
  BorderLeft,

  /**
   *
   */
  BorderRight,

  /**
   *
   */
  BorderBottom,

  /**
   *
   */
  PanelTop,

  /**
   *
   */
  PanelLeft,

  /**
   *
   */
  PanelRight,

  /**
   *
   */
  PanelBottom,

  /**
   *
   */
  PanelCenter,

  /**
   *
   */
  Invalid,
}


/**
 *
 */
export
interface IDropData {
  /**
   *
   */
  zone: DropZone;

  /**
   *
   */
  panel: DockTabPanel;
}


/**
 *
 */
export
function findDropTarget(root: DockSplitPanel, clientX: number, clientY: number): IDropData {
  var rect = root.node.getBoundingClientRect();
  if (!hitTestRect(rect, clientX, clientY)) {
    return { zone: DropZone.Invalid, panel: null };
  }
  var zone = getBorderZone(rect, clientX, clientY);
  if (zone !== DropZone.Invalid) {
    return { zone, panel: null };
  }
  return findTargetRecursive(root, clientX, clientY);
}


/**
 * Recursive find the best drop target for the panel hierarchy.
 */
function findTargetRecursive(panel: DockSplitPanel, x: number, y: number): IDropData {
  // TODO test for handle zones first
  for (var i = 0, n = panel.childCount; i < n; ++i) {
    var child = panel.childAt(i);
    var rect = child.node.getBoundingClientRect();
    if (!hitTestRect(rect, x, y)) {
      continue;
    }
    if (child instanceof DockSplitPanel) {
      return findTargetRecursive(child, x, y);
    }
    if (child instanceof DockTabPanel) {
      return { zone: getPanelZone(rect, x, y), panel: child };
    }
  }
  return { zone: DropZone.Invalid, panel: null };
}


/**
 * Test whether a client rect contains the given client position.
 */
function hitTestRect(r: ClientRect, x: number, y: number): boolean {
  return x >= r.left && y >= r.top && x < r.right && y < r.bottom;
}


/**
 * Get the panel zone for the given client rect and position.
 *
 * This assumes the position lies within the client rect.
 *
 * Returns the `Invalid` zone if the position is not within the border.
 */
function getBorderZone(r: ClientRect, x: number, y: number): DropZone {
  var zone: DropZone;
  if (x < r.left + BORDER_SIZE) {
    if (y - r.top < x - r.left) {
      zone = DropZone.BorderTop;
    } else if (r.bottom - y < x - r.left) {
      zone = DropZone.BorderBottom;
    } else {
      zone = DropZone.BorderLeft;
    }
  } else if (x >= r.right - BORDER_SIZE) {
    if (y - r.top < r.right - x) {
      zone = DropZone.BorderTop;
    } else if (r.bottom - y < r.right - x) {
      zone = DropZone.BorderBottom;
    } else {
      zone = DropZone.BorderRight;
    }
  } else if (y < r.top + BORDER_SIZE) {
    zone = DropZone.BorderTop;
  } else if (y >= r.bottom - BORDER_SIZE) {
    zone = DropZone.BorderBottom;
  } else {
    zone = DropZone.Invalid;
  }
  return zone;
}


/**
 * Get the panel zone for the given client rect and position.
 *
 * This assumes the position lies within the client rect.
 *
 * This always returns a valid zone.
 */
function getPanelZone(r: ClientRect, x: number, y: number): DropZone {
  var zone: DropZone;
  var fracX = (x - r.left) / r.width;
  var fracY = (y - r.top) / r.height;
  if (fracX < 1 / 3) {
    if (fracY < fracX) {
      zone = DropZone.PanelTop;
    } else if (1 - fracY < fracX) {
      zone = DropZone.PanelBottom;
    } else {
      zone = DropZone.PanelLeft;
    }
  } else if (fracX < 2 / 3) {
    if (fracY < 1 / 3) {
      zone = DropZone.PanelTop;
    } else if (fracY < 2 / 3) {
      zone = DropZone.PanelCenter;
    } else {
      zone = DropZone.PanelBottom;
    }
  } else {
    if (fracY < 1 - fracX) {
      zone = DropZone.PanelTop;
    } else if (fracY > fracX) {
      zone = DropZone.PanelBottom;
    } else {
      zone = DropZone.PanelRight;
    }
  }
  return zone;
}

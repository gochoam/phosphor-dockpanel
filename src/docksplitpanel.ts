/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2015, PhosphorJS Contributors
|
| Distributed under the terms of the BSD 3-Clause License.
|
| The full license is in the file LICENSE, distributed with this software.
|----------------------------------------------------------------------------*/
'use strict';

import {
  SplitPanel
} from 'phosphor-splitpanel';


/**
 * The class name added to dock split panels.
 */
var SPLIT_PANEL_CLASS = 'p-DockSplitPanel';


/**
 * A split panel used by a DockPanel.
 *
 * This class is not part of the public Phosphor API and can be changed
 * or removed at any time. We mean it!
 */
export
class DockSplitPanel extends SplitPanel {
  /**
   * Construct a new dock split panel.
   */
  constructor() {
    super();
    this.addClass(SPLIT_PANEL_CLASS);
  }

  /**
   * Recursively set the handle size for this split panel.
   *
   * This will apply the given handle size to this panel as
   * well as its direct descendant split panels.
   */
  setHandleSizeRecursive(size: number): void {
    for (var i = 0, n = this.childCount; i < n; ++i) {
      var child = this.childAt(i);
      if (child instanceof DockSplitPanel) {
        child.setHandleSizeRecursive(size);
      }
    }
    this.handleSize = size;
  }
}

/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2015, PhosphorJS Contributors
|
| Distributed under the terms of the BSD 3-Clause License.
|
| The full license is in the file LICENSE, distributed with this software.
|----------------------------------------------------------------------------*/
'use strict';

import {
  BoxPanel
} from 'phosphor-boxpanel';

import {
  StackedPanel
} from 'phosphor-stackedpanel';

import {
  TabBar
} from 'phosphor-tabs';


/**
 * The class name added to dock tab panels.
 */
var TAB_PANEL_CLASS = 'p-DockTabPanel';


/**
 * A tabbed panel used by a DockPanel.
 *
 * This class is not part of the public Phosphor API and can be changed
 * or removed at any time. We mean it!
 *
 * This tab panel acts as a simple container for a tab bar and stacked
 * panel. The dock panel manages the tab bar and stacked panel directly,
 * as there is not always a 1:1 association between a tab and panel.
 */
export
class DockTabPanel extends BoxPanel {
  /**
   * Construct a new dock tab panel.
   */
  constructor() {
    super();
    this.addClass(TAB_PANEL_CLASS);

    this.direction = BoxPanel.TopToBottom;
    this.spacing = 0;

    var stack = this._stack = new StackedPanel();
    var tabs = this._tabs = new TabBar();

    BoxPanel.setStretch(tabs, 0);
    BoxPanel.setStretch(stack, 1);

    this.addChild(tabs);
    this.addChild(stack);
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    this._tabs = null;
    this._stack = null;
    super.dispose();
  }

  /**
   * Get the tab bar for the dock tab panel.
   */
  get tabs(): TabBar {
    return this._tabs;
  }

  /**
   * Get the stacked panel for the dock tab panel.
   */
  get stack(): StackedPanel {
    return this._stack;
  }

  private _tabs: TabBar;
  private _stack: StackedPanel;
}

/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2015, PhosphorJS Contributors
|
| Distributed under the terms of the BSD 3-Clause License.
|
| The full license is in the file LICENSE, distributed with this software.
|----------------------------------------------------------------------------*/
'use strict';

import * as arrays
  from 'phosphor-arrays';

import {
  Property
} from 'phosphor-properties';

import {
  Orientation, SplitPanel
} from 'phosphor-splitpanel';

import {
  StackedPanel
} from 'phosphor-stackedpanel';

import {
  TabPanel
} from 'phosphor-tabs';

import {
  Widget
} from 'phosphor-widget';

import './index.css';


/**
 * The class name added to DockPanel instances.
 */
const DOCK_PANEL_CLASS = 'p-DockPanel';

/**
 * The class name added to dock split panels.
 */
const SPLIT_PANEL_CLASS = 'p-DockSplitPanel';

/**
 * The class name added to dock tab panels.
 */
const TAB_PANEL_CLASS = 'p-DockTabPanel';

/**
 * The class name added to dock panel overlays.
 */
const OVERLAY_CLASS = 'p-DockPanelOverlay';

/**
 * The class name added to hidden overlays.
 */
const HIDDEN_CLASS = 'p-mod-hidden';

/**
 * The class name added to top edge dock overlays.
 */
const EDGE_TOP_CLASS = 'p-mod-edge-top';

/**
 * The class name added to left edge dock overlays.
 */
const EDGE_LEFT_CLASS = 'p-mod-edge-left';

/**
 * The class name added to right edge dock overlays.
 */
const EDGE_RIGHT_CLASS = 'p-mod-edge-right';

/**
 * The class name added to bottom edge dock overlays.
 */
const EDGE_BOTTOM_CLASS = 'p-mod-edge-bottom';

/**
 * The class name added to top panel dock overlays.
 */
const PANEL_TOP_CLASS = 'p-mod-panel-top';

/**
 * The class name added to left panel dock overlays.
 */
const PANEL_LEFT_CLASS = 'p-mod-panel-left';

/**
 * The class name added to right panel dock overlays.
 */
const PANEL_RIGHT_CLASS = 'p-mod-panel-right';

/**
 * The class name added to bottom panel dock overlays.
 */
const PANEL_BOTTOM_CLASS = 'p-mod-panel-bottom';

/**
 * The class named added to center panel dock overlays.
 */
const PANEL_CENTER_CLASS = 'p-mod-panel-center';

/**
 * The size of the edge dock zone for the root panel.
 */
const EDGE_SIZE = 30;


/**
 * A panel which provides a flexible docking area for content widgets.
 *
 * #### Notes
 * Widgets should be added to a `DockPanel` using one of the dedicated
 * insertion methods. The `children` widget list should not be used. A
 * widget can be removed by setting its `parent` to `null`.
 */
export
class DockPanel extends StackedPanel {
  /**
   * The property descriptor for the spacing between panels.
   *
   * The default value is `3`.
   *
   * **See also:** [[spacing]]
   */
  static spacingProperty = new Property<DockPanel, number>({
    name: 'spacing',
    value: 3,
    coerce: (owner, value) => Math.max(0, value | 0),
    changed: onSpacingChanged,
  });

  /**
   * Construct a new dock panel.
   */
  constructor() {
    super();
    this.addClass(DOCK_PANEL_CLASS);
  }

  /**
   * Get the spacing between panels.
   *
   * #### Notes
   * This is a pure delegate to the [[spacingProperty]].
   */
  get spacing(): number {
    return DockPanel.spacingProperty.get(this);
  }

  /**
   * Set the spacing between panels.
   *
   * #### Notes
   * This is a pure delegate to the [[spacingProperty]].
   */
  set spacing(value: number) {
    DockPanel.spacingProperty.set(this, value);
  }

  // TODO - need a method to manually select a widget.

  /**
   * Insert a widget as a new panel above a reference widget.
   *
   * @param widget - The widget to insert into the dock panel.
   *
   * @param ref - The reference widget. If this is not provided, the
   *   widget will be inserted at the top edge of the dock panel.
   *
   * @throws An error if either `widget` or `ref` is invalid.
   */
  insertTop(widget: Widget, ref?: Widget): void {
    insertSplit(this, widget, ref, Orientation.Vertical, false);
  }

  /**
   * Insert a widget as a new panel to the left of a reference widget.
   *
   * @param widget - The widget to insert into the dock panel.
   *
   * @param ref - The reference widget. If this is not provided, the
   *   widget will be inserted at the left edge of the dock panel.
   *
   * @throws An error if either `widget` or `ref` is invalid.
   */
  insertLeft(widget: Widget, ref?: Widget): void {
    insertSplit(this, widget, ref, Orientation.Horizontal, false);
  }

  /**
   * Insert a widget as a new panel to the right of a reference widget.
   *
   * @param widget - The widget to insert into the dock panel.
   *
   * @param ref - The reference widget. If this is not provided, the
   *   widget will be inserted at the right edge of the dock panel.
   *
   * @throws An error if either `widget` or `ref` is invalid.
   */
  insertRight(widget: Widget, ref?: Widget): void {
    insertSplit(this, widget, ref, Orientation.Horizontal, true);
  }

  /**
   * Insert a widget as a new panel below a reference widget.
   *
   * @param widget - The widget to insert into the dock panel.
   *
   * @param ref - The reference widget. If this is not provided, the
   *   widget will be inserted at the bottom edge of the dock panel.
   *
   * @throws An error if either `widget` or `ref` is invalid.
   */
  insertBottom(widget: Widget, ref?: Widget): void {
    insertSplit(this, widget, ref, Orientation.Vertical, true);
  }

  /**
   * Insert a widget as a sibling tab before a reference widget.
   *
   * @param widget - The widget to insert into the dock panel.
   *
   * @param ref - The reference widget. If this is not provided, the
   *   widget will be inserted as the first tab in the top-left panel.
   *
   * @throws An error if either `widget` or `ref` is invalid.
   */
  insertTabBefore(widget: Widget, ref?: Widget): void {
    insertTab(this, widget, ref, false);
  }

  /**
   * Insert a widget as a sibling tab after a reference widget.
   *
   * @param widget - The widget to insert into the dock panel.
   *
   * @param ref - The reference widget. If this is not provided, the
   *   widget will be inserted as the last tab in the top-left panel.
   *
   * @throws An error if either `widget` or `ref` is invalid.
   */
  insertTabAfter(widget: Widget, ref?: Widget): void {
    insertTab(this, widget, ref, true);
  }
}


/**
 * A custom split panel used by a DockPanel.
 */
class DockSplitPanel extends SplitPanel {
  /**
   * Construct a new dock split panel.
   */
  constructor(orientation: Orientation, spacing: number) {
    super();
    this.addClass(SPLIT_PANEL_CLASS);
    this.orientation = orientation;
    this.spacing = spacing;
  }
}


/**
 * A custom tab panel used by a DockPanel.
 */
class DockTabPanel extends TabPanel {
  /**
   * Construct a new dock tab panel.
   */
  constructor() {
    super();
    this.addClass(TAB_PANEL_CLASS);
    this.tabsMovable = true;
  }
}


/**
 * A type alias for the root panel type.
 */
type RootPanel = DockSplitPanel | DockTabPanel;


/**
 * A private attached property for the dock panel root.
 */
const rootProperty = new Property<DockPanel, RootPanel>({
  name: 'root',
  value: null,
});


/**
 * Get the root panel for a dock panel.
 */
function getRoot(panel: DockPanel): RootPanel {
  return rootProperty.get(panel);
}


/**
 * Set the root panel for a dock panel.
 */
function setRoot(panel: DockPanel, root: RootPanel): void {
  rootProperty.set(panel, root);
  root.parent = panel;
  panel.currentWidget = root;
}


/**
 * The change handler for the `spacing` property of a dock panel.
 */
function onSpacingChanged(panel: DockPanel, old: number, spacing: number): void {
  let root = getRoot(panel);
  if (root instanceof DockSplitPanel) {
    updateSpacing(root, spacing);
  }
}


/**
 * Recursively update the spacing of a dock split panel.
 */
function updateSpacing(panel: DockSplitPanel, spacing: number): void {
  let children = panel.children;
  for (let i = 0, n = children.length; i < n; ++i) {
    let child = children.get(i);
    if (child instanceof DockSplitPanel) {
      updateSpacing(child, spacing);
    }
  }
  panel.spacing = spacing;
}


/**
 * Test whether a dock panel contains the given widget.
 *
 * For this condition to be `true`, the widget must be a logical child
 * of a `DockTabPanel`, which itself must be a proper descendant of the
 * given dock panel.
 */
function dockPanelContains(panel: DockPanel, widget: Widget): boolean {
  let stack = widget.parent;
  if (!stack) {
    return false;
  }
  let tabs = stack.parent;
  if (!(tabs instanceof DockTabPanel)) {
    return false;
  }
  let parent = tabs.parent;
  while (parent) {
    if (parent === panel) {
      return true;
    }
    if (!(parent instanceof DockSplitPanel)) {
      return false;
    }
    parent = parent.parent;
  }
  return false;
}


/**
 * Find the ancestor dock tab panel for the given widget.
 *
 * This assumes the widget already belongs to a dock panel,
 * and will throw an error if that assumption does not hold.
 */
function findTabPanel(widget: Widget): DockTabPanel {
  let stack = widget.parent;
  if (!stack) {
    throw new Error('Invalid internal dock panel state.');
  }
  let tabs = stack.parent;
  if (!(tabs instanceof DockTabPanel)) {
    throw new Error('Invalid internal dock panel state.');
  }
  return tabs as DockTabPanel;
}


/**
 * Find the first dock tab panel for the given dock panel.
 *
 * This returns `null` if the dock panel has no content. It will throw
 * an error if the structure of the dock panel is found to be invalid.
 */
function findFirstTabPanel(panel: DockPanel): DockTabPanel {
  let root = getRoot(panel);
  while (root) {
    if (root instanceof DockTabPanel) {
      return root;
    }
    if (!(root instanceof DockSplitPanel) || root.children.length === 0) {
      throw new Error('Invalid internal dock panel state.');
    }
    root = root.children.get(0) as RootPanel;
  }
  return null;
}


/**
 * Get or create the first dock tab panel for the given dock panel.
 *
 * If dock panel has no root, a new tab panel will be created and
 * added as the root. An error will be thrown if the structure of
 * the dock panel is found to be invalid.
 */
function ensureFirstTabPanel(panel: DockPanel): DockTabPanel {
  let tabs = findFirstTabPanel(panel);
  if (!tabs) {
    tabs = new DockTabPanel();
    setRoot(panel, tabs);
  }
  return tabs;
}


/**
 * Ensure the root panel is a splitter with the given orientation.
 *
 * This will throw an error if the panel does not have a current root,
 * since that would violate the invariants of the dock panel structure.
 */
function ensureSplitRoot(panel: DockPanel, orientation: Orientation): DockSplitPanel {
  let root = getRoot(panel);
  if (!root) {
    throw new Error('Invalid internal dock panel state.');
  }
  if (root instanceof DockSplitPanel) {
    if (root.orientation === orientation) {
      return root;
    }
    if (root.children.length <= 1) {
      root.orientation = orientation;
      return root;
    }
  }
  let newRoot = new DockSplitPanel(orientation, panel.spacing);
  newRoot.children.add(root);
  setRoot(panel, newRoot);
  root.hidden = false;
  return newRoot;
}


/**
 * Validate the insert arguments for a dock panel.
 *
 * This will throw an error if the target widget is null, or if the
 * reference widget is not null and not contained by the dock panel.
 */
function validateInsertArgs(panel: DockPanel, widget: Widget, ref: Widget): void {
  if (!widget) {
    throw new Error('Target insert widget is null.');
  }
  if (ref && !dockPanelContains(panel, ref)) {
    throw new Error('Reference widget not contained by the dock panel.');
  }
}


/**
 * Insert a widget as a new split panel in a dock panel.
 *
 * @param panel - The dock panel of interest.
 *
 * @param widget - The widget to insert.
 *
 * @param ref - The reference widget. This may be null.
 *
 * @param orientation - The orientation of the split.
 *
 * @param after - Whether to insert before or after the reference.
 *
 * @throws An error if the `widget` or `ref` are invalid.
 */
function insertSplit(panel: DockPanel, widget: Widget, ref: Widget, orientation: Orientation, after: boolean): void {
  // Ensure the insert args are valid.
  validateInsertArgs(panel, widget, ref);

  // If the widget is the same as the ref, there's nothing to do.
  if (widget === ref) {
    return;
  }

  // Unparent the widget before performing the insert. This ensures
  // that structural changes to the dock panel occur before searching
  // for the insert location.
  widget.parent = null;

  // Setup the new tab panel to host the widget.
  let tabPanel = new DockTabPanel();
  tabPanel.widgets.add(widget);

  // If there is no root, add the new tab panel as the root.
  if (!getRoot(panel)) {
    setRoot(panel, tabPanel);
    return;
  }

  // If the ref widget is null, split the root panel.
  if (!ref) {
    let root = ensureSplitRoot(panel, orientation);
    let sizes = root.sizes();
    let count = sizes.length;
    arrays.insert(sizes, after ? count : 0, 0.5);
    root.children.insert(after ? count : 0, tabPanel);
    root.setSizes(sizes);
    return;
  }

  // Lookup the tab panel for the ref widget.
  let refTabPanel = findTabPanel(ref);

  // If the ref tab panel parent is the dock panel, split the root.
  if (refTabPanel.parent === panel) {
    let root = ensureSplitRoot(panel, orientation);
    root.children.insert(after ? 1 : 0, tabPanel);
    root.setSizes([1, 1]);
    return;
  }

  // Assert the parent of the ref tab panel is a dock split panel.
  if (!(refTabPanel.parent instanceof DockSplitPanel)) {
    throw new Error('Invalid internal dock panel state.');
  }

  // Cast the ref tab panel parent to a dock split panel.
  let splitPanel = refTabPanel.parent as DockSplitPanel;

  // If the split panel is the correct orientation, the widget
  // can be inserted directly and sized to 1/2 the ref space.
  if (splitPanel.orientation === orientation) {
    let i = splitPanel.children.indexOf(refTabPanel);
    let sizes = splitPanel.sizes();
    let size = sizes[i] = sizes[i] / 2;
    arrays.insert(sizes, after ? i + 1 : i, size);
    splitPanel.children.insert(after ? i + 1 : i, tabPanel);
    splitPanel.setSizes(sizes);
    return;
  }

  // If the split panel only has a single child, its orientation
  // can be changed directly and its sizes set to a 1:1 ratio.
  if (splitPanel.children.length === 1) {
    splitPanel.orientation = orientation;
    splitPanel.children.insert(after ? 1 : 0, tabPanel);
    splitPanel.setSizes([1, 1]);
    return;
  }

  // Assert the split panel has more than one child.
  if (splitPanel.children.length === 0) {
    throw new Error('Invalid internal dock panel state.');
  }

  // Otherwise, a new split panel with the correct orientation needs
  // to be created to hold the ref panel and tab panel, and inserted
  // in the previous location of the ref panel.
  let sizes = splitPanel.sizes();
  let i = splitPanel.children.indexOf(refTabPanel);
  let childSplit = new DockSplitPanel(orientation, panel.spacing);
  childSplit.children.add(refTabPanel);
  childSplit.children.insert(after ? 1 : 0, tabPanel);
  splitPanel.children.insert(i, childSplit);
  splitPanel.setSizes(sizes);
  childSplit.setSizes([1, 1]);
}


/**
 * Insert a widget as a sibling tab in a dock panel.
 *
 * @param panel - The dock panel of interest.
 *
 * @param widget - The widget to insert.
 *
 * @param ref - The reference widget. This may be null.
 *
 * @param after - Whether to insert before or after the reference.
 *
 * @throws An error if the `widget` or `ref` are invalid.
 */
function insertTab(panel: DockPanel, widget: Widget, ref: Widget, after: boolean): void {
  // Ensure the insert args are valid.
  validateInsertArgs(panel, widget, ref);

  // If the widget is the same as the ref, there's nothing to do.
  if (widget === ref) {
    return;
  }

  // Unparent the widget before performing the insert. This ensures
  // that structural changes to the dock panel occur before searching
  // for the insert location.
  widget.parent = null;

  // Find the index and tab panel for the insert operation.
  let index: number;
  let tabPanel: DockTabPanel;
  if (ref) {
    tabPanel = findTabPanel(ref);
    index = tabPanel.widgets.indexOf(ref) + (after ? 1 : 0);
  } else {
    tabPanel = ensureFirstTabPanel(panel);
    index = after ? tabPanel.widgets.length : 0;
  }

  // Insert the widget into the tab panel at the proper location.
  tabPanel.widgets.insert(index, widget);
}

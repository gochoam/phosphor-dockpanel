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
  boxSizing, hitTest
} from 'phosphor-domutil';

import {
  Drag, DropAction, DropActions, IDragEvent, MimeData
} from 'phosphor-dragdrop';

import {
  Message
} from 'phosphor-messaging';

import {
  NodeWrapper
} from 'phosphor-nodewrapper';

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
  TabBar, TabPanel, TearOffMessage
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
 * The class name added to dock tab bars.
 */
const TAB_BAR_CLASS = 'p-DockTabBar';

/**
 * The class name added to dock tab panels.
 */
const TAB_PANEL_CLASS = 'p-DockTabPanel';

/**
 * The class name added to dock split panels.
 */
const SPLIT_PANEL_CLASS = 'p-DockSplitPanel';

/**
 * The class name added to dock panel overlays.
 */
const OVERLAY_CLASS = 'p-DockPanelOverlay';

/**
 * The class name added to hidden overlays and tabs.
 */
const HIDDEN_CLASS = 'p-mod-hidden';

/**
 * The class name added to top root dock overlays.
 */
const ROOT_TOP_CLASS = 'p-mod-root-top';

/**
 * The class name added to left root dock overlays.
 */
const ROOT_LEFT_CLASS = 'p-mod-root-left';

/**
 * The class name added to right root dock overlays.
 */
const ROOT_RIGHT_CLASS = 'p-mod-root-right';

/**
 * The class name added to bottom root dock overlays.
 */
const ROOT_BOTTOM_CLASS = 'p-mod-root-bottom';

/**
 * The class name added to center root dock overlays.
 */
const ROOT_CENTER_CLASS = 'p-mod-root-center';

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
 * The factory MIME type supported by the dock panel.
 */
const FACTORY_MIME = 'application/x-phosphor-widget-factory';

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
   * Ensure the specified content widget is selected.
   *
   * @param widget - The content widget of interest.
   *
   * #### Notes
   * If the widget is not contained in a dock panel, or is already
   * the selected tab in its respective tab panel, this is a no-op.
   */
  static select(widget: Widget): void {
    selectWidget(widget);
  }

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

  /**
   * Handle the DOM events for the dock panel.
   *
   * @param event - The DOM event sent to the dock panel.
   *
   * #### Notes
   * This method implements the DOM `EventListener` interface and is
   * called in response to events on the dock panel's node. It should
   * not be called directly by user code.
   */
  handleEvent(event: Event): void {
    switch (event.type) {
    case 'p-dragenter':
      this._evtDragEnter(event as IDragEvent);
      break;
    case 'p-dragleave':
      this._evtDragLeave(event as IDragEvent);
      break;
    case 'p-dragover':
      this._evtDragOver(event as IDragEvent);
      break;
    case 'p-drop':
      this._evtDrop(event as IDragEvent);
      break;
    }
  }

  /**
   * A message handler invoked on an `'after-attach'` message.
   */
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    let node = this.node;
    node.addEventListener('p-dragenter', this);
    node.addEventListener('p-dragleave', this);
    node.addEventListener('p-dragover', this);
    node.addEventListener('p-drop', this);
  }

  /**
   * A message handler invoked on a `'before-detach'` message.
   */
  protected onBeforeDetach(msg: Message): void {
    super.onBeforeDetach(msg);
    let node = this.node;
    node.removeEventListener('p-dragenter', this);
    node.removeEventListener('p-dragleave', this);
    node.removeEventListener('p-dragover', this);
    node.removeEventListener('p-drop', this);
  }

  /**
   * Handle the `'p-dragenter'` event for the dock panel.
   */
  private _evtDragEnter(event: IDragEvent): void {
    if (event.mimeData.hasData(FACTORY_MIME)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  /**
   * Handle the `'p-dragleave'` event for the dock panel.
   */
  private _evtDragLeave(event: IDragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    let related = event.relatedTarget as HTMLElement;
    if (!related || !this.node.contains(related)) {
      hideOverlay(this);
    }
  }

  /**
   * Handle the `'p-dragover'` event for the dock panel.
   */
  private _evtDragOver(event: IDragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    let zone = showOverlay(this, event.clientX, event.clientY);
    if (zone === DockZone.Invalid) {
      event.dropAction = DropAction.None;
    } else {
      event.dropAction = event.proposedAction;
    }
  }

  /**
   * Handle the `'p-drop'` event for the dock panel.
   */
  private _evtDrop(event: IDragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    hideOverlay(this);
    if (event.proposedAction === DropAction.None) {
      event.dropAction = DropAction.None;
      return;
    }
    let target = findDockTarget(this, event.clientX, event.clientY);
    if (target.zone === DockZone.Invalid) {
      event.dropAction = DropAction.None;
      return;
    }
    let factory = event.mimeData.getData(FACTORY_MIME);
    if (typeof factory !== 'function') {
      event.dropAction = DropAction.None;
      return;
    }
    let widget = factory();
    if (!(widget instanceof Widget)) {
      event.dropAction = DropAction.None;
      return;
    }
    handleDrop(this, widget, target);
    event.dropAction = event.proposedAction;
  }
}


/**
 * An enum of the dock zones for a dock panel.
 */
const enum DockZone {
  /**
   * The dock zone at the top of the root split panel.
   */
  RootTop,

  /**
   * The dock zone at the left of the root split panel.
   */
  RootLeft,

  /**
   * The dock zone at the right of the root split panel.
   */
  RootRight,

  /**
   * The dock zone at the bottom of the root split panel.
   */
  RootBottom,

  /**
   * The dock zone at the center of the root split panel.
   */
  RootCenter,

  /**
   * The dock zone at the top third of a tab panel.
   */
  PanelTop,

  /**
   * The dock zone at the left third of a tab panel.
   */
  PanelLeft,

  /**
   * The dock zone at the right third of a tab panel.
   */
  PanelRight,

  /**
   * The dock zone at the bottom third of a tab panel.
   */
  PanelBottom,

  /**
   * The dock zone at the center of a tab panel.
   */
  PanelCenter,

  /**
   * An invalid dock zone.
   */
  Invalid,
}


/**
 * The result object for a dock target hit test.
 */
interface IDockTarget {
  /**
   * The dock zone at the specified position.
   *
   * This will be `Invalid` if the position is not over a dock zone.
   */
  zone: DockZone;

  /**
   * The dock tab panel for the panel dock zone.
   *
   * This will be `null` if the dock zone is not a panel zone.
   */
  panel: DockTabPanel;
}


/**
 * A custom tab bar used by a DockTabPanel.
 */
class DockTabBar extends TabBar<Widget> {
  /**
   * Construct a new dock tab bar.
   */
  constructor() {
    super();
    this.addClass(TAB_BAR_CLASS);
    this.tabsMovable = true;
  }

  /**
   * Dispose of the resources held by the tab bar.
   */
  dispose(): void {
    if (this._drag) {
      this._drag.dispose();
      this._drag = null;
    }
    super.dispose();
  }

  /**
   * A message handler invoked on a `'tear-off-request'` message.
   */
  protected onTearOffRequest(msg: TearOffMessage<Widget>): void {
    // Do nothing if a drag is already in progress.
    if (this._drag) {
      return;
    }

    // Release the tab bar's hold on the mouse.
    this.releaseMouse();

    // Setup the mime data for the drag operation.
    let widget = msg.item;
    let mimeData = new MimeData();
    mimeData.setData(FACTORY_MIME, () => widget);

    // Create the drag image for the drag operation.
    let tabNode = msg.node;
    let dragImage = tabNode.cloneNode(true) as HTMLElement;

    // Create the drag object to manage the drag-drop operation.
    this._drag = new Drag({
      mimeData: mimeData,
      dragImage: dragImage,
      proposedAction: DropAction.Move,
      supportedActions: DropActions.Move,
    });

    // Start the drag operation and cleanup when done.
    tabNode.classList.add(HIDDEN_CLASS);
    this._drag.start(msg.clientX, msg.clientY).then(() => {
      this._drag = null;
      tabNode.classList.remove(HIDDEN_CLASS);
    });
  }

  private _drag: Drag = null;
}


/**
 * A custom tab panel used by a DockPanel.
 */
class DockTabPanel extends TabPanel {
  /**
   * Create the tab bar for the tab panel.
   */
  static createTabBar(): DockTabBar {
    return new DockTabBar();
  }

  /**
   * Construct a new dock tab panel.
   */
  constructor() {
    super();
    this.addClass(TAB_PANEL_CLASS);
    this.widgets.changed.connect(this._onWidgetsChanged, this);
  }

  /**
   * Handle the `changed` signal for the widget list.
   *
   * This will remove the tab panel if the widget count is zero.
   */
  private _onWidgetsChanged() {
    if (this.widgets.length === 0) removeTabPanel(this);
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
 * A node wrapper used as an overlay dock indicator for a dock panel.
 */
class DockPanelOverlay extends NodeWrapper {
  /**
   * A mapping of dock zone enum value to modifier class.
   */
  static zoneMap = [  // keep in-sync with DockZone enum
    ROOT_TOP_CLASS,
    ROOT_LEFT_CLASS,
    ROOT_RIGHT_CLASS,
    ROOT_BOTTOM_CLASS,
    ROOT_CENTER_CLASS,
    PANEL_TOP_CLASS,
    PANEL_LEFT_CLASS,
    PANEL_RIGHT_CLASS,
    PANEL_BOTTOM_CLASS,
    PANEL_CENTER_CLASS
  ];

  /**
   * Construct a new dock panel overlay.
   */
  constructor() {
    super();
    this.addClass(OVERLAY_CLASS);
    this.addClass(HIDDEN_CLASS);
  }

  /**
   * Show the overlay with the given zone and geometry
   */
  show(zone: DockZone, left: number, top: number, width: number, height: number): void {
    let style = this.node.style;
    style.top = top + 'px';
    style.left = left + 'px';
    style.width = width + 'px';
    style.height = height + 'px';
    this.removeClass(HIDDEN_CLASS);
    this._setZone(zone);
  }

  /**
   * Hide the overlay and reset its zone.
   */
  hide(): void {
    this.addClass(HIDDEN_CLASS);
    this._setZone(DockZone.Invalid);
  }

  /**
   * Set the dock zone for the overlay.
   */
  private _setZone(zone: DockZone): void {
    if (zone === this._zone) {
      return;
    }
    let oldClass = DockPanelOverlay.zoneMap[this._zone];
    let newClass = DockPanelOverlay.zoneMap[zone];
    if (oldClass) this.removeClass(oldClass);
    if (newClass) this.addClass(newClass);
    this._zone = zone;
  }

  private _zone = DockZone.Invalid;
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
  changed: onRootChanged,
});


/**
 * A private attached property for the dock panel overlay.
 */
const overlayProperty = new Property<DockPanel, DockPanelOverlay>({
  name: 'overlay',
  create: createOverlay,
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
}


/**
 * The change handler for the dock panel `rootProperty`.
 *
 * This will re-parent the new root and set it as the current widget.
 *
 * The old root is not modified.
 */
function onRootChanged(panel: DockPanel, old: RootPanel, root: RootPanel): void {
  if (!root) return;
  root.parent = panel;
  panel.currentWidget = root;
}


/**
 * Get the overlay for a dock panel.
 */
function getOverlay(panel: DockPanel): DockPanelOverlay {
  return overlayProperty.get(panel);
}


/**
 * The creation handler for the dock panel `overlayProperty`.
 *
 * This will create and install the overlay for the panel.
 */
function createOverlay(panel: DockPanel): DockPanelOverlay {
  let overlay = new DockPanelOverlay();
  panel.node.appendChild(overlay.node);
  return overlay;
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
 * Throw an internal dock panel error.
 */
function internalError(): void {
  throw new Error('Internal DockPanel Error.');
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
 * This assumes the widget already belongs to a dock panel, and will
 * throw an error if that assumption does not hold.
 */
function findTabPanel(widget: Widget): DockTabPanel {
  let stack = widget.parent;
  if (!stack) {
    internalError();
  }
  let tabs = stack.parent;
  if (!(tabs instanceof DockTabPanel)) {
    internalError();
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
      internalError();
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
  let oldRoot = getRoot(panel);
  if (!oldRoot) {
    internalError();
  }
  if (oldRoot instanceof DockSplitPanel) {
    if (oldRoot.orientation === orientation) {
      return oldRoot;
    }
    if (oldRoot.children.length <= 1) {
      oldRoot.orientation = orientation;
      return oldRoot;
    }
  }
  let newRoot = new DockSplitPanel(orientation, panel.spacing);
  newRoot.children.add(oldRoot);
  setRoot(panel, newRoot);
  oldRoot.hidden = false;
  return newRoot;
}


/**
 * Ensure the given widget is the current widget in its tab panel.
 *
 * This is a no-op if the widget is not contained in a dock tab panel.
 */
function selectWidget(widget: Widget): void {
  let stack = widget.parent;
  if (!stack) {
    return;
  }
  let tabs = stack.parent;
  if (!(tabs instanceof DockTabPanel)) {
    return;
  }
  (tabs as DockTabPanel).currentWidget = widget;
}


/**
 * Validate the insert arguments for a dock panel.
 *
 * This will throw an error if the target widget is null, or if the
 * reference widget is not null and not contained by the dock panel.
 */
function validateInsertArgs(panel: DockPanel, widget: Widget, ref: Widget): void {
  if (!widget) {
    throw new Error('Target widget is null.');
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
    internalError();
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
    internalError();
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


/**
 * Remove an empty dock tab panel from the hierarchy.
 *
 * This ensures that the hierarchy is kept consistent by merging an
 * ancestor split panel when it contains only a single child widget.
 */
function removeTabPanel(tabPanel: DockTabPanel): void {
  // Assert the tab panel is empty.
  if (tabPanel.widgets.length !== 0) {
    internalError();
  }

  // If the parent of the tab panel is a dock panel, just remove it.
  if (tabPanel.parent instanceof DockPanel) {
    setRoot(tabPanel.parent as DockPanel, null);
    tabPanel.dispose();
    return;
  }

  // Assert the tab panel parent is a dock split panel.
  if (!(tabPanel.parent instanceof DockSplitPanel)) {
    internalError();
  }

  // Cast the tab panel parent to a dock split panel.
  let splitPanel = tabPanel.parent as DockSplitPanel;

  // Assert the split panel has at least two children.
  if (splitPanel.children.length < 2) {
    internalError();
  }

  // Dispose the tab panel to ensure its resources are released.
  tabPanel.dispose();

  // If the split panel still has multiple children, there is
  // nothing more to do.
  if (splitPanel.children.length > 1) {
    return;
  }

  // Extract the remaining child from the split panel.
  let child = splitPanel.children.get(0);

  // Assert the remaining child is a proper panel type.
  if (!(child instanceof DockTabPanel) && !(child instanceof DockSplitPanel)) {
    internalError();
  }

  // If the parent of the split panel is a dock panel, replace it.
  if (splitPanel.parent instanceof DockPanel) {
    setRoot(splitPanel.parent as DockPanel, child as RootPanel);
    splitPanel.dispose();
    return;
  }

  // Assert the split panel parent is a dock split panel.
  if (!(splitPanel.parent instanceof DockSplitPanel)) {
    internalError();
  }

  // Cast the split panel parent to a dock split panel.
  let grandPanel = splitPanel.parent as DockSplitPanel;

  // If the child is a dock tab panel, replace the split panel.
  if (child instanceof DockTabPanel) {
    let sizes = grandPanel.sizes();
    let index = grandPanel.children.indexOf(splitPanel);
    grandPanel.children.set(index, child);
    grandPanel.setSizes(sizes);
    splitPanel.dispose();
    return;
  }

  // Cast the child to a dock split panel.
  let childSplit = child as DockSplitPanel;

  // Child splitters have an orthogonal orientation to their parent.
  // Assert the orientation of the child matches the grand parent.
  if (childSplit.orientation !== grandPanel.orientation) {
    internalError();
  }

  // The grand children can now be merged with their grand parent.
  // Start by fetching the relevant current sizes and insert index.
  let childSizes = childSplit.sizes();
  let grandSizes = grandPanel.sizes();
  let childChildren = childSplit.children;
  let grandChildren = grandPanel.children;

  // Remove the split panel and store its share of the size.
  let index = grandChildren.indexOf(splitPanel);
  let sizeShare = arrays.removeAt(grandSizes, index);
  splitPanel.parent = null;

  // Merge the grand children and maintain their relative size.
  for (let i = 0; childChildren.length !== 0; ++i) {
    grandChildren.insert(index + i, childChildren.get(0));
    arrays.insert(grandSizes, index + i, sizeShare * childSizes[i]);
  }

  // Update the grand parent sizes and dispose the removed panel.
  grandPanel.setSizes(grandSizes);
  splitPanel.dispose();
}


/**
 * Recursively iterate over the dock tab panels of a root panel.
 *
 * Iteration stops if the callback returns anything but `undefined`.
 */
function iterTabPanels<T>(root: RootPanel, callback: (tabs: DockTabPanel) => T): T {
  if (root instanceof DockTabPanel) {
    return callback(root);
  }
  if (!(root instanceof DockSplitPanel)) {
    internalError();
  }
  let children = root.children;
  for (let i = 0; i < children.length; ++i) {
    let child = children.get(i) as RootPanel;
    let result = iterTabPanels(child, callback);
    if (result !== void 0) return result;
  }
  return void 0;
}


/**
 * Get the root edge zone for the given node and client position.
 *
 * This assumes the position lies within the node's client rect.
 *
 * Returns the `Invalid` zone if the position is not within an edge.
 */
function getEdgeZone(node: HTMLElement, x: number, y: number): DockZone {
  let zone: DockZone;
  let rect = node.getBoundingClientRect();
  if (x < rect.left + EDGE_SIZE) {
    if (y - rect.top < x - rect.left) {
      zone = DockZone.RootTop;
    } else if (rect.bottom - y < x - rect.left) {
      zone = DockZone.RootBottom;
    } else {
      zone = DockZone.RootLeft;
    }
  } else if (x >= rect.right - EDGE_SIZE) {
    if (y - rect.top < rect.right - x) {
      zone = DockZone.RootTop;
    } else if (rect.bottom - y < rect.right - x) {
      zone = DockZone.RootBottom;
    } else {
      zone = DockZone.RootRight;
    }
  } else if (y < rect.top + EDGE_SIZE) {
    zone = DockZone.RootTop;
  } else if (y >= rect.bottom - EDGE_SIZE) {
    zone = DockZone.RootBottom;
  } else {
    zone = DockZone.Invalid;
  }
  return zone;
}


/**
 * Get the panel zone for the given node and position.
 *
 * This assumes the position lies within the node's client rect.
 *
 * This always returns a valid zone.
 */
function getPanelZone(node: HTMLElement, x: number, y: number): DockZone {
  let zone: DockZone;
  let rect = node.getBoundingClientRect();
  let fracX = (x - rect.left) / rect.width;
  let fracY = (y - rect.top) / rect.height;
  if (fracX < 1 / 3) {
    if (fracY < fracX) {
      zone = DockZone.PanelTop;
    } else if (1 - fracY < fracX) {
      zone = DockZone.PanelBottom;
    } else {
      zone = DockZone.PanelLeft;
    }
  } else if (fracX < 2 / 3) {
    if (fracY < 1 / 3) {
      zone = DockZone.PanelTop;
    } else if (fracY < 2 / 3) {
      zone = DockZone.PanelCenter;
    } else {
      zone = DockZone.PanelBottom;
    }
  } else {
    if (fracY < 1 - fracX) {
      zone = DockZone.PanelTop;
    } else if (fracY > fracX) {
      zone = DockZone.PanelBottom;
    } else {
      zone = DockZone.PanelRight;
    }
  }
  return zone;
}


/**
 * Find the dock target for the given client position.
 */
function findDockTarget(panel: DockPanel, clientX: number, clientY: number): IDockTarget {
  let root = getRoot(panel);
  if (!root) {
    return { zone: DockZone.RootCenter, panel: null };
  }
  if (!hitTest(root.node, clientX, clientY)) {
    return { zone: DockZone.Invalid, panel: null };
  }
  let edgeZone = getEdgeZone(root.node, clientX, clientY);
  if (edgeZone !== DockZone.Invalid) {
    return { zone: edgeZone, panel: null };
  }
  let hitPanel = iterTabPanels(root, tabs => {
    return hitTest(tabs.node, clientX, clientY) ? tabs : void 0;
  });
  if (!hitPanel) {
    return { zone: DockZone.Invalid, panel: null };
  }
  let panelZone = getPanelZone(hitPanel.node, clientX, clientY);
  return { zone: panelZone, panel: hitPanel };
}


/**
 * Hide the dock panel overlay for the given dock panel.
 */
function hideOverlay(panel: DockPanel): void {
  getOverlay(panel).hide();
}


/**
 * Show the dock panel overlay indicator at the given client position.
 *
 * If the position is not over a dock zone, the overlay is hidden.
 *
 * This returns the dock zone used to display the overlay.
 */
function showOverlay(panel: DockPanel, clientX: number, clientY: number): DockZone {
  // Find the dock target for the given client position.
  let target = findDockTarget(panel, clientX, clientY);

  // If the dock zone is invalid, hide the overlay and bail.
  if (target.zone === DockZone.Invalid) {
    getOverlay(panel).hide();
    return target.zone;
  }

  // Setup the variables needed to compute the overlay geometry.
  let top: number;
  let left: number;
  let width: number;
  let height: number;
  let pcr: ClientRect;
  let box = boxSizing(panel.node); // TODO cache this?
  let rect = panel.node.getBoundingClientRect();

  // Compute the overlay geometry based on the dock zone.
  switch (target.zone) {
  case DockZone.RootTop:
    top = box.paddingTop;
    left = box.paddingLeft;
    width = rect.width - box.horizontalSum;
    height = (rect.height - box.verticalSum) / 3;
    break;
  case DockZone.RootLeft:
    top = box.paddingTop;
    left = box.paddingLeft;
    width = (rect.width - box.horizontalSum) / 3;
    height = rect.height - box.verticalSum;
    break;
  case DockZone.RootRight:
    top = box.paddingTop;
    width = (rect.width - box.horizontalSum) / 3;
    left = box.paddingLeft + 2 * width;
    height = rect.height - box.verticalSum;
    break;
  case DockZone.RootBottom:
    height = (rect.height - box.verticalSum) / 3;
    top = box.paddingTop + 2 * height;
    left = box.paddingLeft;
    width = rect.width - box.horizontalSum;
    break;
  case DockZone.RootCenter:
    top = box.paddingTop;
    left = box.paddingLeft;
    width = rect.width - box.horizontalSum;
    height = rect.height - box.verticalSum;
    break;
  case DockZone.PanelTop:
    pcr = target.panel.node.getBoundingClientRect();
    top = pcr.top - rect.top - box.borderTop;
    left = pcr.left - rect.left - box.borderLeft;
    width = pcr.width;
    height = pcr.height / 2;
    break;
  case DockZone.PanelLeft:
    pcr = target.panel.node.getBoundingClientRect();
    top = pcr.top - rect.top - box.borderTop;
    left = pcr.left - rect.left - box.borderLeft;
    width = pcr.width / 2;
    height = pcr.height;
    break;
  case DockZone.PanelRight:
    pcr = target.panel.node.getBoundingClientRect();
    top = pcr.top - rect.top - box.borderTop;
    left = pcr.left - rect.left - box.borderLeft + pcr.width / 2;
    width = pcr.width / 2;
    height = pcr.height;
    break;
  case DockZone.PanelBottom:
    pcr = target.panel.node.getBoundingClientRect();
    top = pcr.top - rect.top - box.borderTop + pcr.height / 2;
    left = pcr.left - rect.left - box.borderLeft;
    width = pcr.width;
    height = pcr.height / 2;
    break;
  case DockZone.PanelCenter:
    pcr = target.panel.node.getBoundingClientRect();
    top = pcr.top - rect.top - box.borderTop;
    left = pcr.left - rect.left - box.borderLeft;
    width = pcr.width;
    height = pcr.height;
    break;
  }

  // Show the overlay and return the dock zone.
  getOverlay(panel).show(target.zone, left, top, width, height);
  return target.zone;
}


/**
 * Drop a widget onto a dock panel using the given dock target.
 */
function handleDrop(panel: DockPanel, widget: Widget, target: IDockTarget): void {
  // Do nothing if the dock zone is invalid.
  if (target.zone === DockZone.Invalid) {
    return;
  }

  // Handle the simple case of root drops first.
  switch(target.zone) {
  case DockZone.RootTop:
    panel.insertTop(widget);
    return;
  case DockZone.RootLeft:
    panel.insertLeft(widget);
    return;
  case DockZone.RootRight:
    panel.insertRight(widget);
    return;
  case DockZone.RootBottom:
    panel.insertBottom(widget);
    return;
  case DockZone.RootCenter:
    panel.insertLeft(widget);
    return;
  }

  // Otherwise, it's a panel drop, and that requires more checks.

  // Do nothing if the widget is dropped as a tab on its own panel.
  if (target.zone === DockZone.PanelCenter) {
    if (target.panel.widgets.contains(widget)) {
      return;
    }
  }

  // Do nothing if the panel only contains the drop widget.
  if (target.panel.widgets.length === 1) {
    if (target.panel.widgets.get(0) === widget) {
      return;
    }
  }

  // Find a suitable reference widget for the drop.
  let ref = target.panel.widgets.get(-1);
  if (ref === widget) {
    ref = target.panel.widgets.get(-2);
  }

  // Insert the widget based on the panel zone.
  switch(target.zone) {
  case DockZone.PanelTop:
    panel.insertTop(widget, ref);
    return;
  case DockZone.PanelLeft:
    panel.insertLeft(widget, ref);
    return;
  case DockZone.PanelRight:
    panel.insertRight(widget, ref);
    return;
  case DockZone.PanelBottom:
    panel.insertBottom(widget, ref);
    return;
  case DockZone.PanelCenter:
    panel.insertTabAfter(widget, ref);
    selectWidget(widget);
    return;
  }
}

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
  BoxPanel
} from 'phosphor-boxpanel';

import {
  IDisposable
} from 'phosphor-disposable';

import {
  hitTest, overrideCursor
} from 'phosphor-domutil';

import {
  Property
} from 'phosphor-properties';

import {
  Orientation, SplitPanel
} from 'phosphor-splitpanel';

import {
  IWidgetIndexArgs, StackedPanel
} from 'phosphor-stackedpanel';

import {
  ITabDetachArgs, ITabIndexArgs, Tab, TabBar
} from 'phosphor-tabs';

import {
  Widget
} from 'phosphor-widget';

import './index.css';


/**
 * `p-DockPanel`: the class name added to DockPanel instances.
 */
var DOCK_PANEL_CLASS = 'p-DockPanel';

/**
 * `p-DockSplitPanel`: the class name added to DockSplitPanel instances.
 */
var DOCK_SPLIT_PANEL_CLASS = 'p-DockSplitPanel';

/**
 * `p-DockTabPanel`: the class name added to DockTabPanel instances.
 */
var DOCK_TAB_PANEL_CLASS = 'p-DockTabPanel';

/**
 * `p-DockTabPanel-overlay`: the class name added to a DockTabPanel overlay.
 */
var OVERLAY_CLASS = 'p-DockTabPanel-overlay';

/**
 * The class name added to a tab which is being docked.
 */
var DOCKING_CLASS = 'p-mod-docking';


/**
 * An enum of docking modes for a dock panel.
 */
export
enum DockMode {
  /**
   * Insert the widget as a new split item above a reference.
   */
  SplitTop,

  /**
   * Insert the widget as a new split item to the left of a reference.
   */
  SplitLeft,

  /**
   * Insert the widget as a new split item to the right of a reference.
   */
  SplitRight,

  /**
   * Insert the widget as a new split item below a reference.
   */
  SplitBottom,

  /**
   * Insert the widget as a new tab before a reference.
   */
  TabBefore,

  /**
   * Insert the widget as a new tab after a reference.
   */
  TabAfter,
}


/**
 * A widget which provides a flexible docking panel for content widgets.
 *
 * #### Notes
 * Widgets should be added to a `DockPanel` using the [[addWidget]]
 * method, **not** the inherited `<prefix>Child` methods. There is
 * no corresponding `removeWidget` method; simply set the `parent`
 * of a widget to `null` to remove it from a `DockPanel`.
 */
export
class DockPanel extends BoxPanel {
  /**
   * A convenience alias of the `SplitTop` [[DockMode]].
   */
  static SplitTop = DockMode.SplitTop;

  /**
   * A convenience alias of the `SplitLeft` [[DockMode]].
   */
  static SplitLeft = DockMode.SplitLeft;

  /**
   * A convenience alias of the `SplitRight` [[DockMode]].
   */
  static SplitRight = DockMode.SplitRight;

  /**
   * A convenience alias of the `SplitBottom` [[DockMode]].
   */
  static SplitBottom = DockMode.SplitBottom;

  /**
   * A convenience alias of the `TabBefore` [[DockMode]].
   */
  static TabBefore = DockMode.TabBefore;

  /**
   * A convenience alias of the `TabAfter` [[DockMode]].
   */
  static TabAfter = DockMode.TabAfter;

  /**
   * The property descriptor for the `tab` attached property.
   *
   * This controls the tab used for a widget in a dock panel.
   *
   * #### Notes
   * If the tab for a widget is changed, the new tab will not be
   * reflected until the widget is re-inserted into the dock panel.
   * However, in-place changes to the tab's properties **will** be
   * reflected.
   *
   * **See also:** [[getTab]], [[setTab]]
   */
  static tabProperty = new Property<Widget, Tab>({
    value: null,
    coerce: (owner, value) => value || null,
  });

  /**
   * The property descriptor for the dock panel handle size.
   *
   * The controls the size of the split handles placed between the
   * tabbed panel, in pixels. The default value is `3`.
   *
   * **See also:** [[handleSize]]
   */
  static handleSizeProperty = new Property<DockPanel, number>({
    value: 3,
    coerce: (owner, value) => Math.max(0, value | 0),
    changed: (owner, old, value) => owner._onHandleSizeChanged(old, value),
  });

  /**
   * Get the dock panel tab for the given widget.
   *
   * @param widget - The widget of interest.
   *
   * @returns The dock panel tab for the given widget.
   *
   * #### Notes
   * This is a pure delegate for the [[tabProperty]].
   */
  static getTab(widget: Widget): Tab {
    return DockPanel.tabProperty.get(widget);
  }

  /**
   * Set the dock panel tab for the given widget.
   *
   * @param widget - The widget of interest.
   *
   * @param tab - The tab to use for the widget in a dock panel.
   *
   * #### Notes
   * This is a pure delegate for the [[tabProperty]].
   */
  static setTab(widget: Widget, tab: Tab): void {
    DockPanel.tabProperty.set(widget, tab);
  }

  /**
   * Construct a new dock panel.
   */
  constructor() {
    super();
    this.addClass(DOCK_PANEL_CLASS);
    this._root = this._createSplitPanel(Orientation.Horizontal);
    this.addChild(this._root);
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    this._abortDrag();
    this._root = null;
    this._items.length = 0;
    super.dispose();
  }

  /**
   * Get the handle size of the dock split panels.
   *
   * #### Notes
   * This is a pure delegate to the [[handleSizeProperty]].
   */
  get handleSize(): number {
    return DockPanel.handleSizeProperty.get(this);
  }

  /**
   * Set the handle size of the dock split panels.
   *
   * #### Notes
   * This is a pure delegate to the [[handleSizeProperty]].
   */
  set handleSize(value: number) {
    DockPanel.handleSizeProperty.set(this, value);
  }

  /**
   * Add a widget to the dock panel according to the given dock mode.
   *
   * @param widget - The widget to add to the dock panel.
   *
   * @param mode - The insertion mode for the widget. This controls how
   *   the widget is inserted relative to the reference widget. If this
   *   is not provided, `DockMode.SplitLeft` is assumed.
   *
   * @param ref - The reference widget which controls the placement of
   *   the added widget. If this is not provided, or is not contained
   *   in the dock panel, the widget is inserted relative to the root.
   *
   * #### Notes
   * If the dock widget is already added to the panel, it will be moved
   * to the new location.
   *
   * The `DockPanel.tab` attached property **must** be set with the tab
   * to use for the widget, or an error will be thrown. This can be set
   * via `DockPanel.setTab`. This property is assumed to stay constant
   * while the widget is contained by the dock panel.
   *
   * If the `widget` and the `ref` are the same object, an error will
   * be thrown.
   */
  addWidget(widget: Widget, mode?: DockMode, ref?: Widget): void {
    if (widget === ref) {
      throw new Error('invalid ref widget');
    }
    if (!DockPanel.getTab(widget)) {
      throw new Error('`DockPanel.tab` property not set');
    }
    switch (mode) {
    case DockMode.SplitTop:
      this._splitWidget(widget, ref, Orientation.Vertical, false);
      break;
    case DockMode.SplitLeft:
      this._splitWidget(widget, ref, Orientation.Horizontal, false);
      break;
    case DockMode.SplitRight:
      this._splitWidget(widget, ref, Orientation.Horizontal, true);
      break;
    case DockMode.SplitBottom:
      this._splitWidget(widget, ref, Orientation.Vertical, true);
      break;
    case DockMode.TabBefore:
      this._tabifyWidget(widget, ref, false);
      break;
    case DockMode.TabAfter:
      this._tabifyWidget(widget, ref, true);
      break;
    default:
      this._addPanel(widget, Orientation.Horizontal, false);
      break;
    }
  }

  /**
   * Handle the DOM events for the dock panel.
   *
   * @param event - The DOM event sent to the dock panel.
   *
   * #### Notes
   * This method implements the DOM `EventListener` interface and is
   * called in response to events on the dock panel's DOM node. It
   * should not be called directly by user code.
   */
  handleEvent(event: Event): void {
    switch (event.type) {
    case 'mousemove':
      this._evtMouseMove(event as MouseEvent);
      break;
    case 'mouseup':
      this._evtMouseUp(event as MouseEvent);
      break;
    case 'contextmenu':
      event.preventDefault();
      event.stopPropagation();
      break;
    }
  }

  /**
   * Add the dock widget as a new split panel next to the reference.
   */
  private _splitWidget(widget: Widget, ref: Widget, orientation: Orientation, after: boolean): void {
    var item = ref ? this._findItemByWidget(ref) : void 0;
    if (item) {
      this._splitPanel(item.panel, widget, orientation, after);
    } else {
      this._addPanel(widget, orientation, after);
    }
  }

  /**
   * Add the dock widget as a tab next to the reference.
   */
  private _tabifyWidget(widget: Widget, ref: Widget, after: boolean): void {
    var item = ref ? this._findItemByWidget(ref) : void 0;
    if (item) {
      this._tabifyPanel(item, widget, after);
    } else {
      this._addPanel(widget, Orientation.Horizontal, after);
    }
  }

  /**
   * Add a widget to a new tab panel along the given orientation.
   */
  private _addPanel(widget: Widget, orientation: Orientation, after: boolean): void {
    // Remove the widget from its current parent.
    widget.parent = null;

    // Create a new dock tab panel to host the widget.
    var panel = this._createTabPanel();

    // Create and add the dock item for the widget.
    var tab = DockPanel.getTab(widget);
    this._items.push({ tab: tab, widget: widget, panel: panel });

    // Add the widget to the tab panel.
    panel.stack.addChild(widget);
    panel.tabs.addTab(tab);

    // Ensure a proper root and add the new tab panel.
    this._ensureRoot(orientation);
    this._root.insertChild(after ? this._root.childCount : 0, panel);
  }

  /**
   * Split a dock item with a widget along the given orientation.
   */
  private _splitPanel(target: DockTabPanel, widget: Widget, orientation: Orientation, after: boolean): void {
    // Remove the widget from its current parent.
    widget.parent = null;

    // Create a new dock tab panel to host the widget.
    var panel = this._createTabPanel();

    // Create and add the dock item for the widget.
    var tab = DockPanel.getTab(widget);
    this._items.push({ tab: tab, widget: widget, panel: panel });

    // Add the widget to the tab panel.
    panel.stack.addChild(widget);
    panel.tabs.addTab(tab);

    // Add the new panel to the parent split panel. This may require
    // creating a new child split panel to adhere to the orientation
    // constraint. The split panel sizes are updated reasonably.
    var splitPanel = target.parent as DockSplitPanel;
    if (splitPanel.orientation !== orientation) {
      if (splitPanel.childCount <= 1) {
        splitPanel.orientation = orientation;
        splitPanel.insertChild(+after, panel);
        splitPanel.setSizes([1, 1]);
      } else {
        var sizes = splitPanel.sizes();
        var i = splitPanel.childIndex(target);
        var childSplit = this._createSplitPanel(orientation);
        childSplit.addChild(target);
        childSplit.insertChild(+after, panel);
        splitPanel.insertChild(i, childSplit);
        splitPanel.setSizes(sizes);
        childSplit.setSizes([1, 1]);
      }
    } else {
      var i = splitPanel.childIndex(target);
      var sizes = splitPanel.sizes();
      var size = sizes[i] = sizes[i] / 2;
      splitPanel.insertChild(i + (+after), panel);
      arrays.insert(sizes, i + (+after), size);
      splitPanel.setSizes(sizes);
    }
  }

  /**
   * Add a widget to the tab panel of a given dock item.
   */
  private _tabifyPanel(item: IDockItem, widget: Widget, after: boolean): void {
    // Remove the widget from its current parent.
    widget.parent = null;

    // Create and add the dock item for the widget.
    var tab = DockPanel.getTab(widget);
    this._items.push({ tab: tab, widget: widget, panel: item.panel });

    // Add the widget to the tab panel.
    var i = item.panel.childIndex(item.widget);
    item.panel.stack.addChild(widget);
    item.panel.tabs.insertTab(i + (+after), tab);
  }

  /**
   * Handle the `'mousemove'` event for the dock panel.
   *
   * This is triggered on the document during a tab move operation.
   */
  private _evtMouseMove(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    var dragData = this._dragData;
    if (!dragData) {
      return;
    }

    // Hit test the panels using the current mouse position.
    var clientX = event.clientX;
    var clientY = event.clientY;
    var hitPanel = iterTabPanels(this._root, panel => {
      return hitTest(panel.node, clientX, clientY) ? panel : void 0;
    });

    // If the last hit panel is not this hit panel, clear the overlay.
    if (dragData.lastHitPanel && dragData.lastHitPanel !== hitPanel) {
      dragData.lastHitPanel.hideOverlay();
    }

    // Clear the reference to the hit panel. It will be updated again
    // if the mouse is over a panel, but not over the panel's tab bar.
    dragData.lastHitPanel = null;

    // If the mouse is not over a tab panel, simply update the tab.
    var item = dragData.item;
    var tabStyle = item.tab.node.style;
    if (!hitPanel) {
      tabStyle.left = clientX + 'px';
      tabStyle.top = clientY + 'px';
      return;
    }

    // Handle the case where the mouse is not over a tab bar. This
    // saves a reference to the hit panel so that its overlay can be
    // hidden once the mouse leaves the panel, and shows the overlay
    // provided that the split target is not the current widget.
    if (!hitTest(hitPanel.tabs.node, clientX, clientY)) {
      dragData.lastHitPanel = hitPanel;
      if (hitPanel !== item.panel || hitPanel.tabs.tabCount > 0) {
        hitPanel.showOverlay(clientX, clientY);
      }
      tabStyle.left = clientX + 'px';
      tabStyle.top = clientY + 'px';
      return;
    }

    // Otherwise the mouse is positioned over a tab bar. Hide the
    // overlay before attaching the tab to the new tab bar.
    hitPanel.hideOverlay();

    // If the hit panel is not the current owner, the current hit
    // panel and tab are saved so that they can be restored later.
    if (hitPanel !== item.panel) {
      dragData.tempPanel = hitPanel;
      dragData.tempTab = hitPanel.tabs.selectedTab;
    }

    // Reset the tab style before attaching the tab to the tab bar.
    item.tab.removeClass(DOCKING_CLASS);
    tabStyle.top = '';
    tabStyle.left = '';

    // Attach the tab to the hit tab bar.
    hitPanel.tabs.attachTab(item.tab, clientX);

    // The tab bar takes over movement of the tab. The dock panel still
    // listens for the mouseup event in order to complete the move.
    document.removeEventListener('mousemove', this, true);
  }

  /**
   * Handle the 'mouseup' event for the dock panel.
   *
   * This is triggered on the document during a tab move operation.
   */
  private _evtMouseUp(event: MouseEvent): void {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    document.removeEventListener('mouseup', this, true);
    document.removeEventListener('mousemove', this, true);
    document.removeEventListener('contextmenu', this, true);
    var dragData = this._dragData;
    if (!dragData) {
      return;
    }
    this._dragData = null;

    // Restore the application cursor and hide the overlay.
    dragData.cursorGrab.dispose();
    if (dragData.lastHitPanel) {
      dragData.lastHitPanel.hideOverlay();
    }

    // Fetch common variables.
    var item = dragData.item;
    var ownPanel = item.panel;
    var ownBar = ownPanel.tabs;
    var ownCount = ownBar.tabCount;
    var itemTab = item.tab;

    // If the tab was being temporarily borrowed by another panel,
    // make that relationship permanent by moving the dock widget.
    // If the original owner panel becomes empty, it is removed.
    // Otherwise, its current index is updated to the next widget.
    // The ignoreRemoved flag is set during the widget swap since
    // the widget is not actually being removed from the panel.
    if (dragData.tempPanel) {
      this._ignoreRemoved = true;
      item.panel = dragData.tempPanel;
      item.panel.stack.addChild(item.widget);
      item.panel.stack.currentWidget = item.widget;
      this._ignoreRemoved = false;
      if (ownPanel.stack.childCount === 0) {
        this._removePanel(ownPanel);
      } else {
        var i = ownBar.tabIndex(dragData.prevTab);
        if (i === -1) i = Math.min(dragData.index, ownCount - 1);
        ownBar.selectedTab = ownBar.tabAt(i);
      }
      return;
    }

    // Snap the split mode before modifying the DOM with the tab insert.
    var mode = SplitMode.Invalid;
    var hitPanel = dragData.lastHitPanel;
    if (hitPanel && (hitPanel !== ownPanel || ownCount !== 0)) {
      mode = hitPanel.splitModeAt(event.clientX, event.clientY);
    }

    // If the mouse was not released over a panel, or if the hit panel
    // is the empty owner panel, restore the tab to its position.
    var tabStyle = itemTab.node.style;
    if (mode === SplitMode.Invalid) {
      if (ownBar.selectedTab !== itemTab) {
        itemTab.removeClass(DOCKING_CLASS);
        tabStyle.top = '';
        tabStyle.left = '';
        ownBar.insertTab(dragData.index, itemTab);
      }
      return;
    }

    // Remove the tab from the document body and reset its style.
    document.body.removeChild(itemTab.node);
    itemTab.removeClass(DOCKING_CLASS);
    tabStyle.top = '';
    tabStyle.left = '';

    // Split the target panel with the dock widget.
    var after = mode === SplitMode.Right || mode === SplitMode.Bottom;
    var horiz = mode === SplitMode.Left || mode === SplitMode.Right;
    var orientation = horiz ? Orientation.Horizontal : Orientation.Vertical;
    this._splitPanel(hitPanel, item.widget, orientation, after);
    var i = ownBar.tabIndex(dragData.prevTab);
    if (i === -1) i = Math.min(dragData.index, ownCount - 1);
    ownBar.selectedTab = ownBar.tabAt(i);
  }

  /**
   * Ensure the root split panel has the given orientation.
   */
  private _ensureRoot(orientation: Orientation): void {
    // This is a no-op if the root orientation is correct.
    if (this._root.orientation === orientation) {
      return;
    }

    // If the root has at most one child, update the orientation.
    if (this._root.childCount <= 1) {
      this._root.orientation = orientation;
      return;
    }

    // Otherwise, create a new root panel with the given orientation.
    // The existing root panel is added as a child of the new root.
    var panel = this._createSplitPanel(orientation);
    panel.addChild(this._root);
    this._root = panel;
    this.addChild(panel);
  }

  /**
   * Create a new dock tab panel and setup the signal handlers.
   */
  private _createTabPanel(): DockTabPanel {
    var panel = new DockTabPanel();
    panel.tabs.tabSelected.connect(this._onTabSelected, this);
    panel.tabs.tabCloseRequested.connect(this._onTabCloseRequested, this);
    panel.tabs.tabDetachRequested.connect(this._onTabDetachRequested, this);
    panel.stack.widgetRemoved.connect(this._onWidgetRemoved, this);
    return panel;
  }

  /**
   * Create a new dock split panel for the dock panel.
   */
  private _createSplitPanel(orientation: Orientation): DockSplitPanel {
    var panel = new DockSplitPanel();
    panel.orientation = orientation;
    panel.handleSize = this.handleSize;
    return panel;
  }

  /**
   * Remove an empty dock tab panel from the hierarchy.
   *
   * This ensures that the hierarchy is kept consistent by merging an
   * ancestor split panel when it contains only a single child widget.
   */
  private _removePanel(panel: DockTabPanel): void {
    // The parent of a tab panel is always a split panel.
    var splitPanel = panel.parent as DockSplitPanel;

    // Dispose the panel to ensure its resources are released.
    panel.dispose();

    // If the split panel still has multiple children after removing
    // the target panel, nothing else needs to be done.
    if (splitPanel.childCount > 1) {
      return;
    }

    // If the split panel is the root panel and has a remaining child
    // which is a split panel, that child becomes the root.
    if (splitPanel === this._root) {
      if (splitPanel.childCount === 1) {
        var child = splitPanel.childAt(0);
        if (child instanceof DockSplitPanel) {
          var sizes = child.sizes();
          splitPanel.parent = null;
          this._root = child;
          this.addChild(child);
          child.setSizes(sizes);
          splitPanel.dispose();
        }
      }
      return;
    }

    // Non-root split panels always have a split panel parent and are
    // always created with 2 children, so the split panel is guaranteed
    // to have a single child at this point. Also, split panels always
    // have an orthogonal orientation to their parent, so a grandparent
    // and a grandchild split panel will have the same orientation. This
    // means the children of the grandchild can be merged as children of
    // the grandparent.
    var gParent = splitPanel.parent as DockSplitPanel;
    var gSizes = gParent.sizes();
    var gChild = splitPanel.childAt(0);
    var index = gParent.childIndex(splitPanel);
    splitPanel.parent = null;
    if (gChild instanceof DockTabPanel) {
      gParent.insertChild(index, gChild);
    } else {
      var gcsp = gChild as DockSplitPanel;
      var gcspSizes = gcsp.sizes();
      var sizeShare = arrays.removeAt(gSizes, index);
      for (var i = 0; gcsp.childCount !== 0; ++i) {
        gParent.insertChild(index + i, gcsp.childAt(0));
        arrays.insert(gSizes, index + i, sizeShare * gcspSizes[i]);
      }
    }
    gParent.setSizes(gSizes);
    splitPanel.dispose();
  }

  /**
   * Abort the tab drag operation if one is in progress.
   */
  private _abortDrag(): void {
    var dragData = this._dragData;
    if (!dragData) {
      return;
    }
    this._dragData = null;

    // Release the mouse grab and restore the application cursor.
    document.removeEventListener('mouseup', this, true);
    document.removeEventListener('mousemove', this, true);
    document.removeEventListener('contextmenu', this, true);
    dragData.cursorGrab.dispose();

    // Hide the overlay for the last hit panel.
    if (dragData.lastHitPanel) {
      dragData.lastHitPanel.hideOverlay();
    }

    // If the tab is borrowed by another tab bar, remove it from
    // that tab bar and restore that tab bar's previous tab.
    if (dragData.tempPanel) {
      var tabs = dragData.tempPanel.tabs;
      tabs.removeTab(tabs.selectedTab);
      tabs.selectedTab = dragData.tempTab;
    }

    // Restore the tab to its original location in its owner panel.
    var item = dragData.item;
    var ownBar = item.panel.tabs;
    if (ownBar.selectedTab !== item.tab) {
      var tabStyle = item.tab.node.style;
      item.tab.removeClass(DOCKING_CLASS);
      tabStyle.top = '';
      tabStyle.left = '';
      ownBar.insertTab(dragData.index, item.tab);
    }
  }

  /**
   * Find the dock item which contains the given tab.
   *
   * Returns `undefined` if there is no matching item.
   */
  private _findItemByTab(tab: Tab): IDockItem {
    return arrays.find(this._items, item => item.tab === tab);
  }

  /**
   * Find the dock item which contains the given widget.
   *
   * Returns `undefined` if there is no matching item.
   */
  private _findItemByWidget(widget: Widget): IDockItem {
    return arrays.find(this._items, item => item.widget === widget);
  }

  /**
   * The change handler for the [[handleSizeProperty]].
   */
  private _onHandleSizeChanged(old: number, value: number): void {
    iterSplitPanels(this._root, panel => { panel.handleSize = value; });
  }

  /**
   * Handle the `tabSelected` signal from a tab bar.
   */
  private _onTabSelected(sender: TabBar, args: ITabIndexArgs): void {
    var item = this._findItemByTab(args.tab);
    if (item && item.panel.tabs === sender) {
      item.panel.stack.currentWidget = item.widget;
    }
  }

  /**
   * Handle the `tabCloseRequested` signal from a tab bar.
   */
  private _onTabCloseRequested(sender: TabBar, args: ITabIndexArgs): void {
    var item = this._findItemByTab(args.tab);
    if (item) item.widget.close();
  }

  /**
   * Handle the `tabDetachRequested` signal from the tab bar.
   */
  private _onTabDetachRequested(sender: TabBar, args: ITabDetachArgs): void {
    // Find the dock item for the detach operation.
    var item = this._findItemByTab(args.tab);
    if (!item) {
      return;
    }

    // Setup the initial drag data if it does not exist.
    if (!this._dragData) {
      this._dragData = {
        item: item,
        index: args.index,
        prevTab: sender.previousTab,
        lastHitPanel: null,
        cursorGrab: null,
        tempPanel: null,
        tempTab: null,
      };
    }

    // Grab the cursor for the drag operation.
    var dragData = this._dragData;
    dragData.cursorGrab = overrideCursor('default');

    // The tab being detached will have one of two states:
    //
    // 1) The tab is being detached from its owner tab bar. The current
    //    index is unset before detaching the tab so that the content
    //    widget does not change during the drag operation.
    //
    // 2) The tab is being detached from a tab bar which was borrowing
    //    the tab temporarily. Its previously selected tab is restored.
    if (item.panel.tabs === sender) {
      sender.selectedTab = null;
      sender.removeTabAt(args.index);
    } else {
      sender.removeTabAt(args.index);
      sender.selectedTab = dragData.tempTab;
    }

    // Clear the temp panel and tab
    dragData.tempPanel = null;
    dragData.tempTab = null;

    // Setup the style and position for the floating tab.
    var style = args.tab.node.style;
    style.zIndex = '';
    style.top = args.clientY + 'px';
    style.left = args.clientX + 'px';
    args.tab.addClass(DOCKING_CLASS);

    // Add the tab to the document body.
    document.body.appendChild(args.tab.node);

    // Attach the necessary mouse event listeners.
    document.addEventListener('mouseup', this, true);
    document.addEventListener('mousemove', this, true);
    document.addEventListener('contextmenu', this, true);
  }

  /**
   * Handle the `widgetRemoved` signal from a stacked widget.
   */
  private _onWidgetRemoved(sender: StackedPanel, args: IWidgetIndexArgs): void {
    if (this._ignoreRemoved) {
      return;
    }
    var item = this._findItemByWidget(args.widget);
    if (!item) {
      return;
    }
    this._abortDrag();
    arrays.remove(this._items, item);
    item.panel.tabs.removeTab(item.tab);
    if (item.panel.stack.childCount === 0) {
      this._removePanel(item.panel);
    }
  }

  private _root: DockSplitPanel;
  private _ignoreRemoved = false;
  private _items: IDockItem[] = [];
  private _dragData: IDragData = null;
}


/**
 * An item which holds data for a widget in a dock panel.
 */
interface IDockItem {
  /**
   * The widget tab at the time the widget was inserted.
   */
  tab: Tab;

  /**
   * The widget added to the dock panel.
   */
  widget: Widget;

  /**
   * The tab panel which owns the widget.
   */
  panel: DockTabPanel;
}


/**
 * An object which holds drag data for a dock panel.
 */
interface IDragData {
  /**
   * The item associated with the drag.
   */
  item: IDockItem;

  /**
   * The original index of the tab.
   */
  index: number;

  /**
   * The previous tab of the tab bar which owned the docking tab.
   */
  prevTab: Tab;

  /**
   * The cursor override disposable.
   */
  cursorGrab: IDisposable;

  /**
   * The most recent tab panel which was moused over.
   */
  lastHitPanel: DockTabPanel;

  /**
   * The tab panel which is temporarily borrowing the tab.
   */
  tempPanel: DockTabPanel;

  /**
   * The selected tab of the temp panel before borrowing.
   */
  tempTab: Tab;
}


/**
 * Iterate over the DockPanels starting with the given root split panel.
 *
 * Iteration stops when the callback returns anything but undefined.
 */
function iterTabPanels<T>(root: DockSplitPanel, cb: (panel: DockTabPanel) => T): T {
  for (var i = 0, n = root.childCount; i < n; ++i) {
    var result: T = void 0;
    var panel = root.childAt(i);
    if (panel instanceof DockTabPanel) {
      result = cb(panel);
    } else if (panel instanceof DockSplitPanel) {
      result = iterTabPanels(panel, cb);
    }
    if (result !== void 0) {
      return result;
    }
  }
  return void 0;
}


/**
 * Iterate over the DockSplitPanel starting with the given root panel.
 *
 * Iteration stops when the callback returns anything but `undefined`.
 */
function iterSplitPanels<T>(root: DockSplitPanel, cb: (panel: DockSplitPanel) => T): T {
  var result = cb(root);
  if (result !== void 0) {
    return result;
  }
  for (var i = 0, n = root.childCount; i < n; ++i) {
    var panel = root.childAt(i);
    if (panel instanceof DockSplitPanel) {
      result = iterSplitPanels(panel, cb);
      if (result !== void 0) {
        return result;
      }
    }
  }
  return void 0;
}


/**
 * Create the overlay node for a dock tab panel.
 */
function createOverlay(): HTMLElement {
  var overlay = document.createElement('div');
  overlay.className = OVERLAY_CLASS;
  overlay.style.display = 'none';
  return overlay;
}


/**
 * The split modes used to indicate a dock panel split direction.
 */
enum SplitMode { Top, Left, Right, Bottom, Invalid }


/**
 * A tabbed panel used by a DockPanel.
 *
 * This tab panel acts as a simple container for a tab bar and stacked
 * panel, plus a bit of logic to manage the docking overlay. The dock
 * panel manages the tab bar and stacked panel directly, as there is
 * not always a 1:1 association between a tab and panel.
 */
class DockTabPanel extends BoxPanel {
  /**
   * Construct a new dock tab panel.
   */
  constructor() {
    super();
    this.addClass(DOCK_TAB_PANEL_CLASS);

    this.direction = BoxPanel.TopToBottom;
    this.spacing = 0;

    BoxPanel.setStretch(this._tabs, 0);
    BoxPanel.setStretch(this._stack, 1);

    this.addChild(this._tabs);
    this.addChild(this._stack);

    this._overlay = createOverlay();
    this.node.appendChild(this._overlay);
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    this._clearOverlayTimer();
    this._tabs = null;
    this._stack = null;
    this._overlay = null;
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

  /**
   * Compute the split mode for the given client position.
   */
  splitModeAt(clientX: number, clientY: number): SplitMode {
    var rect = this.stack.node.getBoundingClientRect();
    var fracX = (clientX - rect.left) / rect.width;
    var fracY = (clientY - rect.top) / rect.height;
    if (fracX < 0.0 || fracX > 1.0 || fracY < 0.0 || fracY > 1.0) {
      return SplitMode.Invalid;
    }
    var mode: SplitMode;
    var normX = fracX > 0.5 ? 1 - fracX : fracX;
    var normY = fracY > 0.5 ? 1 - fracY : fracY;
    if (normX < normY) {
      mode = fracX <= 0.5 ? SplitMode.Left : SplitMode.Right;
    } else {
      mode = fracY <= 0.5 ? SplitMode.Top : SplitMode.Bottom;
    }
    return mode;
  }

  /**
   * Show the dock overlay for the given client position.
   *
   * If the overlay is already visible, it will be adjusted.
   */
  showOverlay(clientX: number, clientY: number): void {
    this._clearOverlayTimer();
    var rect = this.node.getBoundingClientRect();
    var box = this.boxSizing;
    var top = box.paddingTop;
    var left = box.paddingLeft;
    var right = box.paddingRight;
    var bottom = box.paddingBottom;
    switch (this.splitModeAt(clientX, clientY)) {
    case SplitMode.Left:
      right = rect.width / 2;
      break;
    case SplitMode.Right:
      left = rect.width / 2;
      break;
    case SplitMode.Top:
      bottom = rect.height / 2;
      break;
    case SplitMode.Bottom:
      top = rect.height / 2;
      break;
    }
    // The first time the overlay is made visible, it is positioned at
    // the cursor with zero size before being displayed. This allows
    // for a nice transition to the normally computed size. Since the
    // elements starts with display: none, a restyle must be forced.
    var style = this._overlay.style;
    if (this._overlayHidden) {
      this._overlayHidden = false;
      style.top = clientY - rect.top + 'px';
      style.left = clientX - rect.left + 'px';
      style.right = rect.right - clientX + 'px';
      style.bottom = rect.bottom - clientY + 'px';
      style.display = '';
      this._overlay.offsetWidth; // force layout
    }
    style.opacity = '1';
    style.top = top + 'px';
    style.left = left + 'px';
    style.right = right + 'px';
    style.bottom = bottom + 'px';
  }

  /**
   * Hide the dock overlay.
   *
   * If the overlay is already hidden, this is a no-op.
   */
  hideOverlay(): void {
    if (this._overlayHidden) {
      return;
    }
    this._clearOverlayTimer();
    this._overlayHidden = true;
    this._overlay.style.opacity = '0';
    this._overlayTimer = setTimeout(() => {
      this._overlayTimer = 0;
      this._overlay.style.display = 'none';
    }, 150);
  }

  /**
   * Clear the overlay timer.
   */
  private _clearOverlayTimer(): void {
    if (this._overlayTimer) {
      clearTimeout(this._overlayTimer);
      this._overlayTimer = 0;
    }
  }

  private _overlayTimer = 0;
  private _overlayHidden = true;
  private _overlay: HTMLElement;
  private _tabs = new TabBar();
  private _stack = new StackedPanel();
}


/**
 * A split panel used by a DockPanel.
 *
 * This class serves to differentiate a split panel used by a
 * dock panel from user provided split panel content widgets.
 */
class DockSplitPanel extends SplitPanel {
  /**
   * Construct a new dock split panel.
   */
  constructor() {
    super();
    this.addClass(DOCK_SPLIT_PANEL_CLASS);
  }
}

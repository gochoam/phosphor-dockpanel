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
  overrideCursor
} from 'phosphor-domutil';

import {
  Property
} from 'phosphor-properties';

import {
  Orientation
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

import {
  DockPanelOverlay
} from './dockpaneloverlay';

import {
  DockSplitPanel
} from './docksplitpanel';

import {
  DockTabPanel
} from './docktabpanel';

import {
  DropZone, findDropTarget
} from './hittesting';


/**
 * The class name added to DockPanel instances.
 */
var DOCK_PANEL_CLASS = 'p-DockPanel';

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
    this.node.appendChild(this._overlay.node);
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
      this._evtContextMenu(event as MouseEvent);
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

    // Insert the widget and set the sizes it occupies 1/3 the space.
    var sizes = this._root.sizes();
    arrays.insert(sizes, after ? sizes.length : 0, 0.5);
    this._root.insertChild(after ? this._root.childCount : 0, panel);
    this._root.setSizes(sizes);
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
    var i = item.panel.tabs.tabIndex(item.tab);
    item.panel.stack.addChild(widget);
    item.panel.tabs.insertTab(i + (+after), tab);
  }

  /**
   * Handle the `'mousemove'` event for the dock panel.
   *
   * This is triggered on the document during a tab move operation.
   */
  private _evtMouseMove(event: MouseEvent): void {
    // Kill the event and bail if the drag data is not setup.
    event.preventDefault();
    event.stopPropagation();
    var dragData = this._dragData;
    if (!dragData) {
      return;
    }

    // Show the dock overlay for the given client position. The overlay
    // will be hidden if the position is not over a valid docking zone.
    this._showOverlay(event.clientX, event.clientY);

    // Unconditionally update the position of the tab. The CSS for the
    // tab includes a transform which provides a nice relative offset.
    var style = dragData.item.tab.node.style;
    style.top = event.clientY + 'px';
    style.left = event.clientX + 'px';
  }

  /**
   * Handle the 'mouseup' event for the dock panel.
   *
   * This is triggered on the document during a tab move operation.
   */
  private _evtMouseUp(event: MouseEvent): void {
    // Bail if the left mouse button is not released.
    if (event.button !== 0) {
      return;
    }

    // Kill the event and remove the mouse listeners.
    event.preventDefault();
    event.stopPropagation();
    document.removeEventListener('mouseup', this, true);
    document.removeEventListener('mousemove', this, true);
    document.removeEventListener('contextmenu', this, true);

    // Clear the drag data or bail if it wasn't setup.
    var dragData = this._dragData;
    if (!dragData) {
      return;
    }
    this._dragData = null;

    // Fetch common variables.
    var item = dragData.item;
    var ownPanel = item.panel;
    var ownBar = ownPanel.tabs;
    var ownCount = ownBar.tabCount;
    var itemTab = item.tab;

    // Restore the application cursor and hide the overlay.
    dragData.cursorGrab.dispose();
    this._overlay.hide();

    // Remove the tab from the document and reset its state.
    var tabStyle = itemTab.node.style;
    document.body.removeChild(itemTab.node);
    itemTab.removeClass(DOCKING_CLASS);
    tabStyle.top = '';
    tabStyle.left = '';

    // Find the drop target for the given client position.
    var data = findDropTarget(this._root, event.clientX, event.clientY);

    // If the drop zone is invalid, restore the tab and bail.
    if (data.zone === DropZone.Invalid) {
      ownBar.insertTab(dragData.index, itemTab);
      return;
    }

    // Restore the tab if the drop zone is the same tab group.
    if (data.panel === ownPanel && data.zone === DropZone.PanelCenter) {
      ownBar.insertTab(dragData.index, itemTab);
      return;
    }

    // Restore the tab if the drop zone has no effective change.
    if (data.panel === ownPanel && ownCount === 0) {
      ownBar.insertTab(dragData.index, itemTab);
      return;
    }

    // Dock the panel according to the indicated zone.
    switch (data.zone) {
    case DropZone.BorderTop:
      this._addPanel(item.widget, Orientation.Vertical, false);
      break;
    case DropZone.BorderLeft:
      this._addPanel(item.widget, Orientation.Horizontal, false);
      break;
    case DropZone.BorderRight:
      this._addPanel(item.widget, Orientation.Horizontal, true);
      break;
    case DropZone.BorderBottom:
      this._addPanel(item.widget, Orientation.Vertical, true);
      break;
    case DropZone.PanelTop:
      this._splitPanel(data.panel, item.widget, Orientation.Vertical, false);
      break;
    case DropZone.PanelLeft:
      this._splitPanel(data.panel, item.widget, Orientation.Horizontal, false);
      break;
    case DropZone.PanelRight:
      this._splitPanel(data.panel, item.widget, Orientation.Horizontal, true);
      break;
    case DropZone.PanelBottom:
      this._splitPanel(data.panel, item.widget, Orientation.Vertical, true);
      break;
    case DropZone.PanelCenter:
      var ref = data.panel.tabs.tabAt(data.panel.tabs.tabCount - 1);
      var other = this._findItemByTab(ref);
      this._tabifyPanel(other, item.widget, true);
      data.panel.tabs.selectedTab = itemTab;
      break;
    }

    // Restore the previous tab for the old tab bar.
    var i = ownBar.tabIndex(dragData.prevTab);
    if (i === -1) i = ownBar.tabCount - 1;
    ownBar.selectedTab = ownBar.tabAt(i);
  }

  /**
   * Handle the `'contextmenu'` event for the dock panel.
   */
  private _evtContextMenu(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
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

    // Hide the drop zone overlay.
    this._overlay.hide();

    // Restore the tab to its original location in its owner panel.
    var item = dragData.item;
    var tabStyle = item.tab.node.style;
    item.tab.removeClass(DOCKING_CLASS);
    tabStyle.top = '';
    tabStyle.left = '';
    item.panel.tabs.insertTab(dragData.index, item.tab);
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
   * Show the dock panel overlay indicator at the given client position.
   *
   * If the position is not over a dock zone, the overlay is hidden.
   */
  private _showOverlay(clientX: number, clientY: number): void {
    // Find the drop target for the given client position.
    var data = findDropTarget(this._root, clientX, clientY);

    // If the drop zone is invalid, hide the overlay and bail.
    if (data.zone === DropZone.Invalid) {
      this._overlay.hide();
      return;
    }

    // Setup the variables needed to compute the overlay geometry.
    var top: number;
    var left: number;
    var width: number;
    var height: number;
    var box = this.boxSizing;
    var rect = this.node.getBoundingClientRect();

    // Compute the overlay geometry based on the drop zone.
    switch (data.zone) {
    case DropZone.BorderTop:
      top = box.paddingTop;
      left = box.paddingLeft;
      width = rect.width - box.horizontalSum;
      height = (rect.height - box.verticalSum) / 3;
      break;
    case DropZone.BorderLeft:
      top = box.paddingTop;
      left = box.paddingLeft;
      width = (rect.width - box.horizontalSum) / 3;
      height = rect.height - box.verticalSum;
      break;
    case DropZone.BorderRight:
      top = box.paddingTop;
      width = (rect.width - box.horizontalSum) / 3;
      left = box.paddingLeft + 2 * width;
      height = rect.height - box.verticalSum;
      break;
    case DropZone.BorderBottom:
      height = (rect.height - box.verticalSum) / 3;
      top = box.paddingTop + 2 * height;
      left = box.paddingLeft;
      width = rect.width - box.horizontalSum;
      break;
    case DropZone.PanelTop:
      var pr = data.panel.node.getBoundingClientRect();
      top = pr.top - rect.top - box.borderTop;
      left = pr.left - rect.left - box.borderLeft;
      width = pr.width;
      height = pr.height / 2;
      break;
    case DropZone.PanelLeft:
      var pr = data.panel.node.getBoundingClientRect();
      top = pr.top - rect.top - box.borderTop;
      left = pr.left - rect.left - box.borderLeft;
      width = pr.width / 2;
      height = pr.height;
      break;
    case DropZone.PanelRight:
      var pr = data.panel.node.getBoundingClientRect();
      top = pr.top - rect.top - box.borderTop;
      left = pr.left - rect.left - box.borderLeft + pr.width / 2;
      width = pr.width / 2;
      height = pr.height;
      break;
    case DropZone.PanelBottom:
      var pr = data.panel.node.getBoundingClientRect();
      top = pr.top - rect.top - box.borderTop + pr.height / 2;
      left = pr.left - rect.left - box.borderLeft;
      width = pr.width;
      height = pr.height / 2;
      break;
    case DropZone.PanelCenter:
      var pr = data.panel.node.getBoundingClientRect();
      top = pr.top - rect.top - box.borderTop;
      left = pr.left - rect.left - box.borderLeft;
      width = pr.width;
      height = pr.height;
      break;
    }

    // Show the overlay at the computed zone position.
    this._overlay.show(left, top, width, height);
  }

  /**
   * The change handler for the [[handleSizeProperty]].
   */
  private _onHandleSizeChanged(old: number, value: number): void {
    this._root.setHandleSizeRecursive(value);
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
    // Find the dock item for the detach or bail if not found.
    var item = this._findItemByTab(args.tab);
    if (!item) {
      return;
    }

    // Setup the drag data object.
    this._dragData = {
      item: item,
      index: args.index,
      prevTab: sender.previousTab,
      cursorGrab: overrideCursor('default'),
    };

    // Unset the tab before detaching so that the content widget does
    // not change during the drag operation.
    sender.selectedTab = null;
    sender.removeTabAt(args.index);

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
  private _items: IDockItem[] = [];
  private _dragData: IDragData = null;
  private _overlay = new DockPanelOverlay();
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
}

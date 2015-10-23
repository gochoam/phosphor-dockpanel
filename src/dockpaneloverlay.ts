/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2015, PhosphorJS Contributors
|
| Distributed under the terms of the BSD 3-Clause License.
|
| The full license is in the file LICENSE, distributed with this software.
|----------------------------------------------------------------------------*/
'use strict';

import {
  NodeWrapper
} from 'phosphor-nodewrapper';


/**
 * The class name added to dock panel overlays.
 */
var OVERLAY_CLASS = 'p-DockPanelOverlay';

/**
 * The class name added to hidden overlays.
 */
var HIDDEN_CLASS = 'p-mod-hidden';


/**
 * A node wrapper used as an overlay dock indicator for a dock panel.
 *
 * This class is not part of the public Phosphor API and can be changed
 * or removed at any time. We mean it!
 */
export
class DockPanelOverlay extends NodeWrapper {
  /**
   * Construct a new dock panel overlay.
   */
  constructor() {
    super();
    this.addClass(OVERLAY_CLASS);
    this.addClass(HIDDEN_CLASS);
  }

  /**
   * Show the overlay using the given absolute geometry.
   */
  show(left: number, top: number, width: number, height: number): void {
    var style = this.node.style;
    style.top = top + 'px';
    style.left = left + 'px';
    style.width = width + 'px';
    style.height = height + 'px';
    this.removeClass(HIDDEN_CLASS);
  }

  /**
   * Hide the overlay.
   */
  hide(): void {
    this.addClass(HIDDEN_CLASS);
  }
}

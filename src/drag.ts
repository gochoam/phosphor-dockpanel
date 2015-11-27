/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2015, PhosphorJS Contributors
|
| Distributed under the terms of the BSD 3-Clause License.
|
| The full license is in the file LICENSE, distributed with this software.
|----------------------------------------------------------------------------*/
'use strict';

import {
  IDisposable
} from 'phosphor-disposable';

import {
  overrideCursor
} from 'phosphor-domutil';


/**
 * The class name added to drag image nodes.
 */
const DRAG_IMAGE_CLASS = 'p-mod-drag-image';


/**
 * An enum which defines the possible independent drop actions.
 */
export
enum DropAction {
  /**
   * No item may be dropped.
   */
  None = 0,

  /**
   * The item is copied into its new location.
   */
  Copy = 0x1,

  /**
   * The item is linked to its new location.
   */
  Link = 0x2,

  /**
   * The item is moved to its new location.
   */
  Move = 0x4,
}


/**
 * An enum which defines the combinations of possible drop actions.
 */
export
enum DropActions {
  /**
   * No drop action is supported.
   */
  None = DropAction.None,

  /**
   * The item may be copied to its new location.
   */
  Copy = DropAction.Copy,

  /**
   * The item may be linked to its new location.
   */
  Link = DropAction.Link,

  /**
   * The item may be moved to its new location.
   */
  Move = DropAction.Move,

  /**
   * The item may be copied or linked to its new location.
   */
  CopyLink = DropAction.Copy | DropAction.Link,

  /**
   * The item may be copied or moved to its new location.
   */
  CopyMove = DropAction.Copy | DropAction.Move,

  /**
   * The item may be linked or moved to its new location.
   */
  LinkMove = DropAction.Link | DropAction.Move,

  /**
   * The item may be copied, linked, or moved to its new location.
   */
  All = DropAction.Copy | DropAction.Link | DropAction.Move,
}


/**
 * A custom event type used for drag-drop operations.
 *
 * #### Notes
 * In order to receive `'p-dragover'`, `'p-dragleave'`, or `'p-drop'`
 * events, a drop target must cancel the `'p-dragenter'` event by
 * calling the event's `preventDefault` method.
 */
export
interface IDragEvent extends MouseEvent {
  /**
   * The mime data associated with the event.
   *
   * #### Notes
   * This property should be considered read-only, but for performance
   * reasons this is not enforced.
   */
  mimeData: MimeData;

  /**
   * The drop action supported or taken by the drop target.
   *
   * #### Notes
   * At the start of each event, this value will be `DropAction.None`.
   * During a `'p-dragover'` event, the drop target must set this value
   * to one of the supported actions, or the drop event will not occur.
   *
   * When handling the drop event, the drop target should set this
   * to the action which was *actually* taken. This value will be
   * reported back to the drag initiator.
   */
  dropAction: DropAction;

  /**
   * The drop action proposed by the drag initiator.
   *
   * #### Notes
   * This is the action which is *preferred* by the drag initiator. The
   * drop target is not required to perform this action, but should if
   * it all possible.
   *
   * This property should be considered read-only, but for performance
   * reasons this is not enforced.
   */
  proposedAction: DropAction;

  /**
   * The drop actions supported by the drag initiator.
   *
   * #### Notes
   * If the `dropAction` is not set to one of the supported options
   * during the `'p-dragover'` event, the drop event will no occur.
   *
   * This property should be considered read-only, but for performance
   * reasons this is not enforced.
   */
  supportedActions: DropActions;

  /**
   * The source object of the drag, as provided by the drag initiator.
   *
   * #### Notes
   * For advanced applications, the drag initiator may wish to expose
   * a source object to the drop targets. That will be provided here
   * if given by the drag initiator, otherwise it will be `null`.
   *
   * This property should be considered read-only, but for performance
   * reasons this is not enforced.
   */
  source: any;
}


/**
 * An object which stores MIME data for drag-drop operations.
 *
 * #### Notes
 * This class does not attempt to enforce "correctness" of MIME types
 * and their associated data. Since this drag-drop system is designed
 * to transfer arbitrary data and objects within the same application,
 * it assumes that the user provides correct and accurate data.
 */
export
class MimeData {
  /**
   * Get an array of the MIME types contains within the dataset.
   *
   * @returns A new array of the MIME types, in order of insertion.
   */
  types(): string[] {
    return this._types.slice();
  }

  /**
   * Test whether the dataset has an entry for the given type.
   *
   * @param mime - The MIME type of interest.
   *
   * @returns `true` if the dataset contains a value for the given
   *   MIME type, `false` otherwise.
   */
  hasData(mime: string): boolean {
    return this._types.indexOf(mime) !== -1;
  }

  /**
   * Get the data value for the given MIME type.
   *
   * @param mime - The MIME type of interest.
   *
   * @returns The value for the given MIME type, or `undefined` if
   *   the dataset does not contain a value for the type.
   */
  getData(mime: string): any {
    let i = this._types.indexOf(mime);
    return i !== -1 ? this._values[i] : void 0;
  }

  /**
   * Set the data value for the given MIME type.
   *
   * @param mime - The MIME type of interest.
   *
   * @param data - The data value for the given MIME type.
   *
   * #### Notes
   * This will overwrite any previous entry for the MIME type.
   */
  setData(mime: string, data: any): void {
    this.clearData(mime);
    this._types.push(mime);
    this._values.push(data);
  }

  /**
   * Remove the data entry for the given MIME type.
   *
   * @param mime - The MIME type of interest.
   *
   * #### Notes
   * This is a no-op if there is no entry for the given MIME type.
   */
  clearData(mime: string): void {
    let i = this._types.indexOf(mime);
    if (i === -1) return;
    this._types.splice(i, 1);
    this._values.splice(i, 1);
  }

  /**
   * Remove all data entries from the dataset.
   */
  clear(): void {
    this._types.length = 0;
    this._values.length = 0;
  }

  private _types: string[] = [];
  private _values: any[] = [];
}


/**
 * An options object for initializing a `Drag` object.
 */
export
interface IDragOptions {
  /**
   * The populated mime data for the drag operation.
   *
   * #### Notes
   * This must be provided and should not be `null`.
   */
  mimeData: MimeData;

  /**
   * An optional drag image which follows the mouse cursor.
   *
   * #### Notes
   * The drag image can be any DOM element. It is not limited to
   * image or canvas elements as with the native drag-drop APIs.
   *
   * If provided, this will be positioned at the mouse cursor on each
   * mouse move event. A CSS transform can be used to offset the node
   * from its specified position.
   *
   * The drag image will automatically have the `p-mod-drag-image`
   * class name added.
   *
   * The default value is `null`.
   */
  dragImage?: HTMLElement;

  /**
   * The optional proposed drop action for the drag operation.
   *
   * #### Notes
   * This can be provided as a hint to the drop targets as to which
   * drop action is preferred.
   *
   * The default value is `DropAction.Copy`.
   */
  proposedAction?: DropAction;

  /**
   * The drop actions supported by the drag initiator.
   *
   * #### Notes
   * A drop target must indicate that it intends to perform one of the
   * supported actions in order to receive a drop event. However, it is
   * not required to *actually* perform that action when handling the
   * drop event. Therefore, the initiator must be prepared to handle
   * any drop action performed by a drop target.
   *
   * The default value is `DropActions.Copy`.
   */
  supportedActions?: DropActions;

  /**
   * An optional object which indicates the source of the drag.
   *
   * #### Notes
   * For advanced applications, the drag initiator may wish to expose
   * a source object to the drop targets. That object can be specified
   * here and will be carried along with the drag events.
   *
   * The default value is `null`.
   */
  source?: any;
}


/**
 * An object which manages a drag-drop operation.
 *
 * A drag object dispatches four different events to drop targets:
 *
 * - `'p-dragenter'` - Dispatched when the mouse enters the target
 *   element. This event must be canceled in order to receive any
 *   of the other events.
 *
 * - `'p-dragover'` - Dispatched when the mouse moves over the drop
 *   target. It must cancel the event and set the `dropAction` to one
 *   of the supported actions in order to receive drop events.
 *
 * - `'p-dragleave'` - Dispatched when the mouse leaves the target
 *   element. This includes moving the mouse into child elements.
 *
 * - `'p-drop'`- Dispatched when the mouse is released over the target
 *   element when the target indicates an appropriate drop action. If
 *   the event is canceled, the indicated drop action is returned to
 *   the initiator through the resolved promise.
 *
 * A drag operation can be canceled at any time by pressing `Escape`
 * or by disposing the drag object.
 *
 * #### Notes
 * This class is designed to be used when dragging and dropping custom
 * data *within* a single application. It is *not* a replacement for
 * the native drag-drop API. Instead, it provides an API which allows
 * drag operations to be initiated programmatically and enables the
 * transfer of arbitrary non-string objects; two features which are
 * not possible with the native drag-drop APIs.
 */
export
class Drag implements IDisposable {
  /**
   * Construct a new drag object.
   *
   * @param options - The options for initializing the drag.
   */
  constructor(options: IDragOptions) {
    this._mimeData = options.mimeData;
    if (options.dragImage !== void 0) {
      this._dragImage = options.dragImage;
    }
    if (options.proposedAction !== void 0) {
      this._proposedAction = options.proposedAction;
    }
    if (options.supportedActions !== void 0) {
      this._supportedActions = options.supportedActions;
    }
    if (options.source !== void 0) {
      this._source = options.source;
    }
  }

  /**
   * Dispose of the resources held by the drag object.
   *
   * #### Notes
   * This will cancel the drag operation if it is active.
   *
   * All calls made after the first call to this method are a no-op.
   */
  dispose(): void {
    // Do nothing if the drag object is already disposed.
    if (this._disposed) {
      return;
    }
    this._disposed = true;

    // If there is a current target, dispatch a drag leave event.
    if (this._currentTarget) {
      let event = createMouseEvent('mouseup', -1, -1);
      dispatchDragLeave(this, this._currentTarget, null, event);
    }

    // Finalize the drag object with `None`.
    this._finalize(DropAction.None);
  }

  /**
   * Test whether the drag object is disposed.
   *
   * #### Notes
   * This is a read-only property.
   */
  get isDisposed(): boolean {
    return this._disposed;
  }

  /**
   * Get the mime data for the drag object.
   *
   * #### Notes
   * This is a read-only property.
   */
  get mimeData(): MimeData {
    return this._mimeData;
  }

  /**
   * Get the drag image element for the drag object.
   *
   * #### Notes
   * This is a read-only property.
   */
  get dragImage(): HTMLElement {
    return this._dragImage;
  }

  /**
   * Get the proposed drop action for the drag object.
   *
   * #### Notes
   * This is a read-only property.
   */
  get proposedAction(): DropAction {
    return this._proposedAction;
  }

  /**
   * Get the supported drop actions for the drag object.
   *
   * #### Notes
   * This is a read-only property.
   */
  get supportedActions(): DropActions {
    return this._supportedActions;
  }

  /**
   * Get the drag source for the drag object.
   *
   * #### Notes
   * This is a read-only property.
   */
  get source(): any {
    return this._source;
  }

  /**
   * Start the drag operation at the specified client position.
   *
   * @param clientX - The client X position for the drag start.
   *
   * @param clientY - The client Y position for the drag start.
   *
   * @returns A promise which resolves to the result of the drag.
   *
   * #### Notes
   * If the drag has already been started, the promise created by the
   * first call to `start` is returned.
   *
   * If the drag operation has ended, or if the drag object has been
   * disposed, the returned promise will resolve to `DropAction.None`.
   *
   * The drag object will be automatically disposed when drag operation
   * completes. This makes `Drag` objects suitable for single use only.
   *
   * This method assumes the left mouse button is already held down.
   */
  start(clientX: number, clientY: number): Promise<DropAction> {
    // If the drag object is already disposed, resolve to `None`.
    if (this._disposed) {
      return Promise.resolve(DropAction.None);
    }

    // If the drag has already been started, return the promise.
    if (this._promise) {
      return this._promise;
    }

    // Install the document listeners for the drag object.
    this._addListeners();

    // Attach the drag image at the specified client position.
    this._attachDragImage(clientX, clientY);

    // Create the promise which will be resolved on completion.
    this._promise = new Promise<DropAction>((resolve, reject) => {
      this._resolve = resolve;
    });

    // Trigger a fake move event to kick off the drag operation.
    let event = createMouseEvent('mousemove', clientX, clientY);
    document.dispatchEvent(event);

    // Return the pending promise for the drag operation.
    return this._promise;
  }

  /**
   * Handle the DOM events for the drag operation.
   *
   * @param event - The DOM event sent to the drag object.
   *
   * #### Notes
   * This method implements the DOM `EventListener` interface and is
   * called in response to events on the document. It should not be
   * called directly by user code.
   */
  handleEvent(event: Event): void {
    switch(event.type) {
    case 'mousemove':
      this._evtMouseMove(event as MouseEvent);
      break;
    case 'mouseup':
      this._evtMouseUp(event as MouseEvent);
      break;
    case 'keydown':
      this._evtKeyDown(event as KeyboardEvent);
      break;
    case 'keyup':
    case 'keypress':
    case 'mousedown':
    case 'contextmenu':
      // Stop all input events during drag-drop.
      event.preventDefault();
      event.stopPropagation();
      break;
    }
  }

  /**
   * Handle the `'mousemove'` event for the drag object.
   */
  private _evtMouseMove(event: MouseEvent): void {
    // Stop all input events during drag-drop.
    event.preventDefault();
    event.stopPropagation();

    // Store the previous target as a local variable.
    let prevTarget = this._currentTarget;

     // Store the current target as a local variable.
    let currTarget = this._currentTarget;

    // Store the previous indicated element as a local variable.
    let prevElem = this._currentElement;

    // Find the current indicated element at the given position.
    let currElem = document.elementFromPoint(event.clientX, event.clientY);

    // Update the current element reference.
    this._currentElement = currElem;

    // Move the drag image to the specified client position. This is
    // performed *after* hit testing to prevent an unnecessary reflow.
    this._moveDragImage(event.clientX, event.clientY);

    // Note: drag enter fires *before* drag leave according to spec.
    // https://html.spec.whatwg.org/multipage/interaction.html#drag-and-drop-processing-model

    // If the indicated element changes from the previous iteration,
    // and is different from the current target, dispatch the enter
    // events and compute the new target element.
    if (currElem !== prevElem && currElem !== currTarget) {
      currTarget = dispatchDragEnter(this, currElem, currTarget, event);
    }

    // If the current target element has changed, update the current
    // target reference and dispatch the leave event to the old target.
    if (currTarget !== prevTarget) {
      this._currentTarget = currTarget;
      dispatchDragLeave(this, prevTarget, currTarget, event);
    }

    // Dispatch the drag over event and update the drop action.
    let action = dispatchDragOver(this, currTarget, event);
    this._setDropAction(action);
  }

  /**
   * Handle the `'mouseup'` event for the drag object.
   */
  private _evtMouseUp(event: MouseEvent): void {
    // Stop all input events during drag-drop.
    event.preventDefault();
    event.stopPropagation();

    // Do nothing if the left button is not released.
    if (event.button !== 0) {
      return;
    }

    // If there is no current target, finalize with `None`.
    if (!this._currentTarget) {
      this._finalize(DropAction.None);
      return;
    }

    // If the last drop action was `None`, dispatch a leave event
    // to the current target and finalize the drag with `None`.
    if (this._dropAction === DropAction.None) {
      dispatchDragLeave(this, this._currentTarget, null, event);
      this._finalize(DropAction.None);
      return;
    }

    // Dispatch the drop event at the current target and finalize
    // with the resulting drop action.
    let action = dispatchDrop(this, this._currentTarget, event);
    this._finalize(action);
  }

  /**
   * Handle the `'keydown'` event for the drag object.
   */
  private _evtKeyDown(event: KeyboardEvent): void {
    // Stop all input events during drag-drop.
    event.preventDefault();
    event.stopPropagation();

    // Cancel the drag if `Escape` is pressed.
    if (event.keyCode === 27) this.dispose();
  }

  /**
   * Add the document event listeners for the drag object.
   */
  private _addListeners(): void {
    document.addEventListener('mousedown', this, true);
    document.addEventListener('mousemove', this, true);
    document.addEventListener('mouseup', this, true);
    document.addEventListener('keydown', this, true);
    document.addEventListener('keyup', this, true);
    document.addEventListener('keypress', this, true);
    document.addEventListener('contextmenu', this, true);
  }

  /**
   * Remove the document event listeners for the drag object.
   */
  private _removeListeners(): void {
    document.removeEventListener('mousedown', this, true);
    document.removeEventListener('mousemove', this, true);
    document.removeEventListener('mouseup', this, true);
    document.removeEventListener('keydown', this, true);
    document.removeEventListener('keyup', this, true);
    document.removeEventListener('keypress', this, true);
    document.removeEventListener('contextmenu', this, true);
  }

  /**
   * Attach the drag image element at the specified location.
   *
   * This is a no-op if there is no drag image element.
   */
  private _attachDragImage(clientX: number, clientY: number): void {
    if (!this._dragImage) {
      return;
    }
    this._dragImage.classList.add(DRAG_IMAGE_CLASS);
    let style = this._dragImage.style;
    style.pointerEvents = 'none';
    style.position = 'absolute';
    style.top = `${clientY}px`;
    style.left = `${clientX}px`;
    document.body.appendChild(this._dragImage);
  }

  /**
   * Move the drag image element to the specified location.
   *
   * This is a no-op if there is no drag image element.
   */
  private _moveDragImage(clientX: number, clientY: number): void {
    if (!this._dragImage) {
      return;
    }
    let style = this._dragImage.style;
    style.top = `${clientY}px`;
    style.left = `${clientX}px`;
  }

  /**
   * Detach the drag image element from the DOM.
   *
   * This is a no-op if there is no drag image element.
   */
  private _detachDragImage(): void {
    if (!this._dragImage) {
      return;
    }
    let parent = this._dragImage.parentNode;
    if (!parent) {
      return;
    }
    parent.removeChild(this._dragImage);
  }

  /**
   * Set the internal drop action state and update the drag cursor.
   */
  private _setDropAction(action: DropAction): void {
    if ((action & this._supportedActions) === 0) {
      action = DropAction.None;
    }
    if (this._override && this._dropAction === action) {
      return;
    }
    switch (action) {
    case DropAction.None:
      this._dropAction = action;
      this._override = overrideCursor('no-drop');
      break;
    case DropAction.Copy:
      this._dropAction = action;
      this._override = overrideCursor('copy');
      break;
    case DropAction.Link:
      this._dropAction = action;
      this._override = overrideCursor('alias');
      break;
    case DropAction.Move:
      this._dropAction = action;
      this._override = overrideCursor('move');
      break;
    }
  }

  /**
   * Finalize the drag operation and resolve the drag promise.
   */
  private _finalize(action: DropAction): void {
    // Store the resolve function as a temp variable.
    let resolve = this._resolve;

    // Remove the document event listeners.
    this._removeListeners();

    // Detach the drag image.
    this._detachDragImage();

    // Dispose of the cursor override.
    if (this._override) this._override.dispose();

    // Clear the mime data.
    if (this._mimeData) this._mimeData.clear();

    // Clear the internal drag state.
    this._disposed = true;
    this._source = null;
    this._mimeData = null;
    this._dragImage = null;
    this._dropAction = DropAction.None;
    this._proposedAction = DropAction.None;
    this._supportedActions = DropActions.None;
    this._override = null;
    this._currentTarget = null;
    this._currentElement = null;
    this._promise = null;
    this._resolve = null;

    // Resolve the promise to the given drop action, if possible.
    if (resolve) resolve(action);
  }

  private _disposed = false;
  private _source: any = null;
  private _mimeData: MimeData = null;
  private _dragImage: HTMLElement = null;
  private _dropAction = DropAction.None;
  private _proposedAction = DropAction.Copy;
  private _supportedActions = DropActions.Copy;
  private _override: IDisposable = null;
  private _currentTarget: Element = null;
  private _currentElement: Element = null;
  private _promise: Promise<DropAction> = null;
  private _resolve: (value: DropAction) => void = null;
}


/**
 * Create a left mouse event at the given position.
 *
 * @param type - The event type for the mouse event.
 *
 * @param clientX - The client X position.
 *
 * @param clientY - The client Y position.
 *
 * @returns A newly created and initialized mouse event.
 */
function createMouseEvent(type: string, clientX: number, clientY: number): MouseEvent {
  let event = document.createEvent('MouseEvent');
  event.initMouseEvent(type, true, true, window, 0, 0, 0,
    clientX, clientY, false, false, false, false, 0, null);
  return event;
}


/**
 * Create a new initialized `IDragEvent` from the given data.
 *
 * @param type - The event type for the drag event.
 *
 * @param drag - The drag object to use for seeding the drag data.
 *
 * @param event - The mouse event to use for seeding the mouse data.
 *
 * @param related - The related target for the event, or `null`.
 *
 * @returns A new object which implements `IDragEvent`.
 */
function createDragEvent(type: string, drag: Drag, event: MouseEvent, related: Element): IDragEvent {
  // Create a new mouse event and cast to a custom drag event.
  let dragEvent = document.createEvent('MouseEvent') as IDragEvent;

  // Initialize the mouse event data.
  dragEvent.initMouseEvent(
    type, true, true, window, 0,
    event.screenX, event.screenY,
    event.clientX, event.clientY,
    event.ctrlKey, event.altKey,
    event.shiftKey, event.metaKey,
    event.button, related
  );

  // Add the custom drag event data.
  dragEvent.mimeData = drag.mimeData;
  dragEvent.dropAction = DropAction.None;
  dragEvent.proposedAction = drag.proposedAction;
  dragEvent.supportedActions = drag.supportedActions;
  dragEvent.source = drag.source;

  // Return the fully initialized drag event.
  return dragEvent;
}


/**
 * Dispatch a drag enter event to the indicated element.
 *
 * @param drag - The drag object associated with the action.
 *
 * @param currElem - The currently indicated element, or `null`. This
 *   is the "immediate user selection" from the whatwg spec.
 *
 * @param currTarget - The current drag target element, or `null`. This
 *   is the "current target element" from the whatwg spec.
 *
 * @param event - The mouse event related to the action.
 *
 * @returns The element to use as the current drag target. This is the
 *   "current target element" from the whatwg spec, and may be `null`.
 *
 * #### Notes
 * This largely implements the drag enter portion of the whatwg spec:
 * https://html.spec.whatwg.org/multipage/interaction.html#drag-and-drop-processing-model
 */
function dispatchDragEnter(drag: Drag, currElem: Element, currTarget: Element, event: MouseEvent): Element {
  // If the current element is null, return null as the new target.
  if (!currElem) {
    return null;
  }

  // Dispatch a drag enter event to the current element.
  let dragEvent = createDragEvent('p-dragenter', drag, event, currTarget);
  currElem.dispatchEvent(dragEvent);

  // If the event was canceled, use the current element as the new target.
  if (dragEvent.defaultPrevented) {
    return currElem;
  }

  // If the current element is the document body, keep the original target.
  if (currElem === document.body) {
    return currTarget;
  }

  // Dispatch a drag enter event on the document body.
  dragEvent = createDragEvent('p-dragenter', drag, event, currTarget);
  document.body.dispatchEvent(dragEvent);

  // Ignore the event cancellation, and use the body as the new target.
  return document.body;
}


/**
 * Dispatch a drag leave event to the indicated element.
 *
 * @param drag - The drag object associated with the action.
 *
 * @param prevTarget - The previous target element, or `null`. This
 *   is the previous "current target element" from the whatwg spec.
 *
 * @param currTarget - The current drag target element, or `null`. This
 *   is the "current target element" from the whatwg spec.
 *
 * @param event - The mouse event related to the action.
 *
 * #### Notes
 * This largely implements the drag leave portion of the whatwg spec:
 * https://html.spec.whatwg.org/multipage/interaction.html#drag-and-drop-processing-model
 */
function dispatchDragLeave(drag: Drag, prevTarget: Element, currTarget: Element, event: MouseEvent): void {
  // If the previous target is null, do nothing.
  if (!prevTarget) {
    return;
  }

  // Dispatch the drag leave event to the previous target.
  let dragEvent = createDragEvent('p-dragleave', drag, event, currTarget);
  prevTarget.dispatchEvent(dragEvent);
}


/**
 * Dispatch a drag over event to the indicated element.
 *
 * @param drag - The drag object associated with the action.
 *
 * @param currTarget - The current drag target element, or `null`. This
 *   is the "current target element" from the whatwg spec.
 *
 * @param event - The mouse event related to the action.
 *
 * @returns The `DropAction` result of the drag over event.
 *
 * #### Notes
 * This largely implements the drag over portion of the whatwg spec:
 * https://html.spec.whatwg.org/multipage/interaction.html#drag-and-drop-processing-model
 */
function dispatchDragOver(drag: Drag, currTarget: Element, event: MouseEvent): DropAction {
  // If there is no current target, the drop action is none.
  if (!currTarget) {
    return DropAction.None;
  }

  // Dispatch the drag over event to the current target.
  let dragEvent = createDragEvent('p-dragover', drag, event, null);
  currTarget.dispatchEvent(dragEvent);

  // If the event was canceled, return the drop action result.
  if (dragEvent.defaultPrevented) {
    return dragEvent.dropAction;
  }

  // Otherwise, the effective drop action is none.
  return DropAction.None;
}


/**
 * Dispatch a drop event to the indicated element.
 *
 * @param drag - The drag object associated with the action.
 *
 * @param currTarget - The current drag target element, or `null`. This
 *   is the "current target element" from the whatwg spec.
 *
 * @param event - The mouse event related to the action.
 *
 * @returns The `DropAction` result of the drop event.
 *
 * #### Notes
 * This largely implements the drag over portion of the whatwg spec:
 * https://html.spec.whatwg.org/multipage/interaction.html#drag-and-drop-processing-model
 */
function dispatchDrop(drag: Drag, currTarget: Element, event: MouseEvent): DropAction {
  // If there is no current target, the drop action is none.
  if (!currTarget) {
    return DropAction.None;
  }

  // Dispatch the drop event to the current target.
  let dragEvent = createDragEvent('p-drop', drag, event, null);
  currTarget.dispatchEvent(dragEvent);

  // If the event was canceled, return the drop action result.
  if (dragEvent.defaultPrevented) {
    return dragEvent.dropAction;
  }

  // Otherwise, the effective drop action is none.
  return DropAction.None;
}

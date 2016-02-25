phosphor-dockpanel
==================

[![Build Status](https://travis-ci.org/phosphorjs/phosphor-dockpanel.svg)](https://travis-ci.org/phosphorjs/phosphor-dockpanel?branch=master)
[![Coverage Status](https://coveralls.io/repos/phosphorjs/phosphor-dockpanel/badge.svg?branch=master&service=github)](https://coveralls.io/github/phosphorjs/phosphor-dockpanel?branch=master)

This module provides a flexible docking area for content widgets. The user can
easily add widgets inside the docker using placement methods, resulting in a
desktop-like web interface highly customizable.


Package Install
---------------

**Prerequisites**
- [node](http://nodejs.org/)

```bash
npm install --save phosphor-dockpanel
```


Source Build
------------

**Prerequisites**
- [git](http://git-scm.com/)
- [node](http://nodejs.org/)

```bash
git clone https://github.com/phosphorjs/phosphor-dockpanel.git
cd phosphor-dockpanel
npm install
```

**Rebuild**
```bash
npm run clean
npm run build
```


Run Tests
---------

Follow the source build instructions first.

```bash
# run tests in Firefox
npm test

# run tests in Chrome
npm run test:chrome

# run tests in IE
npm run test:ie
```


Build Docs
----------

Follow the source build instructions first.

```bash
npm run docs
```

Navigate to `docs/index.html`.


Build Example
-------------

Follow the source build instructions first.

```bash
npm run build:example
```

Navigate to `example/index.html`.


Supported Runtimes
------------------

The runtime versions which are currently *known to work* are listed below.
Earlier versions may also work, but come with no guarantees.

- IE 11+
- Firefox 32+
- Chrome 38+


Bundle for the Browser
----------------------

Follow the package install instructions first.

Any bundler that understands how to `require()` files with `.js` and `.css`
extensions can be used with this package.


Usage Examples
--------------

**Note:** This module is fully compatible with Node/Babel/ES6/ES5. Simply
omit the type declarations when using a language other than TypeScript.

Dock panels provide a really simple way of organizing widgets inside a docking
area. In the following example the required modules are imported and some basic
widgets are created to be placed inside a Dock Panel.

```typescript
'use strict';

import {
  Widget
} from 'phosphor-widget';

import {
  DockPanel
} from 'phosphor-dockpanel';

function createContent(title: string): Widget {
  let widget = new Widget();
  widget.addClass('content');
  widget.addClass(title.toLowerCase());
  widget.title.text = title;
  widget.title.closable = true;
  return widget;
}


let r1 = createContent('Red');

let b1 = createContent('Blue');
let b2 = createContent('Blue');
let b3 = createContent('Blue');

let g1 = createContent('Green');

let y1 = createContent('Yellow');
let y2 = createContent('Yellow');
```

There are several methods to position new widgets, the widget positions can be
relative to other widgets or to the edges of the Dock Panel. The methods
`insertRight()`, `insertLeft()`, `insertTop()` and `insertBottom()` take
widgets as arguments. If only one argument is passed it is positioned on the
corresponding edge. If there are two arguments, the first one is the widget to
add and the second is the positioning reference widget. 

The following code inserts the widget `r1` in the upper left corner, then `b1`
is placed to the right of `r1`, `y1` at the bottom of `b1` and `g1` to the left
of `g1`, finally `b2` is added on the bottom edge of the docking area.

```typescript
let panel = new DockPanel();
panel.id = 'main';

panel.insertLeft(r1);

panel.insertRight(b1, r1);
panel.insertBottom(y1, b1);
panel.insertLeft(g1, y1);

panel.insertBottom(b2);
```

Inserting a widget as a sibling tab next to a reference widget is
straightforward too by means of the `insertTabBefore()` and `insertTabAfter()`
methods. The arguments passed are the new widget to add and a reference widget.
The following snippet inserts two tabs siblings to `r1`.

```typescript
panel.insertTabBefore(y2, r1);
panel.insertTabBefore(b3, y2);

window.onresize = () => { panel.update(); };

window.onload = () => { panel.attach(document.body); };
```

All the methods from the [base Widget
class](http://phosphorjs.github.io/phosphor-widget/api/) are inherited by
`DockPanel`.


API
---

[API Docs](http://phosphorjs.github.io/phosphor-dockpanel/api/)

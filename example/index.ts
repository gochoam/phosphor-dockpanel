/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2015, PhosphorJS Contributors
|
| Distributed under the terms of the BSD 3-Clause License.
|
| The full license is in the file LICENSE, distributed with this software.
|----------------------------------------------------------------------------*/
'use-strict';

import {
  Widget, attachWidget
} from 'phosphor-widget';

import {
  Tab
} from 'phosphor-tabs';

import {
  DockPanel
} from '../lib/index';

import './index.css';


function createContent(title: string): Widget {
  var widget = new Widget();
  widget.addClass('content');
  widget.addClass(title.toLowerCase());

  var tab = new Tab(title);
  tab.closable = true;
  DockPanel.setTab(widget, tab);

  return widget;
}


function main(): void {
  var r1 = createContent('Red');
  var r2 = createContent('Red');
  var r3 = createContent('Red');

  var b1 = createContent('Blue');
  var b2 = createContent('Blue');
  var b3 = createContent('Blue');

  var g1 = createContent('Green');
  var g2 = createContent('Green');
  var g3 = createContent('Green');

  var y1 = createContent('Yellow');
  var y2 = createContent('Yellow');
  var y3 = createContent('Yellow');

  var panel = new DockPanel();
  panel.id = 'main';

  panel.splitLeft(null, b1);
  panel.tabify(b1, y2);
  panel.tabify(b1, r1);

  panel.splitRight(b1, r2);
  panel.tabify(r2, b2);

  panel.splitBottom(r2, r3);
  panel.tabify(r3, y1);

  panel.splitLeft(y1, g1);

  panel.splitBottom(null, g2);
  panel.tabify(g2, y3);
  panel.tabify(g2, g3);
  panel.tabify(g2, b3);

  attachWidget(panel, document.body);

  window.onresize = () => panel.update();
}


window.onload = main;

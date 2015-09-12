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

  panel.addWidget(r1);

  panel.addWidget(b1, DockPanel.SplitRight, r1);
  panel.addWidget(y1, DockPanel.SplitBottom, b1);
  panel.addWidget(g1, DockPanel.SplitLeft, y1);

  panel.addWidget(b2, DockPanel.SplitBottom);

  panel.addWidget(y2, DockPanel.TabBefore, r1);
  panel.addWidget(b3, DockPanel.TabBefore, y2);
  panel.addWidget(g2, DockPanel.TabBefore, b2);
  panel.addWidget(y3, DockPanel.TabBefore, g2);
  panel.addWidget(g3, DockPanel.TabBefore, y3);
  panel.addWidget(r2, DockPanel.TabBefore, b1);
  panel.addWidget(r3, DockPanel.TabBefore, y1);

  attachWidget(panel, document.body);

  window.onresize = () => panel.update();
}


window.onload = main;

/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Component, disposePlatform} from '@angular/core';
import {async} from '@angular/core/testing';
import {BROWSER_APP_PROVIDERS} from '@angular/platform-browser';
import {BROWSER_APP_COMPILER_PROVIDERS} from '@angular/platform-browser-dynamic';
import {getDOM} from '@angular/platform-browser/src/dom/dom_adapter';
import {serverBootstrap} from '@angular/platform-server';

function writeBody(html: string): any {
  var dom = getDOM();
  var doc = dom.defaultDoc();
  var body = dom.querySelector(doc, 'body');
  dom.setInnerHTML(body, html);
  return body;
}

export function main() {
  if (getDOM().supportsDOMEvents()) return;  // NODE only

  describe('platform-server integration', () => {

    beforeEach(() => disposePlatform());
    afterEach(() => disposePlatform());

    it('should bootstrap', async(() => {
         var body = writeBody('<app></app>');
         serverBootstrap(MyServerApp, [
           BROWSER_APP_PROVIDERS, BROWSER_APP_COMPILER_PROVIDERS
         ]).then(() => { expect(getDOM().getText(body)).toEqual('Works!'); });
       }));
  });
}

@Component({selector: 'app', template: `Works!`})
class MyServerApp {
}

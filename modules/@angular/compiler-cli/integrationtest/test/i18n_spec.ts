/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import './init';
let serializer = require('@angular/compiler/src/i18n/xmb_serializer.js');

import * as fs from 'fs';
import * as path from 'path';

describe('template i18n extraction output', () => {
  const outDir = '';

  it('should extract i18n messages', () => {
    const xmbOutput = path.join(outDir, 'messages.xmb');
    expect(fs.existsSync(xmbOutput)).toBeTruthy();
    const xmb = fs.readFileSync(xmbOutput, {encoding: 'utf-8'});
    const res = serializer.deserializeXmb(xmb);
    const keys = Object.keys(res.messages);
    expect(keys.length).toEqual(1);
    expect(res.errors.length).toEqual(0);
    expect(res.messages[keys[0]][0].value).toEqual('translate me');
  });
});

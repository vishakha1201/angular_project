/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {verifyNoBrowserErrors} from 'e2e_util/e2e_util';

function waitForElement(selector: string) {
  var EC = (<any>protractor).ExpectedConditions;
  // Waits for the element with id 'abc' to be present on the dom.
  browser.wait(EC.presenceOf($(selector)), 20000);
}

describe('on activate example app', function() {
  afterEach(verifyNoBrowserErrors);

  var URL = '@angular/examples/router/ts/on_deactivate/';

  it('should update the text when navigating between routes', function() {
    browser.get(URL);
    waitForElement('my-cmp');

    expect(element(by.css('#log')).getText()).toEqual('Log:');

    element(by.css('#param-link')).click();
    waitForElement('my-cmp');

    expect(element(by.css('#log')).getText()).toEqual('Log:\nNavigating from "" to "1"');

    browser.navigate().back();
    waitForElement('my-cmp');

    expect(element(by.css('#log')).getText())
        .toEqual('Log:\nNavigating from "" to "1"\nNavigating from "./1" to ""');
  });
});

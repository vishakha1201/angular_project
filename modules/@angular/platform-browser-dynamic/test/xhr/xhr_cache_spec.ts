/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {UrlResolver, XHR} from '@angular/compiler';
import {Component} from '@angular/core';
import {TestComponentBuilder, configureCompiler, fakeAsync, flushMicrotasks, tick} from '@angular/core/testing';
import {AsyncTestCompleter, beforeEach, beforeEachProviders, ddescribe, describe, iit, inject, it, xit} from '@angular/core/testing/testing_internal';
import {expect} from '@angular/platform-browser/testing/matchers';

import {BaseException} from '../../src/facade/exceptions';
import {CachedXHR} from '../../src/xhr/xhr_cache';

import {setTemplateCache} from './xhr_cache_setter';

export function main() {
  describe('CachedXHR', () => {
    var xhr: CachedXHR;

    function createCachedXHR(): CachedXHR {
      setTemplateCache({'test.html': '<div>Hello</div>'});
      return new CachedXHR();
    }
    beforeEach(() => {
      configureCompiler({
        providers: [
          {provide: UrlResolver, useClass: TestUrlResolver},
          {provide: XHR, useFactory: createCachedXHR}
        ]
      });
    });

    it('should throw exception if $templateCache is not found', () => {
      setTemplateCache(null);
      expect(() => {
        xhr = new CachedXHR();
      }).toThrowError('CachedXHR: Template cache was not found in $templateCache.');
    });

    it('should resolve the Promise with the cached file content on success',
       inject([AsyncTestCompleter], (async: AsyncTestCompleter) => {
         setTemplateCache({'test.html': '<div>Hello</div>'});
         xhr = new CachedXHR();
         xhr.get('test.html').then((text) => {
           expect(text).toEqual('<div>Hello</div>');
           async.done();
         });
       }));

    it('should reject the Promise on failure',
       inject([AsyncTestCompleter], (async: AsyncTestCompleter) => {
         xhr = new CachedXHR();
         xhr.get('unknown.html')
             .then((text) => { throw new BaseException('Not expected to succeed.'); })
             .catch((error) => { async.done(); });
       }));

    it('should allow fakeAsync Tests to load components with templateUrl synchronously',
       fakeAsync(inject([TestComponentBuilder], (tcb: TestComponentBuilder) => {
         let fixture = tcb.createFakeAsync(TestComponent);

         // This should initialize the fixture.
         tick();

         expect(fixture.debugElement.children[0].nativeElement).toHaveText('Hello');
       })));
  });
}

@Component({selector: 'test-cmp', templateUrl: 'test.html'})
class TestComponent {
}

class TestUrlResolver extends UrlResolver {
  resolve(baseUrl: string, url: string): string {
    // Don't use baseUrl to get the same URL as templateUrl.
    // This is to remove any difference between Dart and TS tests.
    return url;
  }
}

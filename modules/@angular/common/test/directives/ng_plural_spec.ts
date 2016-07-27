/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {AsyncTestCompleter, beforeEachProviders, beforeEach, ddescribe, describe, iit, inject, it, xit,} from '@angular/core/testing/testing_internal';
import {expect} from '@angular/platform-browser/testing/matchers';
import {TestComponentBuilder} from '@angular/core/testing';

import {Component, Injectable} from '@angular/core';
import {NgPlural, NgPluralCase, NgLocalization} from '@angular/common';

export function main() {
  describe('switch', () => {
    beforeEachProviders(() => [{provide: NgLocalization, useClass: TestLocalization}]);

    it('should display the template according to the exact value',
       inject(
           [TestComponentBuilder, AsyncTestCompleter],
           (tcb: TestComponentBuilder, async: AsyncTestCompleter) => {
             var template = '<div>' +
                 '<ul [ngPlural]="switchValue">' +
                 '<template ngPluralCase="=0"><li>you have no messages.</li></template>' +
                 '<template ngPluralCase="=1"><li>you have one message.</li></template>' +
                 '</ul></div>';

             tcb.overrideTemplate(TestComponent, template)
                 .createAsync(TestComponent)
                 .then((fixture) => {
                   fixture.debugElement.componentInstance.switchValue = 0;
                   fixture.detectChanges();
                   expect(fixture.debugElement.nativeElement).toHaveText('you have no messages.');

                   fixture.debugElement.componentInstance.switchValue = 1;
                   fixture.detectChanges();
                   expect(fixture.debugElement.nativeElement).toHaveText('you have one message.');

                   async.done();
                 });
           }));

    // https://github.com/angular/angular/issues/9868
    // https://github.com/angular/angular/issues/9882
    it('should not throw when ngPluralCase contains expressions',
       inject(
           [TestComponentBuilder, AsyncTestCompleter],
           (tcb: TestComponentBuilder, async: AsyncTestCompleter) => {
             var template = '<div>' +
                 '<ul [ngPlural]="switchValue">' +
                 '<template ngPluralCase="=0"><li>{{ switchValue }}</li></template>' +
                 '</ul></div>';

             tcb.overrideTemplate(TestComponent, template)
                 .createAsync(TestComponent)
                 .then((fixture) => {
                   fixture.debugElement.componentInstance.switchValue = 0;
                   expect(() => fixture.detectChanges()).not.toThrow();
                   async.done();
                 });
           }));


    it('should be applicable to <ng-container> elements',
       inject(
           [TestComponentBuilder, AsyncTestCompleter],
           (tcb: TestComponentBuilder, async: AsyncTestCompleter) => {
             var template = '<div>' +
                 '<ng-container [ngPlural]="switchValue">' +
                 '<template ngPluralCase="=0">you have no messages.</template>' +
                 '<template ngPluralCase="=1">you have one message.</template>' +
                 '</ng-container></div>';

             tcb.overrideTemplate(TestComponent, template)
                 .createAsync(TestComponent)
                 .then((fixture) => {
                   fixture.debugElement.componentInstance.switchValue = 0;
                   fixture.detectChanges();
                   expect(fixture.debugElement.nativeElement).toHaveText('you have no messages.');

                   fixture.debugElement.componentInstance.switchValue = 1;
                   fixture.detectChanges();
                   expect(fixture.debugElement.nativeElement).toHaveText('you have one message.');

                   async.done();
                 });
           }));

    it('should display the template according to the category',
       inject(
           [TestComponentBuilder, AsyncTestCompleter],
           (tcb: TestComponentBuilder, async: AsyncTestCompleter) => {
             var template = '<div>' +
                 '<ul [ngPlural]="switchValue">' +
                 '<template ngPluralCase="few"><li>you have a few messages.</li></template>' +
                 '<template ngPluralCase="many"><li>you have many messages.</li></template>' +
                 '</ul></div>';

             tcb.overrideTemplate(TestComponent, template)
                 .createAsync(TestComponent)
                 .then((fixture) => {
                   fixture.debugElement.componentInstance.switchValue = 2;
                   fixture.detectChanges();
                   expect(fixture.debugElement.nativeElement)
                       .toHaveText('you have a few messages.');

                   fixture.debugElement.componentInstance.switchValue = 8;
                   fixture.detectChanges();
                   expect(fixture.debugElement.nativeElement).toHaveText('you have many messages.');

                   async.done();
                 });
           }));

    it('should default to other when no matches are found',
       inject(
           [TestComponentBuilder, AsyncTestCompleter],
           (tcb: TestComponentBuilder, async: AsyncTestCompleter) => {
             var template = '<div>' +
                 '<ul [ngPlural]="switchValue">' +
                 '<template ngPluralCase="few"><li>you have a few messages.</li></template>' +
                 '<template ngPluralCase="other"><li>default message.</li></template>' +
                 '</ul></div>';

             tcb.overrideTemplate(TestComponent, template)
                 .createAsync(TestComponent)
                 .then((fixture) => {
                   fixture.debugElement.componentInstance.switchValue = 100;
                   fixture.detectChanges();
                   expect(fixture.debugElement.nativeElement).toHaveText('default message.');

                   async.done();
                 });
           }));

    it('should prioritize value matches over category matches',
       inject(
           [TestComponentBuilder, AsyncTestCompleter],
           (tcb: TestComponentBuilder, async: AsyncTestCompleter) => {
             var template = '<div>' +
                 '<ul [ngPlural]="switchValue">' +
                 '<template ngPluralCase="few"><li>you have a few messages.</li></template>' +
                 '<template ngPluralCase="=2">you have two messages.</template>' +
                 '</ul></div>';

             tcb.overrideTemplate(TestComponent, template)
                 .createAsync(TestComponent)
                 .then((fixture) => {
                   fixture.debugElement.componentInstance.switchValue = 2;
                   fixture.detectChanges();
                   expect(fixture.debugElement.nativeElement).toHaveText('you have two messages.');

                   fixture.debugElement.componentInstance.switchValue = 3;
                   fixture.detectChanges();
                   expect(fixture.debugElement.nativeElement)
                       .toHaveText('you have a few messages.');

                   async.done();
                 });
           }));
  });
}

@Injectable()
class TestLocalization extends NgLocalization {
  getPluralCategory(value: number): string {
    if (value > 1 && value < 4) {
      return 'few';
    }
    if (value >= 4 && value < 10) {
      return 'many';
    }

    return 'other';
  }
}

@Component({selector: 'test-cmp', directives: [NgPlural, NgPluralCase], template: ''})
class TestComponent {
  switchValue: number = null;
}

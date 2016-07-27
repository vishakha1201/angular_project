/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {AsyncTestCompleter, beforeEach, beforeEachProviders, ddescribe, xdescribe, describe, expect, iit, inject, it, xit,} from '@angular/core/testing/testing_internal';
import {TestComponentBuilder} from '@angular/core/testing';

import {StringMapWrapper} from '../../src/facade/collection';

import {Component} from '@angular/core';

import {getDOM} from '@angular/platform-browser/src/dom/dom_adapter';
import {NgStyle} from '@angular/common/src/directives/ng_style';

export function main() {
  describe('binding to CSS styles', () => {

    it('should add styles specified in an object literal',
       inject(
           [TestComponentBuilder, AsyncTestCompleter],
           (tcb: TestComponentBuilder, async: AsyncTestCompleter) => {
             var template = `<div [ngStyle]="{'max-width': '40px'}"></div>`;

             tcb.overrideTemplate(TestComponent, template)
                 .createAsync(TestComponent)
                 .then((fixture) => {
                   fixture.detectChanges();
                   expect(getDOM().getStyle(
                              fixture.debugElement.children[0].nativeElement, 'max-width'))
                       .toEqual('40px');

                   async.done();
                 });
           }));

    it('should add and change styles specified in an object expression',
       inject(
           [TestComponentBuilder, AsyncTestCompleter],
           (tcb: TestComponentBuilder, async: AsyncTestCompleter) => {
             var template = `<div [ngStyle]="expr"></div>`;

             tcb.overrideTemplate(TestComponent, template)
                 .createAsync(TestComponent)
                 .then((fixture) => {
                   var expr: Map<string, any>;

                   fixture.debugElement.componentInstance.expr = {'max-width': '40px'};
                   fixture.detectChanges();
                   expect(getDOM().getStyle(
                              fixture.debugElement.children[0].nativeElement, 'max-width'))
                       .toEqual('40px');

                   expr = fixture.debugElement.componentInstance.expr;
                   (expr as any)['max-width'] = '30%';
                   fixture.detectChanges();
                   expect(getDOM().getStyle(
                              fixture.debugElement.children[0].nativeElement, 'max-width'))
                       .toEqual('30%');

                   async.done();
                 });
           }));

    // keyValueDiffer is sensitive to key order #9115
    it('should change styles specified in an object expression',
       inject(
           [TestComponentBuilder, AsyncTestCompleter],
           (tcb: TestComponentBuilder, async: AsyncTestCompleter) => {
             const template = `<div [ngStyle]="expr"></div>`;

             tcb.overrideTemplate(TestComponent, template)
                 .createAsync(TestComponent)
                 .then((fixture) => {
                   fixture.debugElement.componentInstance.expr = {
                     // height, width order is important here
                     height: '10px',
                     width: '10px'
                   };

                   fixture.detectChanges();
                   let el = fixture.debugElement.children[0].nativeElement;
                   expect(getDOM().getStyle(el, 'height')).toEqual('10px');
                   expect(getDOM().getStyle(el, 'width')).toEqual('10px');

                   fixture.debugElement.componentInstance.expr = {
                     // width, height order is important here
                     width: '5px',
                     height: '5px',
                   };

                   fixture.detectChanges();
                   expect(getDOM().getStyle(el, 'height')).toEqual('5px');
                   expect(getDOM().getStyle(el, 'width')).toEqual('5px');

                   async.done();
                 });
           }));

    it('should remove styles when deleting a key in an object expression',
       inject(
           [TestComponentBuilder, AsyncTestCompleter],
           (tcb: TestComponentBuilder, async: AsyncTestCompleter) => {
             var template = `<div [ngStyle]="expr"></div>`;

             tcb.overrideTemplate(TestComponent, template)
                 .createAsync(TestComponent)
                 .then((fixture) => {
                   fixture.debugElement.componentInstance.expr = {'max-width': '40px'};
                   fixture.detectChanges();
                   expect(getDOM().getStyle(
                              fixture.debugElement.children[0].nativeElement, 'max-width'))
                       .toEqual('40px');

                   StringMapWrapper.delete(
                       fixture.debugElement.componentInstance.expr, 'max-width');
                   fixture.detectChanges();
                   expect(getDOM().getStyle(
                              fixture.debugElement.children[0].nativeElement, 'max-width'))
                       .toEqual('');

                   async.done();
                 });
           }));

    it('should co-operate with the style attribute',
       inject(
           [TestComponentBuilder, AsyncTestCompleter],
           (tcb: TestComponentBuilder, async: AsyncTestCompleter) => {
             var template = `<div style="font-size: 12px" [ngStyle]="expr"></div>`;

             tcb.overrideTemplate(TestComponent, template)
                 .createAsync(TestComponent)
                 .then((fixture) => {
                   fixture.debugElement.componentInstance.expr = {'max-width': '40px'};
                   fixture.detectChanges();
                   expect(getDOM().getStyle(
                              fixture.debugElement.children[0].nativeElement, 'max-width'))
                       .toEqual('40px');
                   expect(getDOM().getStyle(
                              fixture.debugElement.children[0].nativeElement, 'font-size'))
                       .toEqual('12px');

                   StringMapWrapper.delete(
                       fixture.debugElement.componentInstance.expr, 'max-width');
                   fixture.detectChanges();
                   expect(getDOM().getStyle(
                              fixture.debugElement.children[0].nativeElement, 'max-width'))
                       .toEqual('');
                   expect(getDOM().getStyle(
                              fixture.debugElement.children[0].nativeElement, 'font-size'))
                       .toEqual('12px');

                   async.done();
                 });
           }));

    it('should co-operate with the style.[styleName]="expr" special-case in the compiler',
       inject(
           [TestComponentBuilder, AsyncTestCompleter],
           (tcb: TestComponentBuilder, async: AsyncTestCompleter) => {
             var template = `<div [style.font-size.px]="12" [ngStyle]="expr"></div>`;

             tcb.overrideTemplate(TestComponent, template)
                 .createAsync(TestComponent)
                 .then((fixture) => {
                   fixture.debugElement.componentInstance.expr = {'max-width': '40px'};
                   fixture.detectChanges();
                   expect(getDOM().getStyle(
                              fixture.debugElement.children[0].nativeElement, 'max-width'))
                       .toEqual('40px');
                   expect(getDOM().getStyle(
                              fixture.debugElement.children[0].nativeElement, 'font-size'))
                       .toEqual('12px');

                   StringMapWrapper.delete(
                       fixture.debugElement.componentInstance.expr, 'max-width');
                   expect(getDOM().getStyle(
                              fixture.debugElement.children[0].nativeElement, 'font-size'))
                       .toEqual('12px');

                   fixture.detectChanges();
                   expect(getDOM().getStyle(
                              fixture.debugElement.children[0].nativeElement, 'max-width'))
                       .toEqual('');

                   async.done();
                 });
           }));
  });
}

@Component({selector: 'test-cmp', directives: [NgStyle], template: ''})
class TestComponent {
  expr: any;
}

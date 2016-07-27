/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {beforeEach, ddescribe, describe, expect, iit, it, inject,} from '@angular/core/testing/testing_internal';

import {stringify, isBlank} from '../src/facade/lang';
import {MockViewResolver} from '../testing';
import {Component, ViewMetadata, Injector} from '@angular/core';

export function main() {
  describe('MockViewResolver', () => {
    var viewResolver: MockViewResolver;

    beforeEach(inject(
        [Injector], (injector: Injector) => { viewResolver = new MockViewResolver(injector); }));

    describe('View overriding', () => {
      it('should fallback to the default ViewResolver when templates are not overridden', () => {
        var view = viewResolver.resolve(SomeComponent);
        expect(view.template).toEqual('template');
        expect(view.directives).toEqual([SomeDirective]);
      });

      it('should allow overriding the @View', () => {
        viewResolver.setView(SomeComponent, new ViewMetadata({template: 'overridden template'}));
        var view = viewResolver.resolve(SomeComponent);
        expect(view.template).toEqual('overridden template');
        expect(isBlank(view.directives)).toBe(true);
      });

      it('should allow overriding a view after it has been resolved', () => {
        viewResolver.resolve(SomeComponent);
        viewResolver.setView(SomeComponent, new ViewMetadata({template: 'overridden template'}));
        var view = viewResolver.resolve(SomeComponent);
        expect(view.template).toEqual('overridden template');
        expect(isBlank(view.directives)).toBe(true);
      });
    });

    describe('inline template definition overriding', () => {
      it('should allow overriding the default template', () => {
        viewResolver.setInlineTemplate(SomeComponent, 'overridden template');
        var view = viewResolver.resolve(SomeComponent);
        expect(view.template).toEqual('overridden template');
        expect(view.directives).toEqual([SomeDirective]);
      });

      it('should allow overriding an overridden @View', () => {
        viewResolver.setView(SomeComponent, new ViewMetadata({template: 'overridden template'}));
        viewResolver.setInlineTemplate(SomeComponent, 'overridden template x 2');
        var view = viewResolver.resolve(SomeComponent);
        expect(view.template).toEqual('overridden template x 2');
      });

      it('should allow overriding a view after it has been resolved', () => {
        viewResolver.resolve(SomeComponent);
        viewResolver.setInlineTemplate(SomeComponent, 'overridden template');
        var view = viewResolver.resolve(SomeComponent);
        expect(view.template).toEqual('overridden template');
      });
    });


    describe('Directive overriding', () => {
      it('should allow overriding a directive from the default view', () => {
        viewResolver.overrideViewDirective(SomeComponent, SomeDirective, SomeOtherDirective);
        var view = viewResolver.resolve(SomeComponent);
        expect(view.directives.length).toEqual(1);
        expect(view.directives[0]).toBe(SomeOtherDirective);
      });

      it('should allow overriding a directive from an overridden @View', () => {
        viewResolver.setView(SomeComponent, new ViewMetadata({directives: [SomeOtherDirective]}));
        viewResolver.overrideViewDirective(SomeComponent, SomeOtherDirective, SomeComponent);
        var view = viewResolver.resolve(SomeComponent);
        expect(view.directives.length).toEqual(1);
        expect(view.directives[0]).toBe(SomeComponent);
      });

      it('should throw when the overridden directive is not present', () => {
        viewResolver.overrideViewDirective(SomeComponent, SomeOtherDirective, SomeDirective);
        expect(() => { viewResolver.resolve(SomeComponent); })
            .toThrowError(
                `Overriden directive ${stringify(SomeOtherDirective)} not found in the template of ${stringify(SomeComponent)}`);
      });

      it('should allow overriding a directive after its view has been resolved', () => {
        viewResolver.resolve(SomeComponent);
        viewResolver.overrideViewDirective(SomeComponent, SomeDirective, SomeOtherDirective);
        var view = viewResolver.resolve(SomeComponent);
        expect(view.directives.length).toEqual(1);
        expect(view.directives[0]).toBe(SomeOtherDirective);
      });
    });
  });
}

class SomeDirective {}

@Component({
  selector: 'cmp',
  template: 'template',
  directives: [SomeDirective],
})
class SomeComponent {
}

class SomeOtherDirective {}

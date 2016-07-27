/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Directive, Inject, Input, OnChanges, Optional, Output, Self, SimpleChanges, forwardRef} from '@angular/core';

import {EventEmitter, ObservableWrapper} from '../../facade/async';
import {ListWrapper, StringMapWrapper} from '../../facade/collection';
import {BaseException} from '../../facade/exceptions';
import {isBlank} from '../../facade/lang';
import {FormArray, FormControl, FormGroup} from '../../model';
import {NG_ASYNC_VALIDATORS, NG_VALIDATORS, Validators} from '../../validators';
import {ControlContainer} from '../control_container';
import {Form} from '../form_interface';
import {NgControl} from '../ng_control';
import {ReactiveErrors} from '../reactive_errors';
import {composeAsyncValidators, composeValidators, setUpControl, setUpFormContainer} from '../shared';

import {FormArrayName} from './form_array_name';
import {FormGroupName} from './form_group_name';

export const formDirectiveProvider: any =
    /*@ts2dart_const*/ /* @ts2dart_Provider */ {
      provide: ControlContainer,
      useExisting: forwardRef(() => FormGroupDirective)
    };

/**
 * Binds an existing form group to a DOM element.
 *
 * ### Example ([live demo](http://plnkr.co/edit/jqrVirudY8anJxTMUjTP?p=preview))
 *
 * In this example, we bind the form group to the form element, and we bind the login and
 * password controls to the login and password elements.
 *
 *  ```typescript
 * @Component({
 *   selector: 'my-app',
 *   template: `
 *     <div>
 *       <h2>Binding an existing form group</h2>
 *       <form [formGroup]="loginForm">
 *         <p>Login: <input type="text" formControlName="login"></p>
 *         <p>Password: <input type="password" formControlName="password"></p>
 *       </form>
 *       <p>Value:</p>
 *       <pre>{{value}}</pre>
 *     </div>
 *   `,
 *   directives: [REACTIVE_FORM_DIRECTIVES]
 * })
 * export class App {
 *   loginForm: FormGroup;
 *
 *   constructor() {
 *     this.loginForm = new FormGroup({
 *       login: new FormControl(""),
 *       password: new FormControl("")
 *     });
 *   }
 *
 *   get value(): string {
 *     return JSON.stringify(this.loginForm.value, null, 2);
 *   }
 * }
 *  ```
 *
 * We can also use ngModel to bind a domain model to the form.
 *
 *  ```typescript
 * @Component({
 *      selector: "login-comp",
 *      directives: [REACTIVE_FORM_DIRECTIVES],
 *      template: `
 *        <form [formGroup]='loginForm'>
 *          Login <input type='text' formControlName='login' [(ngModel)]='credentials.login'>
 *          Password <input type='password' formControlName='password'
 *                          [(ngModel)]='credentials.password'>
 *          <button (click)="onLogin()">Login</button>
 *        </form>`
 *      })
 * class LoginComp {
 *  credentials: {login: string, password: string};
 *  loginForm: FormGroup;
 *
 *  constructor() {
 *    this.loginForm = new FormGroup({
 *      login: new FormControl(""),
 *      password: new FormControl("")
 *    });
 *  }
 *
 *  onLogin(): void {
 *    // this.credentials.login === 'some login'
 *    // this.credentials.password === 'some password'
 *  }
 * }
 *  ```
 *
 *  @experimental
 */
@Directive({
  selector: '[formGroup]',
  providers: [formDirectiveProvider],
  host: {'(submit)': 'onSubmit()', '(reset)': 'onReset()'},
  exportAs: 'ngForm'
})
export class FormGroupDirective extends ControlContainer implements Form,
    OnChanges {
  private _submitted: boolean = false;
  directives: NgControl[] = [];

  @Input('formGroup') form: FormGroup = null;
  @Output() ngSubmit = new EventEmitter();

  constructor(
      @Optional() @Self() @Inject(NG_VALIDATORS) private _validators: any[],
      @Optional() @Self() @Inject(NG_ASYNC_VALIDATORS) private _asyncValidators: any[]) {
    super();
  }

  ngOnChanges(changes: SimpleChanges): void {
    this._checkFormPresent();
    if (StringMapWrapper.contains(changes, 'form')) {
      var sync = composeValidators(this._validators);
      this.form.validator = Validators.compose([this.form.validator, sync]);

      var async = composeAsyncValidators(this._asyncValidators);
      this.form.asyncValidator = Validators.composeAsync([this.form.asyncValidator, async]);

      this.form.updateValueAndValidity({onlySelf: true, emitEvent: false});
    }

    this._updateDomValue();
  }

  get submitted(): boolean { return this._submitted; }

  get formDirective(): Form { return this; }

  get control(): FormGroup { return this.form; }

  get path(): string[] { return []; }

  addControl(dir: NgControl): void {
    const ctrl: any = this.form.find(dir.path);
    setUpControl(ctrl, dir);
    ctrl.updateValueAndValidity({emitEvent: false});
    this.directives.push(dir);
  }

  getControl(dir: NgControl): FormControl { return <FormControl>this.form.find(dir.path); }

  removeControl(dir: NgControl): void { ListWrapper.remove(this.directives, dir); }

  addFormGroup(dir: FormGroupName): void {
    var ctrl: any = this.form.find(dir.path);
    setUpFormContainer(ctrl, dir);
    ctrl.updateValueAndValidity({emitEvent: false});
  }

  removeFormGroup(dir: FormGroupName): void {}

  getFormGroup(dir: FormGroupName): FormGroup { return <FormGroup>this.form.find(dir.path); }

  addFormArray(dir: FormArrayName): void {
    var ctrl: any = this.form.find(dir.path);
    setUpFormContainer(ctrl, dir);
    ctrl.updateValueAndValidity({emitEvent: false});
  }

  removeFormArray(dir: FormArrayName): void {}

  getFormArray(dir: FormArrayName): FormArray { return <FormArray>this.form.find(dir.path); }

  updateModel(dir: NgControl, value: any): void {
    var ctrl  = <FormControl>this.form.find(dir.path);
    ctrl.updateValue(value);
  }

  onSubmit(): boolean {
    this._submitted = true;
    ObservableWrapper.callEmit(this.ngSubmit, null);
    return false;
  }

  onReset(): void { this.form.reset(); }

  /** @internal */
  _updateDomValue() {
    this.directives.forEach(dir => {
      var ctrl: any = this.form.find(dir.path);
      dir.valueAccessor.writeValue(ctrl.value);
    });
  }

  private _checkFormPresent() {
    if (isBlank(this.form)) {
      ReactiveErrors.missingFormException();
    }
  }
}

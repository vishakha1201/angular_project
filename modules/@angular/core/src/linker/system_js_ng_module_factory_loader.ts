/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */


import {Injectable, Optional} from '../di';
import {global} from '../facade/lang';

import {Compiler} from './compiler';
import {NgModuleFactory} from './ng_module_factory';
import {NgModuleFactoryLoader} from './ng_module_factory_loader';

const _SEPARATOR = '#';

const FACTORY_MODULE_SUFFIX = '.ngfactory';
const FACTORY_CLASS_SUFFIX = 'NgFactory';

/**
 * NgModuleFactoryLoader that uses SystemJS to load NgModuleFactory
 * @experimental
 */
@Injectable()
export class SystemJsNgModuleLoader implements NgModuleFactoryLoader {
  constructor(@Optional() private _compiler: Compiler) {}

  load(path: string): Promise<NgModuleFactory<any>> {
    return this._compiler ? this.loadAndCompile(path) : this.loadFactory(path);
  }

  private loadAndCompile(path: string): Promise<NgModuleFactory<any>> {
    let [module, exportName] = path.split(_SEPARATOR);
    if (exportName === undefined) exportName = 'default';

    return (<any>global)
        .System.import(module)
        .then((module: any) => module[exportName])
        .then((type: any) => checkNotEmpty(type, module, exportName))
        .then((type: any) => this._compiler.compileModuleAsync(type));
  }

  private loadFactory(path: string): Promise<NgModuleFactory<any>> {
    let [module, exportName] = path.split(_SEPARATOR);
    if (exportName === undefined) exportName = 'default';

    return (<any>global)
        .System.import(module + FACTORY_MODULE_SUFFIX)
        .then((module: any) => module[exportName + FACTORY_CLASS_SUFFIX])
        .then((factory: any) => checkNotEmpty(factory, module, exportName));
  }
}

function checkNotEmpty(value: any, modulePath: string, exportName: string): any {
  if (!value) {
    throw new Error(`Cannot find '${exportName}' in '${modulePath}'`);
  }
  return value;
}

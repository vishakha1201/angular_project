#!/usr/bin/env node
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */


/**
 * Extract i18n messages from source code
 */

// Must be imported first, because angular2 decorators throws on load.
import 'reflect-metadata';

import * as ts from 'typescript';
import * as tsc from '@angular/tsc-wrapped';
import * as path from 'path';
import * as compiler from '@angular/compiler';
import {ViewEncapsulation} from '@angular/core';

import {StaticReflector} from './static_reflector';
import {CompileMetadataResolver, HtmlParser, DirectiveNormalizer, Lexer, Parser, DomElementSchemaRegistry, TypeScriptEmitter, MessageExtractor, removeDuplicates, ExtractionResult, Message, ParseError, serializeXmb,} from './compiler_private';

import {ReflectorHost} from './reflector_host';
import {StaticAndDynamicReflectionCapabilities} from './static_reflection_capabilities';

function extract(
    ngOptions: tsc.AngularCompilerOptions, program: ts.Program, host: ts.CompilerHost) {
  return Extractor.create(ngOptions, program, host).extract();
}

const _dirPaths = new Map<compiler.CompileDirectiveMetadata, string>();

const _GENERATED_FILES = /\.ngfactory\.ts$|\.css\.ts$|\.css\.shim\.ts$/;

class Extractor {
  constructor(
      private _options: tsc.AngularCompilerOptions, private _program: ts.Program,
      public host: ts.CompilerHost, private staticReflector: StaticReflector,
      private _resolver: CompileMetadataResolver, private _normalizer: DirectiveNormalizer,
      private _reflectorHost: ReflectorHost, private _extractor: MessageExtractor) {}

  private _extractCmpMessages(components: compiler.CompileDirectiveMetadata[]): ExtractionResult {
    if (!components || !components.length) {
      return null;
    }

    let messages: Message[] = [];
    let errors: ParseError[] = [];
    components.forEach(metadata => {
      let url = _dirPaths.get(metadata);
      let result = this._extractor.extract(metadata.template.template, url);
      errors = errors.concat(result.errors);
      messages = messages.concat(result.messages);
    });

    // Extraction Result might contain duplicate messages at this point
    return new ExtractionResult(messages, errors);
  }

  private _readComponents(absSourcePath: string): Promise<compiler.CompileDirectiveMetadata>[] {
    const result: Promise<compiler.CompileDirectiveMetadata>[] = [];
    const metadata = this.staticReflector.getModuleMetadata(absSourcePath);
    if (!metadata) {
      console.log(`WARNING: no metadata found for ${absSourcePath}`);
      return result;
    }

    const symbols = Object.keys(metadata['metadata']);
    if (!symbols || !symbols.length) {
      return result;
    }
    for (const symbol of symbols) {
      const staticType = this._reflectorHost.findDeclaration(absSourcePath, symbol, absSourcePath);
      let directive: compiler.CompileDirectiveMetadata;
      directive = this._resolver.getDirectiveMetadata(<any>staticType, false);

      if (directive && directive.isComponent) {
        let promise = this._normalizer.normalizeDirective(directive).asyncResult;
        promise.then(md => _dirPaths.set(md, absSourcePath));
        result.push(promise);
      }
    }
    return result;
  }

  extract(): Promise<any> {
    _dirPaths.clear();

    const promises = this._program.getSourceFiles()
                         .map(sf => sf.fileName)
                         .filter(f => !_GENERATED_FILES.test(f))
                         .map(
                             (absSourcePath: string): Promise<any> =>
                                 Promise.all(this._readComponents(absSourcePath))
                                     .then(metadatas => this._extractCmpMessages(metadatas))
                                     .catch(e => console.error(e.stack)));

    let messages: Message[] = [];
    let errors: ParseError[] = [];

    return Promise.all(promises).then(extractionResults => {
      extractionResults.filter(result => !!result).forEach(result => {
        messages = messages.concat(result.messages);
        errors = errors.concat(result.errors);
      });

      if (errors.length) {
        throw new Error(errors.map(e => e.toString()).join('\n'));
      }

      messages = removeDuplicates(messages);

      let genPath = path.join(this._options.genDir, 'messages.xmb');
      let msgBundle = serializeXmb(messages);

      this.host.writeFile(genPath, msgBundle, false);
    });
  }

  static create(
      options: tsc.AngularCompilerOptions, program: ts.Program,
      compilerHost: ts.CompilerHost): Extractor {
    const xhr: compiler.XHR = {
      get: (s: string) => {
        if (!compilerHost.fileExists(s)) {
          // TODO: We should really have a test for error cases like this!
          throw new Error(`Compilation failed. Resource file not found: ${s}`);
        }
        return Promise.resolve(compilerHost.readFile(s));
      }
    };
    const urlResolver: compiler.UrlResolver = compiler.createOfflineCompileUrlResolver();
    const reflectorHost = new ReflectorHost(program, compilerHost, options);
    const staticReflector = new StaticReflector(reflectorHost);
    StaticAndDynamicReflectionCapabilities.install(staticReflector);
    const htmlParser = new HtmlParser();
    const config = new compiler.CompilerConfig({
      genDebugInfo: true,
      defaultEncapsulation: ViewEncapsulation.Emulated,
      logBindingUpdate: false,
      useJit: false
    });
    const normalizer = new DirectiveNormalizer(xhr, urlResolver, htmlParser, config);
    const expressionParser = new Parser(new Lexer());
    const resolver = new CompileMetadataResolver(
        new compiler.NgModuleResolver(staticReflector),
        new compiler.DirectiveResolver(staticReflector), new compiler.PipeResolver(staticReflector),
        new compiler.ViewResolver(staticReflector), config, /*console*/ null, staticReflector);

    // TODO(vicb): handle implicit
    const extractor = new MessageExtractor(htmlParser, expressionParser, [], {});

    return new Extractor(
        options, program, compilerHost, staticReflector, resolver, normalizer, reflectorHost,
        extractor);
  }
}

// Entry point
if (require.main === module) {
  const args = require('minimist')(process.argv.slice(2));
  tsc.main(args.p || args.project || '.', args.basePath, extract)
      .then(exitCode => process.exit(exitCode))
      .catch(e => {
        console.error(e.stack);
        console.error('Compilation failed');
        process.exit(1);
      });
}

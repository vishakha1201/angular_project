import * as ts from 'typescript';

import {Evaluator, errorSymbol, isPrimitive} from './evaluator';
import {ClassMetadata, ConstructorMetadata, MemberMetadata, MetadataError, MetadataMap, MetadataObject, MetadataSymbolicExpression, MetadataSymbolicReferenceExpression, MetadataSymbolicSelectExpression, MetadataValue, MethodMetadata, ModuleMetadata, VERSION, isMetadataError, isMetadataSymbolicReferenceExpression, isMetadataSymbolicSelectExpression} from './schema';
import {Symbols} from './symbols';



/**
 * Collect decorator metadata from a TypeScript module.
 */
export class MetadataCollector {
  constructor() {}

  /**
   * Returns a JSON.stringify friendly form describing the decorators of the exported classes from
   * the source file that is expected to correspond to a module.
   */
  public getMetadata(sourceFile: ts.SourceFile): ModuleMetadata {
    const locals = new Symbols(sourceFile);
    const evaluator = new Evaluator(locals);
    let metadata: {[name: string]: MetadataValue | ClassMetadata}|undefined;

    function objFromDecorator(decoratorNode: ts.Decorator): MetadataSymbolicExpression {
      return <MetadataSymbolicExpression>evaluator.evaluateNode(decoratorNode.expression);
    }

    function errorSym(
        message: string, node?: ts.Node, context?: {[name: string]: string}): MetadataError {
      return errorSymbol(message, node, context, sourceFile);
    }

    function maybeGetSimpleFunction(
        functionDeclaration: ts.FunctionDeclaration |
        ts.MethodDeclaration): {func: MetadataValue, name: string}|undefined {
      if (functionDeclaration.name.kind == ts.SyntaxKind.Identifier) {
        const nameNode = <ts.Identifier>functionDeclaration.name;
        const functionName = nameNode.text;
        const functionBody = functionDeclaration.body;
        if (functionBody && functionBody.statements.length == 1) {
          const statement = functionBody.statements[0];
          if (statement.kind === ts.SyntaxKind.ReturnStatement) {
            const returnStatement = <ts.ReturnStatement>statement;
            if (returnStatement.expression) {
              return {
                name: functionName, func: {
                  __symbolic: 'function',
                  parameters: namesOf(functionDeclaration.parameters),
                  value: evaluator.evaluateNode(returnStatement.expression)
                }
              }
            }
          }
        }
      }
    }

    function classMetadataOf(classDeclaration: ts.ClassDeclaration): ClassMetadata {
      let result: ClassMetadata = {__symbolic: 'class'};

      function getDecorators(decorators: ts.Decorator[]): MetadataSymbolicExpression[] {
        if (decorators && decorators.length)
          return decorators.map(decorator => objFromDecorator(decorator));
        return undefined;
      }

      function referenceFrom(node: ts.Node): MetadataSymbolicReferenceExpression|MetadataError|
          MetadataSymbolicSelectExpression {
        const result = evaluator.evaluateNode(node);
        if (isMetadataError(result) || isMetadataSymbolicReferenceExpression(result) ||
            isMetadataSymbolicSelectExpression(result)) {
          return result;
        } else {
          return errorSym('Symbol reference expected', node);
        }
      }

      // Add class decorators
      if (classDeclaration.decorators) {
        result.decorators = getDecorators(classDeclaration.decorators);
      }

      // member decorators
      let members: MetadataMap = null;
      function recordMember(name: string, metadata: MemberMetadata) {
        if (!members) members = {};
        let data = members.hasOwnProperty(name) ? members[name] : [];
        data.push(metadata);
        members[name] = data;
      }

      // static member
      let statics: MetadataObject = null;
      function recordStaticMember(name: string, value: MetadataValue) {
        if (!statics) statics = {};
        statics[name] = value;
      }

      for (const member of classDeclaration.members) {
        let isConstructor = false;
        switch (member.kind) {
          case ts.SyntaxKind.Constructor:
          case ts.SyntaxKind.MethodDeclaration:
            isConstructor = member.kind === ts.SyntaxKind.Constructor;
            const method = <ts.MethodDeclaration|ts.ConstructorDeclaration>member;
            if (method.flags & ts.NodeFlags.Static) {
              const maybeFunc = maybeGetSimpleFunction(<ts.MethodDeclaration>method);
              if (maybeFunc) {
                recordStaticMember(maybeFunc.name, maybeFunc.func);
              }
              continue;
            }
            const methodDecorators = getDecorators(method.decorators);
            const parameters = method.parameters;
            const parameterDecoratorData: (MetadataSymbolicExpression | MetadataError)[][] = [];
            const parametersData:
                (MetadataSymbolicReferenceExpression | MetadataError |
                 MetadataSymbolicSelectExpression | null)[] = [];
            let hasDecoratorData: boolean = false;
            let hasParameterData: boolean = false;
            for (const parameter of parameters) {
              const parameterData = getDecorators(parameter.decorators);
              parameterDecoratorData.push(parameterData);
              hasDecoratorData = hasDecoratorData || !!parameterData;
              if (isConstructor) {
                if (parameter.type) {
                  parametersData.push(referenceFrom(parameter.type));
                } else {
                  parametersData.push(null);
                }
                hasParameterData = true;
              }
            }
            const data: MethodMetadata = {__symbolic: isConstructor ? 'constructor' : 'method'};
            const name = isConstructor ? '__ctor__' : evaluator.nameOf(member.name);
            if (methodDecorators) {
              data.decorators = methodDecorators;
            }
            if (hasDecoratorData) {
              data.parameterDecorators = parameterDecoratorData;
            }
            if (hasParameterData) {
              (<ConstructorMetadata>data).parameters = parametersData;
            }
            if (!isMetadataError(name)) {
              recordMember(name, data);
            }
            break;
          case ts.SyntaxKind.PropertyDeclaration:
          case ts.SyntaxKind.GetAccessor:
          case ts.SyntaxKind.SetAccessor:
            const property = <ts.PropertyDeclaration>member;
            const propertyDecorators = getDecorators(property.decorators);
            if (propertyDecorators) {
              let name = evaluator.nameOf(property.name);
              if (!isMetadataError(name)) {
                recordMember(name, {__symbolic: 'property', decorators: propertyDecorators});
              }
            }
            break;
        }
      }
      if (members) {
        result.members = members;
      }
      if (statics) {
        result.statics = statics;
      }

      return result.decorators || members || statics ? result : undefined;
    }

    // Predeclare classes
    ts.forEachChild(sourceFile, node => {
      switch (node.kind) {
        case ts.SyntaxKind.ClassDeclaration:
          const classDeclaration = <ts.ClassDeclaration>node;
          const className = classDeclaration.name.text;
          if (node.flags & ts.NodeFlags.Export) {
            locals.define(className, {__symbolic: 'reference', name: className});
          } else {
            locals.define(
                className, errorSym('Reference to non-exported class', node, {className}));
          }
          break;
      }
    });
    ts.forEachChild(sourceFile, node => {
      switch (node.kind) {
        case ts.SyntaxKind.ClassDeclaration:
          const classDeclaration = <ts.ClassDeclaration>node;
          const className = classDeclaration.name.text;
          if (node.flags & ts.NodeFlags.Export) {
            if (classDeclaration.decorators) {
              if (!metadata) metadata = {};
              metadata[className] = classMetadataOf(classDeclaration);
            }
          }
          // Otherwise don't record metadata for the class.
          break;
        case ts.SyntaxKind.FunctionDeclaration:
          // Record functions that return a single value. Record the parameter
          // names substitution will be performed by the StaticReflector.
          if (node.flags & ts.NodeFlags.Export) {
            const functionDeclaration = <ts.FunctionDeclaration>node;
            const maybeFunc = maybeGetSimpleFunction(functionDeclaration);
            if (maybeFunc) {
              if (!metadata) metadata = {};
              metadata[maybeFunc.name] = maybeFunc.func;
            }
          }
          // Otherwise don't record the function.
          break;
        case ts.SyntaxKind.EnumDeclaration:
          const enumDeclaration = <ts.EnumDeclaration>node;
          let enumValueHolder: {[name: string]: MetadataValue} = {};
          const enumName = enumDeclaration.name.text;
          let nextDefaultValue: MetadataValue = 0;
          let writtenMembers = 0;
          for (const member of enumDeclaration.members) {
            let enumValue: MetadataValue;
            if (!member.initializer) {
              enumValue = nextDefaultValue;
            } else {
              enumValue = evaluator.evaluateNode(member.initializer);
            }
            let name: string = undefined;
            if (member.name.kind == ts.SyntaxKind.Identifier) {
              const identifier = <ts.Identifier>member.name;
              name = identifier.text;
              enumValueHolder[name] = enumValue;
              writtenMembers++;
            }
            if (typeof enumValue === 'number') {
              nextDefaultValue = enumValue + 1;
            } else if (name) {
              nextDefaultValue = {
                __symbolic: 'binary',
                operator: '+',
                left: {
                  __symbolic: 'select',
                  expression: {__symbolic: 'reference', name: enumName}, name
                }
              }
            } else {
              nextDefaultValue = errorSym('Unsuppported enum member name', member.name);
            };
          }
          if (writtenMembers) {
            if (!metadata) metadata = {};
            metadata[enumName] = enumValueHolder;
          }
          break;
        case ts.SyntaxKind.VariableStatement:
          const variableStatement = <ts.VariableStatement>node;
          for (let variableDeclaration of variableStatement.declarationList.declarations) {
            if (variableDeclaration.name.kind == ts.SyntaxKind.Identifier) {
              let nameNode = <ts.Identifier>variableDeclaration.name;
              let varValue: MetadataValue;
              if (variableDeclaration.initializer) {
                varValue = evaluator.evaluateNode(variableDeclaration.initializer);
              } else {
                varValue = errorSym('Variable not initialized', nameNode);
              }
              if (variableStatement.flags & ts.NodeFlags.Export ||
                  variableDeclaration.flags & ts.NodeFlags.Export) {
                if (!metadata) metadata = {};
                metadata[nameNode.text] = varValue;
              }
              if (isPrimitive(varValue)) {
                locals.define(nameNode.text, varValue);
              }
            } else {
              // Destructuring (or binding) declarations are not supported,
              // var {<identifier>[, <identifer>]+} = <expression>;
              //   or
              // var [<identifier>[, <identifier}+] = <expression>;
              // are not supported.
              const report = (nameNode: ts.Node) => {
                switch (nameNode.kind) {
                  case ts.SyntaxKind.Identifier:
                    const name = <ts.Identifier>nameNode;
                    const varValue = errorSym('Destructuring not supported', nameNode);
                    locals.define(name.text, varValue);
                    if (node.flags & ts.NodeFlags.Export) {
                      if (!metadata) metadata = {};
                      metadata[name.text] = varValue;
                    }
                    break;
                  case ts.SyntaxKind.BindingElement:
                    const bindingElement = <ts.BindingElement>nameNode;
                    report(bindingElement.name);
                    break;
                  case ts.SyntaxKind.ObjectBindingPattern:
                  case ts.SyntaxKind.ArrayBindingPattern:
                    const bindings = <ts.BindingPattern>nameNode;
                    bindings.elements.forEach(report);
                    break;
                }
              };
              report(variableDeclaration.name);
            }
          }
          break;
      }
    });

    return metadata && {__symbolic: 'module', version: VERSION, metadata};
  }
}

// Collect parameter names from a function.
function namesOf(parameters: ts.NodeArray<ts.ParameterDeclaration>): string[] {
  let result: string[] = [];

  function addNamesOf(name: ts.Identifier | ts.BindingPattern) {
    if (name.kind == ts.SyntaxKind.Identifier) {
      const identifier = <ts.Identifier>name;
      result.push(identifier.text);
    } else {
      const bindingPattern = <ts.BindingPattern>name;
      for (let element of bindingPattern.elements) {
        addNamesOf(element.name);
      }
    }
  }

  for (let parameter of parameters) {
    addNamesOf(parameter.name);
  }

  return result;
}
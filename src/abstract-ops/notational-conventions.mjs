import { Value } from '../value.mjs';
import { directivePrologueContainsUseStrictDirective } from '../ast.mjs';

export function Assert(invariant, source) {
  if (!invariant) {
    throw new TypeError(`Assert failed${source ? `: ${source}` : ''}`.trim());
  }
}

export function sourceTextMatchedBy(node) {
  return new Value(node.source());
}

// An ECMAScript Script syntactic unit may be processed using either unrestricted or strict mode syntax and semantics.
// Code is interpreted as strict mode code in the following situations:
//
//  - Global code is strict mode code if it begins with a Directive Prologue that contains a Use Strict Directive.
//
//  - Module code is always strict mode code.
//
//  - All parts of a ClassDeclaration or a ClassExpression are strict mode code.
//
//  - Eval code is strict mode code if it begins with a Directive Prologue that contains a Use Strict Directive or
//    if the call to eval is a direct eval that is contained in strict mode code.
//
//  - Function code is strict mode code if the associated FunctionDeclaration, FunctionExpression, GeneratorDeclaration,
//    GeneratorExpression, AsyncFunctionDeclaration, AsyncFunctionExpression, AsyncGeneratorDeclaration,
//    AsyncGeneratorExpression, MethodDefinition, ArrowFunction, or AsyncArrowFunction is contained in strict mode code
//    or if the code that produces the value of the function's [[ECMAScriptCode]] internal slot begins with a Directive
//    Prologue that contains a Use Strict Directive.
//
//  - Function code that is supplied as the arguments to the built-in Function, Generator, AsyncFunction, and
//    AsyncGenerator constructors is strict mode code if the last argument is a String that when processed is a
//    FunctionBody that begins with a Directive Prologue that contains a Use Strict Directive.
export function isStrictModeCode(node) {
  if (node.strict === true) {
    return true;
  }

  if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') {
    return isStrictModeCode(node.body);
  }

  if (Array.isArray(node)) {
    return directivePrologueContainsUseStrictDirective(node);
  }

  return false;
}

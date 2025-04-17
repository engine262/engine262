import {
  ThrowCompletion, type Completion, type Value,
} from '../index.mts';
import { surroundingAgent } from '../host-defined/engine.mts';
import type { ParseNode } from '../parser/ParseNode.mts';
import { ObjectValue } from '../value.mts';

class AssertError extends Error {}
export function Assert(invariant: boolean, source?: string, completion?: Completion<unknown>): asserts invariant {
  /* node:coverage disable */
  if (!invariant) {
    throw new AssertError(source, { cause: completion });
  }
  /* node:coverage enable */
}
Assert.Error = AssertError;

/** https://tc39.es/ecma262/#sec-requireinternalslot */
export function RequireInternalSlot(O: Value, internalSlot: string): ThrowCompletion | undefined {
  if (!(O instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', O);
  }
  if (!(internalSlot in O)) {
    return surroundingAgent.Throw('TypeError', 'InternalSlotMissing', O, internalSlot);
  }
  return undefined;
}

export function sourceTextMatchedBy(node: ParseNode) {
  return node.sourceText();
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
export function isStrictModeCode(node: ParseNode) {
  return node.strict;
}

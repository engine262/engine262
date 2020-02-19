import { surroundingAgent } from '../engine.mjs';
import { Type, Value } from '../value.mjs';
import { Evaluate } from '../evaluator.mjs';
import { NewDeclarativeEnvironment } from '../environment.mjs';
import {
  Assert,
  Call,
  GetIterator,
  GetValue,
  PutValue,
  ResolveBinding,
  InitializeReferencedBinding,
  IteratorComplete,
  IteratorValue,
  IteratorClose,
  AsyncIteratorClose,
  ToBoolean,
  ToObject,
} from '../abstract-ops/all.mjs';
import {
  BoundNames,
  IsConstantDeclaration,
  IsDestructuring,
} from '../static-semantics/all.mjs';
import { CreateForInIterator } from '../intrinsics/ForInIteratorPrototype.mjs';
import {
  Completion,
  NormalCompletion,
  AbruptCompletion,
  BreakCompletion,
  UpdateEmpty,
  EnsureCompletion,
  ReturnIfAbrupt,
  Await,
  Q, X,
} from '../completion.mjs';
import { OutOfRange } from '../helpers.mjs';
import {
  Evaluate_SwitchStatement,
  Evaluate_VariableDeclarationList,
} from './all.mjs';

// #sec-loopcontinues
function LoopContinues(completion, labelSet) {
  // 1. If completion.[[Type]] is normal, return true.
  if (completion.Type === 'normal') {
    return Value.true;
  }
  // 2. If completion.[[Type]] is not continue, return false.
  if (completion.type !== 'continue') {
    return Value.false;
  }
  // 3. If completion.[[Target]] is empty, return true.
  if (completion.Target === undefined) {
    return Value.true;
  }
  // 4. If completion.[[Target]] is an element of labelSet, return true.
  if (labelSet.has(completion.Target)) {
    return Value.true;
  }
  // 5. Return false.
  return Value.false;
}

// #sec-statement-semantics-runtime-semantics-labelledevaluation
//  BreakableStatement :
//    IterationStatement
//    SwitchStatement
//
//  IterationStatement :
//    (DoWhileStatement)
//    (WhileStatement)
export function* LabelledEvaluation_BreakableStatement(BreakableStatement, labelSet) {
  switch (BreakableStatement.type) {
    case 'DoWhileStatement':
    case 'WhileStatement':
    case 'ForStatement':
    case 'ForInStatement': {
      // 1. Let stmtResult be LabelledEvaluation of IterationStatement with argument labelSet.
      let stmtResult = yield* LabelledEvaluation_IterationStatement(BreakableStatement, labelSet);
      // 2. If stmtResult.[[Type]] is break, then
      if (stmtResult.Type === 'break') {
        // a. If stmtResult.[[Target]] is empty, then
        if (stmtResult.Target === undefined) {
          // i. If stmtResult.[[Value]] is empty, set stmtResult to NormalCompletion(undefined).
          if (stmtResult.Value === undefined) {
            stmtResult = NormalCompletion(Value.undefined);
          } else { // ii. Else, set stmtResult to NormalCompletion(stmtResult.[[Value]]).
            stmtResult = NormalCompletion(stmtResult.Value);
          }
        }
      }
      // 3. Return Completion(stmtResult).
      return Completion(stmtResult);
    }
    case 'SwitchStatement': {
      // 1. Let stmtResult be LabelledEvaluation of SwitchStatement.
      let stmtResult = yield* Evaluate_SwitchStatement(BreakableStatement);
      // 2. If stmtResult.[[Type]] is break, then
      if (stmtResult.Type === 'break') {
        // a. If stmtResult.[[Target]] is empty, then
        if (stmtResult.Target === undefined) {
          // i. If stmtResult.[[Value]] is empty, set stmtResult to NormalCompletion(undefined).
          if (stmtResult.Value === undefined) {
            stmtResult = NormalCompletion(Value.undefined);
          } else { // ii. Else, set stmtResult to NormalCompletion(stmtResult.[[Value]]).
            stmtResult = NormalCompletion(stmtResult.Value);
          }
        }
      }
      // 3. Return Completion(stmtResult).
      return Completion(stmtResult);
    }
    default:
      throw new OutOfRange('LabelledEvaluation_BreakableStatement', BreakableStatement);
  }
}

function LabelledEvaluation_IterationStatement(IterationStatement, labelSet) {
  switch (IterationStatement.type) {
    case 'DoWhileStatement':
      return LabelledEvaluation_IterationStatement_DoWhileStatement(IterationStatement, labelSet);
    case 'WhileStatement':
      return LabelledEvaluation_IterationStatement_WhileStatement(IterationStatement, labelSet);
    case 'ForStatement':
      return LabelledEvaluation_BreakableStatement_ForStatement(IterationStatement, labelSet);
    case 'ForInStatement':
      return LabelledEvaluation_IterationStatement_ForInStatement(IterationStatement, labelSet);
    default:
      throw new OutOfRange('LabelledEvaluation_IterationStatement', IterationStatement);
  }
}

// #sec-do-while-statement-runtime-semantics-labelledevaluation
//   IterationStatement :
//     `do` Statement `while` `(` Expression `)` `;`
function* LabelledEvaluation_IterationStatement_DoWhileStatement({ Statement, Expression }, labelSet) {
  // 1. Let V be undefined.
  let V = Value.undefined;
  // 2. Repeat,
  while (true) {
    // a. Let stmtResult be the result of evaluating Statement.
    const stmtResult = EnsureCompletion(yield* Evaluate(Statement));
    // b. If LoopContinues(stmtResult, labelSet) is false, return Completion(UpdateEmpty(stmtResult, V)).
    if (LoopContinues(stmtResult, labelSet) === Value.false) {
      return Completion(UpdateEmpty(stmtResult, V));
    }
    // c. If stmtResult.[[Value]] is not empty, set V to stmtResult.[[Value]].
    if (stmtResult.Value !== undefined) {
      V = stmtResult.Value;
    }
    // d. Let exprRef be the result of evaluating Expression.
    const exprRef = yield* Evaluate(Expression);
    // e. Let exprValue be ? GetValue(exprRef).
    const exprValue = Q(GetValue(exprRef));
    // f. If ! ToBoolean(exprValue) is false, return NormalCompletion(V).
    if (X(ToBoolean(exprValue)) === Value.false) {
      return NormalCompletion(V);
    }
  }
}


// #sec-while-statement-runtime-semantics-labelledevaluation
//   IterationStatement :
//     `while` `(` Expression `)` Statement
function* LabelledEvaluation_IterationStatement_WhileStatement({ Expression, Statement }, labelSet) {
  // 1. Let V be undefined.
  let V = Value.undefined;
  // 2. Repeat,
  while (true) {
    // a. Let exprRef be the result of evaluating Expression.
    const exprRef = yield* Evaluate(Expression);
    // b. Let exprValue be ? GetValue(exprRef).
    const exprValue = Q(GetValue(exprRef));
    // c. If ! ToBoolean(exprValue) is false, return NormalCompletion(V).
    if (X(ToBoolean(exprValue)) === Value.false) {
      return NormalCompletion(V);
    }
    // d. Let stmtResult be the result of evaluating Statement.
    const stmtResult = EnsureCompletion(yield* Evaluate(Statement));
    // e. If LoopContinues(stmtResult, labelSet) is false, return Completion(UpdateEmpty(stmtResult, V)).
    if (LoopContinues(stmtResult, labelSet) === Value.false) {
      return Completion(UpdateEmpty(stmtResult, V));
    }
    // f. If stmtResult.[[Value]] is not empty, set V to stmtResult.[[Value]].
    if (stmtResult.Value !== undefined) {
      V = stmtResult.Value;
    }
  }
}

// #sec-for-statement-runtime-semantics-labelledevaluation
//   IterationStatement :
//     `for` `(` Expression? `;` Expression? `;` Expresssion? `)` Statement
//     `for` `(` `var` VariableDeclarationList `;` Expression? `;` Expression? `)` Statement
//     `for` `(` LexicalDeclaration Expression? `;` Expression? `)` Statement
function* LabelledEvaluation_BreakableStatement_ForStatement(ForStatement, labelSet) {
  const {
    VariableDeclarationList, LexicalDeclaration,
    Expression_a, Expression_b, Expression_c,
    Statement,
  } = ForStatement;
  switch (true) {
    case LexicalDeclaration !== null: {
      // 1. Let oldEnv be the running execution context's LexicalEnvironment.
      const oldEnv = surroundingAgent.runningExecutionContext.LexicalEnvironment;
      // 2. Let loopEnv be NewDeclarativeEnvironment(oldEnv).
      const loopEnv = NewDeclarativeEnvironment(oldEnv);
      // 3. Let loopEnvRec be loopEnv's EnvironmentRecord.
      const loopEnvRec = loopEnv.EnvironmentRecord;
      // 4. Let isConst be IsConstantDeclaration of LexicalDeclaration.
      const isConst = IsConstantDeclaration(LexicalDeclaration);
      // 5. Let boundNames be the BoundNames of LexicalDeclaration.
      const boundNames = BoundNames(LexicalDeclaration);
      // 6. For each element dn of boundNames, do
      for (const dn of boundNames) {
        // a.     If isConst is true, then
        if (isConst) {
          // i. Perform ! loopEnvRec.CreateImmutableBinding(dn, true).
          X(loopEnvRec.CreateImmutableBinding(dn, Value.true));
        } else { // b. Else,
          // i. Perform ! loopEnvRec.CreateMutableBinding(dn, false).
          X(loopEnvRec.CreateMutableBinding(dn, Value.false));
        }
      }
      // 7. Set the running execution context's LexicalEnvironment to loopEnv.
      surroundingAgent.runningExecutionContext.LexicalEnvironment = loopEnv;
      // 8. Let forDcl be the result of evaluating LexicalDeclaration.
      const forDcl = yield* Evaluate(LexicalDeclaration);
      // 9. If forDcl is an abrupt completion, then
      if (forDcl instanceof AbruptCompletion) {
        // a. Set the running execution context's LexicalEnvironment to oldEnv.
        surroundingAgent.runningExecutionContext.LexicalEnvironment = oldEnv;
        // b. Return Completion(forDcl).
        return Completion(forDcl);
      }
      // 10. If isConst is false, let perIterationLets be boundNames; otherwise let perIterationLets be « ».
      let perIterationLets;
      if (isConst === false) {
        perIterationLets = boundNames;
      } else {
        perIterationLets = [];
      }
      // 11. Let bodyResult be ForBodyEvaluation(the first Expression, the second Expression, Statement, perIterationLets, labelSet).
      const bodyResult = yield* ForBodyEvaluation(Expression_b, Expression_c, Statement, perIterationLets, labelSet);
      // 12. Set the running execution context's LexicalEnvironment to oldEnv.
      surroundingAgent.runningExecutionContext.LexicalEnvironment = oldEnv;
      // 13. Return Completion(bodyResult).
      return Completion(bodyResult);
    }
    case VariableDeclarationList !== null: {
      // 1. Let varDcl be the result of evaluating VariableDeclarationList.
      const varDcl = yield* Evaluate_VariableDeclarationList(VariableDeclarationList);
      // 2. ReturnIfAbrupt(varDcl).
      ReturnIfAbrupt(varDcl);
      // 3. Return ? ForBodyEvaluation(the first Expression, the second Expression, Statement, « », labelSet).
      return Q(yield* ForBodyEvaluation(Expression_b, Expression_c, Statement, [], labelSet));
    }
    default: {
      // 1. If the first Expression is present, then
      if (Expression_a !== null) {
        // a. Let exprRef be the result of evaluating the first Expression.
        const exprRef = yield* Evaluate(Expression_a);
        // b. Perform ? GetValue(exprRef).
        Q(GetValue(exprRef));
      }
      // 2. Return ? ForBodyEvaluation(the second Expression, the third Expression, Statement, « », labelSet).
      return Q(yield* ForBodyEvaluation(Expression_b, Expression_c, Statement, [], labelSet));
    }
  }
}

function* LabelledEvaluation_IterationStatement_ForInStatement(ForInStatement, labelSet) {
  const {
    LeftHandSideExpression,
    ForBinding, Expression,
    Statement,
  } = ForInStatement;
  switch (true) {
    case LeftHandSideExpression !== null && Expression !== null: {
      // IterationStatement : `for` `(` LeftHandSideExpression `in` Expression `)` Statement
      // 1. Let keyResult be ? ForIn/OfHeadEvaluation(« », Expression, enumerate).
      const keyResult = Q(yield* ForInOfHeadEvaluation([], Expression, 'enumerate'));
      // 2. Return ? ForIn/OfBodyEvaluation(LeftHandSideExpression, Statement, keyResult, enumerate, assignment, labelSet).
      return Q(yield* ForInOfBodyEvaluation(LeftHandSideExpression, Statement, keyResult, 'enumerate', 'assignment', labelSet));
    }
    case ForBinding !== null && Expression !== null: {
      // IterationStatement :`for` `(` `var` ForBinding `in` Expression `)` Statement
      // 1. Let keyResult be ? ForIn/OfHeadEvaluation(« », Expression, enumerate).
      const keyResult = Q(yield* ForInOfHeadEvaluation([], Expression, 'enumerate'));
      // 2. Return ? ForIn/OfBodyEvaluation(ForBinding, Statement, keyResult, enumerate, varBinding, labelSet).
      return Q(yield* ForInOfBodyEvaluation(ForBinding, Statement, keyResult, 'enumerate', 'varBinding', labelSet));
    }
    default:
      throw new OutOfRange('LabelledEvaluation_IterationStatement_ForInStatement', ForInStatement);
  }
}

// #sec-forbodyevaluation
function* ForBodyEvaluation(test, increment, stmt, perIterationBindings, labelSet) {
  // 1. Let V be undefined.
  let V = Value.undefined;
  // 2. Perform ? CreatePerIterationEnvironment(perIterationBindings).
  Q(CreatePerIterationEnvironment(perIterationBindings));
  // 3. Repeat,
  while (true) {
    // a. If test is not [empty], then
    if (test !== null) {
      // i. Let testRef be the result of evaluating test.
      const testRef = yield* Evaluate(test);
      // ii. Let testValue be ? GetValue(testRef).
      const testValue = Q(GetValue(testRef));
      // iii. If ! ToBoolean(testValue) is false, return NormalCompletion(V).
      if (X(ToBoolean(testValue)) === Value.false) {
        return NormalCompletion(V);
      }
    }
    // b. Let result be the result of evaluating stmt.
    const result = EnsureCompletion(yield* Evaluate(stmt));
    // c. If LoopContinues(result, labelSet) is false, return Completion(UpdateEmpty(result, V)).
    if (LoopContinues(result, labelSet) === Value.false) {
      return Completion(UpdateEmpty(result, V));
    }
    // d. If result.[[Value]] is not empty, set V to result.[[Value]].
    if (result.Value !== undefined) {
      V = result.Value;
    }
    // e. Perform ? CreatePerIterationEnvironment(perIterationBindings).
    Q(CreatePerIterationEnvironment(perIterationBindings));
    // f. If increment is not [empty], then
    if (increment !== null) {
      // i. Let incRef be the result of evaluating increment.
      const incRef = yield* Evaluate(increment);
      // ii. Perform ? GetValue(incRef).
      Q(GetValue(incRef));
    }
  }
}

// #sec-createperiterationenvironment
function CreatePerIterationEnvironment(perIterationBindings) {
  // 1. If perIterationBindings has any elements, then
  if (perIterationBindings.length > 0) {
    // a. Let lastIterationEnv be the running execution context's LexicalEnvironment.
    const lastIterationEnv = surroundingAgent.runningExecutionContext.LexicalEnvironment;
    // b. Let lastIterationEnvRec be lastIterationEnv's EnvironmentRecord.
    const lastIterationEnvRec = lastIterationEnv.EnvironmentRecord;
    // c. Let outer be lastIterationEnv's outer environment reference.
    const outer = lastIterationEnv.outerEnvironmentReference;
    // d. Assert: outer is not null.
    Assert(outer !== Value.null);
    // e. Let thisIterationEnv be NewDeclarativeEnvironment(outer).
    const thisIterationEnv = NewDeclarativeEnvironment(outer);
    // f. Let thisIterationEnvRec be thisIterationEnv's EnvironmentRecord.
    const thisIterationEnvRec = thisIterationEnv.EnvironmentRecord;
    // g. For each element bn of perIterationBindings, do
    for (const bn of perIterationBindings) {
      // i. Perform ! thisIterationEnvRec.CreateMutableBinding(bn, false).
      X(thisIterationEnvRec.CreateMutableBinding(bn, Value.false));
      // ii. Let lastValue be ? lastIterationEnvRec.GetBindingValue(bn, true).
      const lastValue = Q(lastIterationEnvRec.GetBindingValue(bn, Value.true));
      // iii. Perform thisIterationEnvRec.InitializeBinding(bn, lastValue).
      thisIterationEnvRec.InitializeBinding(bn, lastValue);
    }
    // h. Set the running execution context's LexicalEnvironment to thisIterationEnv.
    surroundingAgent.runningExecutionContext.LexicalEnvironment = thisIterationEnv;
  }
  // 2. Return undefined.
  return Value.undefined;
}

// #sec-runtime-semantics-forinofheadevaluation
function* ForInOfHeadEvaluation(uninitializedBoundNames, expr, iterationKind) {
  // 1. Let oldEnv be the running execution context's LexicalEnvironment.
  const oldEnv = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  // 2. If uninitializedBoundNames is not an empty List, then
  if (uninitializedBoundNames.length > 0) {
    // a. Assert: uninitializedBoundNames has no duplicate entries.
    // b. Let newEnv be NewDeclarativeEnvironment(oldEnv).
    const newEnv = NewDeclarativeEnvironment(oldEnv);
    // c. Let newEnvRec be newEnv's EnvironmentRecord.
    const newEnvRec = newEnv.EnvironmentRecord;
    // d. For each string name in uninitializedBoundNames, do
    for (const name of uninitializedBoundNames) {
      // i. Perform ! newEnvRec.CreateMutableBinding(name, false).
      X(newEnvRec.CreateMutableBinding(name, Value.false));
    }
    // e. Set the running execution context's LexicalEnvironment to newEnv.
    surroundingAgent.runningExecutionContext.LexicalEnvironment = newEnv;
  }
  // 3. Let exprRef be the result of evaluating expr.
  const exprRef = yield* Evaluate(expr);
  // 4. Set the running execution context's LexicalEnvironment to oldEnv.
  surroundingAgent.runningExecutionContext.LexicalEnvironment = oldEnv;
  // 5. Let exprValue be ? GetValue(exprRef).
  const exprValue = Q(GetValue(exprRef));
  // 6. If iterationKind is enumerate, then
  if (iterationKind === 'enumerate') {
    // a. If exprValue is undefined or null, then
    if (exprValue === Value.undefined || exprValue === Value.null) {
      // i. Return Completion { [[Type]]: break, [[Value]]: empty, [[Target]]: empty }.
      return BreakCompletion(undefined);
    }
    // b. Let obj be ! ToObject(exprValue).
    const obj = X(ToObject(exprValue));
    // c. Return ? EnumerateObjectProperties(obj).
    return Q(EnumerateObjectProperties(obj));
  } else { // 7. Else,
    // a. Assert: iterationKind is iterate or async-iterate.
    Assert(iterationKind === 'iterate' || iterationKind === 'async-iterate');
    // b. If iterationKind is async-iterate, let iteratorHint be async.
    // c. Else, let iteratorHint be sync.
    const iteratorHint = iterationKind === 'async-iterate' ? 'async' : 'sync';
    // d. Return ? GetIterator(exprValue, iteratorHint).
    return Q(GetIterator(exprValue, iteratorHint));
  }
}

// #sec-enumerate-object-properties
function EnumerateObjectProperties(O) {
  const it = CreateForInIterator(O);
  return X(GetIterator(it));
}

// #sec-runtime-semantics-forin-div-ofbodyevaluation-lhs-stmt-iterator-lhskind-labelset
function* ForInOfBodyEvaluation(lhs, stmt, iteratorRecord, iterationKind, lhsKind, labelSet, iteratorKind) {
  // 1. If iteratorKind is not present, set iteratorKind to sync.
  if (iterationKind === undefined) {
    iterationKind = 'sync';
  }
  // 2. Let oldEnv be the running execution context's LexicalEnvironment.
  const oldEnv = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  // 3. Let V be undefined.
  let V = Value.undefined;
  // 4. Let destructuring be IsDestructuring of lhs.
  const destructuring = IsDestructuring(lhs);
  // 5. If destructuring is true and if lhsKind is assignment, then
  if (destructuring && lhsKind === 'assignment') {
    // a. Assert: lhs is a LeftHandSideExpression.
    // b. Let assignmentPattern be the AssignmentPattern that is covered by lhs.
  }
  // 6. Repeat,
  while (true) {
    // a. Let nextResult be ? Call(iteratorRecord.[[NextMethod]], iteratorRecord.[[Iterator]]).
    let nextResult = Q(Call(iteratorRecord.NextMethod, iteratorRecord.Iterator));
    // b. If iteratorKind is async, then set nextResult to ? Await(nextResult).
    if (iterationKind === 'async') {
      nextResult = Q(yield* Await(nextResult));
    }
    // c. If Type(nextResult) is not Object, throw a TypeError exception.
    if (Type(nextResult) !== 'Object') {
      return surroundingAgent.Throw('TypeError', 'NotAnObject', nextResult);
    }
    // d. Let done be ? IteratorComplete(nextResult).
    const done = Q(IteratorComplete(nextResult));
    // e. If done is true, return NormalCompletion(V).
    if (done === Value.true) {
      return NormalCompletion(V);
    }
    // f. Let nextValue be ? IteratorValue(nextResult).
    const nextValue = Q(IteratorValue(nextResult));
    // g. If lhsKind is either assignment or varBinding, then
    let lhsRef;
    let iterationEnv;
    if (lhsKind === 'assignment' || lhsKind === 'varBinding') {
      // i. If destructuring is false, then
      if (destructuring === false) {
        // 1. Let lhsRef be the result of evaluating lhs. (It may be evaluated repeatedly.)
        lhsRef = yield* Evaluate(lhs);
      }
    } else { // h. Else,
      // i. Assert: lhsKind is lexicalBinding.
      Assert(lhsKind === 'lexicalBinding');
      // ii. Assert: lhs is a ForDeclaration.
      Assert(lhs.type === 'ForDeclaration');
      // iii. Let iterationEnv be NewDeclarativeEnvironment(oldEnv).
      iterationEnv = NewDeclarativeEnvironment(oldEnv);
      // iv. Perform BindingInstantiation for lhs passing iterationEnv as the argument.
      BindingInstantiation(lhs, iterationEnv);
      // v. Set the running execution context's LexicalEnvironment to iterationEnv.
      surroundingAgent.runningExecutionContext.LexicalEnvironment = iterationEnv;
      // vi. If destructuring is false, then
      if (destructuring === false) {
        // 1. Assert: lhs binds a single name.
        // 2. Let lhsName be the sole element of BoundNames of lhs.
        const lhsName = BoundNames(lhs)[0];
        // 3. Let lhsRef be ! ResolveBinding(lhsName).
        lhsRef = X(ResolveBinding(lhsName));
      }
    }
    let status;
    // i. If destructuring is false, then
    if (destructuring === false) {
      // i. If lhsRef is an abrupt completion, then
      if (lhsRef instanceof AbruptCompletion) {
        // 1. Let status be lhsRef.
        status = lhsRef;
      } else if (lhsKind === 'lexicalBinding') { // ii. Else is lhsKind is lexicalBinding, then
        // 1. Let status be InitializeReferencedBinding(lhsRef, nextValue).
        status = InitializeReferencedBinding(lhsRef, nextValue);
      } else { // iii. Else,
        status = PutValue(lhsRef, nextValue);
      }
    } else { // j. Else,
      // i. If lhsKind is assignment, then
      if (lhsKind === 'assignment') {
        // 1. Let status be DestructuringAssignmentEvaluation of assignmentPattern with argument nextValue.
        status = DestructuringAssignmentEvaluation(assignmentPattern, nextValue);
      } else if (lhsKind === 'varaBinding') { // ii. Else if lhsKind is varBinding, then
        // 1. Assert: lhs is a ForBinding.
        Assert(lhs.type === 'ForBinding');
        // 2. Let status be BindingInitialization of lhs with arguments nextValue and undefined.
        status = BindingInitialization(lhs, nextValue, Value.undefined);
      } else { // iii. Else,
        // 1. Assert: lhsKind is lexicalBinding.
        Assert(lhsKind === 'lexicalBinding');
        // 2. Assert: lhs is a ForDeclaration.
        Assert(lhs.type === 'ForDeclaration');
        // 3. Let status be BindingInitialization of lhs with arguments nextValue and iterationEnv.
        status = BindingInitialization(lhs, nextValue, iterationEnv);
      }
    }
    // k. If status is an abrupt completion, then
    if (status instanceof AbruptCompletion) {
      // i. Set the running execution context's LexicalEnvironment to oldEnv.
      surroundingAgent.runningExecutionContext.LexicalEnvironment = oldEnv;
      // ii. If iteratorKind is async, return ? AsyncIteratorClose(iteratorRecord, status).
      if (iteratorKind === 'async') {
        return Q(yield* AsyncIteratorClose(iteratorRecord, status));
      }
      // iii. if iterationKind is enumerate, then
      if (iterationKind === 'enumerate') {
        // 1. Return status.
        return status;
      } else { // iv. Else,
        // 1. Assert: iterationKind is iterate.
        Assert(iterationKind === 'iterate');
        // 2 .Return ? IteratorClose(iteratorRecord, status).
        return Q(IteratorClose(iteratorRecord, status));
      }
    }
    // l. Let result be the result of evaluating stmt.
    const result = EnsureCompletion(yield* Evaluate(stmt));
    // m. Set the running execution context's LexicalEnvironment to oldEnv.
    surroundingAgent.runningExecutionContext.LexicalEnvironment = oldEnv;
    // n. If LoopContinues(result, labelSet) is false, then
    if (LoopContinues(result, labelSet) === Value.false) {
      // i. If iterationKind is enumerate, then
      if (iterationKind === 'enumerate') {
        // 1. Return Completion(UpdateEmpty(result, V)).
        return Completion(UpdateEmpty(result, V));
      } else { // ii. Else,
        // 1. Assert: iterationKind is iterate.
        Assert(iterationKind === 'iterate');
        // 2. Set status to UpdateEmpty(result, V).
        status = UpdateEmpty(result, V);
        // 3. If iteratorKind is async, return ? AsyncIteratorClose(iteratorRecord, status).
        if (iteratorKind === 'async') {
          return Q(yield* AsyncIteratorClose(iteratorRecord, status));
        }
        // 4. Return ? IteratorClose(iteratorRecord, status).
        return Q(IteratorClose(iteratorRecord, status));
      }
    }
    // o. If result.[[Value]] is not empty, set V to result.[[Value]].
    if (result.Value !== undefined) {
      V = result.Value;
    }
  }
}

// #sec-runtime-semantics-bindinginstantiation
//   ForDeclaration : LetOrConst ForBinding
function BindingInstantiation(ForDeclaration, Environment) {
}

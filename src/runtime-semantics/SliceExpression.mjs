import {
  Assert,
  Call,
  DefinePropertyOrThrow,
  GeneratorFunctionCreate,
  GetValue,
  ObjectCreate,
} from '../abstract-ops/all.mjs';
import { Q, X } from '../completion.mjs';
import { surroundingAgent } from '../engine.mjs';
import { Evaluate } from '../evaluator.mjs';
import { Descriptor, Value } from '../value.mjs';


const SliceGeneratorExpression = {
  type: 'FunctionExpression',
  generator: true,
  params: [
    { type: 'Identifier', name: 'si' },
    { type: 'Identifier', name: 'ei' },
    { type: 'Identifier', name: 'step' },
  ],
  body: {
    type: 'BlockStatement',
    body: [{
      type: 'IfStatement',
      test: {
        type: 'BinaryExpression',
        left: { type: 'Identifier', name: 'step' },
        operator: '<',
        right: { type: 'Literal', value: 0 },
      },
      consequent: {
        type: 'BlockStatement',
        body: [{
          type: 'ForStatement',
          init: {
            type: 'VariableDeclaration',
            declarations: [{
              type: 'VariableDeclarator',
              id: { type: 'Identifier', name: 'i' },
              init: {
                type: 'BinaryExpression',
                left: { type: 'Identifier', name: 'ei' },
                operator: '+',
                right: { type: 'Identifier', name: 'step' },
              }
            }],
            kind: 'let'
          },
          test: {
            type: 'BinaryExpression',
            left: { type: 'Identifier', name: 'i' },
            operator: '>=',
            right: { type: 'Identifier', name: 'si' },
          },
          update: {
            type: 'AssignmentExpression',
            left: { type: 'Identifier', name: 'i' },
            operator: '+=',
            right: { type: 'Identifier', name: 'step' },
          },
          body: {
            type: 'ExpressionStatement',
            expression: {
              type: 'YieldExpression',
              argument: { type: 'Identifier', name: 'i' }
            }
          }
        }]
      },
      alternate: {
        type: 'BlockStatement',
        body: [{
          type: 'ForStatement',
          init: {
            type: 'VariableDeclaration',
            declarations: [{
              type: 'VariableDeclarator',
              id: { type: 'Identifier', name: 'i' },
              init: { type: 'Identifier', name: 'si' }
            }],
            kind: 'let'
          },
          test: {
            type: 'BinaryExpression',
            left: { type: 'Identifier', name: 'i' },
            operator: '<',
            right: { type: 'Identifier', name: 'ei' },
          },
          update: {
            type: 'AssignmentExpression',
            left: { type: 'Identifier', name: 'i' },
            operator: '+=',
            right: { type: 'Identifier', name: 'step' },
          },
          body: {
            type: 'ExpressionStatement',
            expression: {
              type: 'YieldExpression',
              argument: { type: 'Identifier', name: 'i' }
            }
          }
        }]
      }
    }]
  }
};

export function* Evaluate_SliceExpression(SliceExpression) {
  Assert(SliceExpression.startIndex);
  Assert(SliceExpression.endIndex);
  let step = new Value(1);

  const start = Q(GetValue(yield* Evaluate(SliceExpression.startIndex)));
  const end = Q(GetValue(yield* Evaluate(SliceExpression.endIndex)));
  if (SliceExpression.step) {
    step = Q(GetValue(yield* Evaluate(SliceExpression.step)));
  }
  
  const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
 
  const func = X(GeneratorFunctionCreate('Normal', SliceGeneratorExpression.params, SliceGeneratorExpression, scope));

  return Call(func, Value.undefined, [start, end, step])
}

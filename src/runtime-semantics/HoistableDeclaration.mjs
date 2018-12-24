import {
  isAsyncFunctionDeclaration,
  isAsyncGeneratorDeclaration,
  isFunctionDeclaration,
  isGeneratorDeclaration,
} from '../ast.mjs';
import { Evaluate_FunctionDeclaration } from './all.mjs';
import { NormalCompletion } from '../completion.mjs';
import { OutOfRange } from '../helpers.mjs';

// 13.1.8 #sec-statement-semantics-runtime-semantics-evaluation
//   HoistableDeclaration :
//     GeneratorDeclaration
//     AsyncFunctionDeclaration
//     AsyncGeneratorDeclaration
//     FunctionDeclaration
export function Evaluate_HoistableDeclaration(HoistableDeclaration) {
  switch (true) {
    case isGeneratorDeclaration(HoistableDeclaration):
    case isAsyncFunctionDeclaration(HoistableDeclaration):
    case isAsyncGeneratorDeclaration(HoistableDeclaration):
      return new NormalCompletion(undefined);

    case isFunctionDeclaration(HoistableDeclaration):
      return Evaluate_FunctionDeclaration(HoistableDeclaration);

    default:
      throw new OutOfRange('Evaluate_HoistableDeclaration', HoistableDeclaration);
  }
}

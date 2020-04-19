import { Evaluate_StatementList } from './all.mjs';

// #sec-module-semantics-runtime-semantics-evaluation
// ModuleBody : ModuleItemList
export function Evaluate_ModuleBody({ ModuleItemList }) {
  return Evaluate_StatementList(ModuleItemList);
}

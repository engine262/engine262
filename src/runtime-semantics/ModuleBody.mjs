import { Evaluate_StatementList } from './all.mjs';

/** http://tc39.es/ecma262/#sec-module-semantics-runtime-semantics-evaluation  */
// ModuleBody : ModuleItemList
export function Evaluate_ModuleBody({ ModuleItemList }) {
  return Evaluate_StatementList(ModuleItemList);
}

import { Evaluate_StatementList } from './all.mjs';

// ScriptBody : StatementList
export function Evaluate_ScriptBody(ScriptBody) {
  return Evaluate_StatementList(ScriptBody.StatementList);
}

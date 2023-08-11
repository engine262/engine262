import type { ParseNode } from '../parser/ParseNode.mjs';
import { Evaluate_StatementList } from './all.mjs';

// ScriptBody : StatementList
export function Evaluate_ScriptBody(ScriptBody: ParseNode.ScriptBody) {
  return Evaluate_StatementList(ScriptBody.StatementList);
}

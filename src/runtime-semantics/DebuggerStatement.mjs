import { surroundingAgent } from '../engine.mjs';
import { Q } from '../completion.mjs';

// 13.16.1 #sec-debugger-statement-runtime-semantics-evaluation
// DebuggerStatement : `debugger` `;`
export function Evaluate_DebuggerStatement() {
  if (surroundingAgent.hostDefinedOptions.onDebugger) {
    Q(surroundingAgent.hostDefinedOptions.onDebugger());
  }
}

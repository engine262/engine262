import { surroundingAgent } from '../engine.mjs';

// #sec-debugger-statement-runtime-semantics-evaluation
// DebuggerStatement : `debugger` `;`
export function Evaluate_DebuggerStatement() {
  const realm = surroundingAgent.currentRealmRecord;
  if (realm.hostDefinedOptions.onDebugger) {
    realm.hostDefinedOptions.onDebugger();
  }
}

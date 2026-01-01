import { surroundingAgent } from '../host-defined/engine.mts';
import {
  NullValue,
} from '../value.mts';

/** Used in the inspector infrastructure to track the real source (or compiled) */
export function getActiveScriptId(): string | undefined {
  for (let i = surroundingAgent.executionContextStack.length - 1; i >= 0; i -= 1) {
    const e = surroundingAgent.executionContextStack[i];
    if (e.HostDefined?.scriptId) {
      return e.HostDefined.scriptId;
    }
    if (!(e.ScriptOrModule instanceof NullValue)) {
      const fromScript = e.ScriptOrModule.HostDefined.scriptId;
      if (fromScript) {
        return fromScript;
      }
    }
  }
  return undefined;
}

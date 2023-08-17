// @ts-nocheck
import { surroundingAgent } from '../engine.mjs';

/** https://tc39.es/proposal-async-context/#sec-asynccontextsnapshot */
export function AsyncContextSnapshot() {
  // 1. Let agentRecord be the surrounding agent's Agent Record.
  // 2. Return agentRecord.[[AsyncContextMapping]].
  return surroundingAgent.AgentRecord.AsyncContextMapping;
}

/** https://tc39.es/proposal-async-context/#sec-asynccontextswap */
export function AsyncContextSwap(snapshotMapping) {
  // 1. Let agentRecord be the surrounding agent's Agent Record.
  // 2. Let asyncContextMapping be agentRecord.[[AsyncContextMapping]].
  const asyncContextMapping = surroundingAgent.AgentRecord.AsyncContextMapping;
  // 3. Set agentRecord.[[AsyncContextMapping]] to snapshotMapping.
  surroundingAgent.AgentRecord.AsyncContextMapping = snapshotMapping;
  // 4. Return asyncContextMapping.
  return asyncContextMapping;
}

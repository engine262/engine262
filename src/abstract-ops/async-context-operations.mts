// @ts-nocheck
import { surroundingAgent } from '../engine.mjs';
import { Assert } from './all.mjs';

/** https://tc39.es/proposal-async-context/#sec-asynccontextsnapshot */
export function AsyncContextSnapshot() {
  Assert(surroundingAgent.AgentRecord.AsyncContextMapping instanceof Map);
  // 1. Let agentRecord be the surrounding agent's Agent Record.
  // 2. Return agentRecord.[[AsyncContextMapping]].
  return surroundingAgent.AgentRecord.AsyncContextMapping;
}

/** https://tc39.es/proposal-async-context/#sec-asynccontextswap */
export function AsyncContextSwap(snapshotMapping) {
  Assert(snapshotMapping instanceof Map);
  // 1. Let agentRecord be the surrounding agent's Agent Record.
  // 2. Let asyncContextMapping be agentRecord.[[AsyncContextMapping]].
  const asyncContextMapping = surroundingAgent.AgentRecord.AsyncContextMapping;
  Assert(asyncContextMapping instanceof Map);
  // 3. Set agentRecord.[[AsyncContextMapping]] to snapshotMapping.
  surroundingAgent.AgentRecord.AsyncContextMapping = snapshotMapping;
  // 4. Return asyncContextMapping.
  return asyncContextMapping;
}

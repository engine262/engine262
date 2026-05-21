/* eslint-disable no-await-in-loop */
/* eslint-disable quotes */
import { expect, test } from 'vitest';
import {
  Agent, ManagedRealm, setSurroundingAgent,
} from '#self';

test('evaluateModule', async () => {
  const agent = new Agent({
    onDebugger() {
      setTimeout(() => {
        agent.resumeEvaluate({});
      }, 10);
    },
  });
  setSurroundingAgent(agent);
  const realm = new ManagedRealm();
  let c;
  realm.evaluateModule('debugger; globalThis.x = 1;', undefined, (completion) => {
    c = completion;
  });
  if (!c) agent.resumeEvaluate({});
  expect(realm.GlobalObject.properties.has('x')).toBeTruthy();
});

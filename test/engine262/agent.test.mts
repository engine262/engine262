/* eslint-disable no-await-in-loop */
/* eslint-disable quotes */
import { expect, test } from 'vitest';
import {
  Agent, ManagedRealm, setSurroundingAgent,
} from '#self';

test('evaluateModule', () => {
  const { promise, resolve } = Promise.withResolvers<void>();
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
    expect(realm.GlobalObject.properties.has('x')).toBeTruthy();
    resolve();
  });
  if (!c) agent.resumeEvaluate({});
  return promise;
});

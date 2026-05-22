/* eslint-disable no-await-in-loop */
/* eslint-disable quotes */
import { expect, test } from 'vitest';
import {
  Agent, composeModuleLoaders, ManagedRealm, setSurroundingAgent,
} from '#self';

test('evaluateModule', async () => {
  const { promise, resolve } = Promise.withResolvers<void>();
  const agent = new Agent({
    onDebugger() {
      setTimeout(() => {
        agent.resumeEvaluate({});
      }, 0);
    },
  });
  setSurroundingAgent(agent);
  const realm = new ManagedRealm();
  realm.evaluateModule('debugger; globalThis.x = 1;', undefined, () => {
    resolve();
  });
  await promise;
  expect(realm.GlobalObject.properties.has('x')).toBeTruthy();
});

test('evaluateModule with async module loader', async () => {
  const { promise, resolve } = Promise.withResolvers<void>();
  let loadedDep = false;
  const agent = new Agent({
    hostHooks: {
      HostLoadImportedModule: composeModuleLoaders([
        (_referrer, moduleRequest, _hostDefined, finish) => {
          if (moduleRequest.Specifier !== 'dep') {
            finish(undefined);
            return;
          }
          loadedDep = true;
          setTimeout(() => {
            finish(realm.compileModule('globalThis.dep = 1;', { specifier: 'dep' }));
          }, 10);
        },
      ]),
    },
    onDebugger() {
      setTimeout(() => {
        agent.resumeEvaluate({});
      }, 0);
    },
  });
  setSurroundingAgent(agent);
  const realm = new ManagedRealm();
  realm.evaluateModule('import "dep"; debugger; globalThis.x = globalThis.dep;', undefined, () => {
    resolve();
  });
  await promise;
  expect(loadedDep).toBeTruthy();
  expect(realm.GlobalObject.properties.has('x')).toBeTruthy();
});

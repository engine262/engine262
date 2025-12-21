/* eslint-disable no-await-in-loop */
/* eslint-disable quotes */
import { expect, test } from 'vitest';
import { TestInspector } from './utils.mts';
import {
  Agent, Construct, CreateBuiltinFunction, Descriptor, evalQ, getHostDefinedErrorStack, ManagedRealm, setSurroundingAgent,
  surroundingAgent,
  Value,
  type ShadowRealmObject,
} from '#self';

test('code in eval', async () => {
  const agent = new Agent();
  setSurroundingAgent(agent);
  const inspector = new TestInspector();
  const realm = new ManagedRealm();
  inspector.attachAgent(agent, [realm]);
  const messages: unknown[] = [];
  realm.scope(() => {
    realm.GlobalObject.properties.set('e', new Descriptor({
      Value: CreateBuiltinFunction.from(function* e(e = Value.undefined) {
        messages.push(getHostDefinedErrorStack(e)?.map((f) => f.toCallFrame()));
      }),
    }));
  });

  await inspector.eval([
    `e(new Error());`,
    `function f() {
      e(new Error());
    };
    f();`,
  ].map((code) => `eval(\`${code}\`)`).join('\n'));
  expect(messages).matchSnapshot();
});

test('code in new Function', async () => {
  const agent = new Agent();
  setSurroundingAgent(agent);
  const inspector = new TestInspector();
  const realm = new ManagedRealm();
  inspector.attachAgent(agent, [realm]);
  const messages: unknown[] = [];
  realm.scope(() => {
    realm.GlobalObject.properties.set('e', new Descriptor({
      Value: CreateBuiltinFunction.from(function* e(e = Value.undefined) {
        messages.push(getHostDefinedErrorStack(e)?.map((f) => f.toCallFrame()));
      }),
    }));
  });

  await inspector.eval(`
    new Function(\`
      function x() {
        e(new Error());
      }
      function y() {
        x()
      }
      return y\`)()()
  `);
  expect(messages).matchSnapshot();
});

test('code in ShadowRealm', async () => {
  const agent = new Agent();
  setSurroundingAgent(agent);
  const inspector = new TestInspector();
  const realm = new ManagedRealm();
  inspector.attachAgent(agent, [realm]);
  const messages: unknown[] = [];
  realm.scope(() => {
    evalQ((_Q, X) => {
      const shadowRealm = X(Construct(surroundingAgent.intrinsic('%ShadowRealm%'))) as ShadowRealmObject;
      realm.GlobalObject.properties.set('r', new Descriptor({
        Value: shadowRealm,
      }));
      shadowRealm.ShadowRealm.GlobalObject.properties.set('e', new Descriptor({
        Value: CreateBuiltinFunction.from(function* e(e = Value.undefined) {
          messages.push(getHostDefinedErrorStack(e)?.map((f) => f.toCallFrame()));
        }),
      }));
    });
  });

  await inspector.eval(`
    r.evaluate('e(new Error())');
  `);
  expect(messages).matchSnapshot();
});

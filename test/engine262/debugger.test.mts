/* eslint-disable no-await-in-loop */
/* eslint-disable quotes */
import { expect, test } from 'vitest';
import {
  Agent, evalQ, ManagedRealm, NormalCompletion, NumberValue, R, setSurroundingAgent,
  surroundingAgent,
  UndefinedValue,
  Value,
  type ValueCompletion,
} from '#self';

test('debugger statement should return undefined when no debugger is attached', async () => {
  const agent = new Agent();
  setSurroundingAgent(agent);
  const realm = new ManagedRealm();
  const result = realm.evaluateScript('debugger;') as NormalCompletion<UndefinedValue>;
  expect(result).toBeInstanceOf(NormalCompletion);
  expect(result.Value).toBe(Value.undefined);
});

test('debugger statement should return the value passed to resumeEvaluate', async () => {
  const agent = new Agent({
    onDebugger() {
    },
  });
  setSurroundingAgent(agent);
  const realm = new ManagedRealm();
  evalQ((_Q, X) => {
    const script = X(realm.compileScript('debugger;'));
    let completion!: ValueCompletion;
    realm.evaluate(script, (c) => {
      completion = c;
    });
    // start the evaluation
    X(surroundingAgent.resumeEvaluate({}));
    // paused at the debugger statement, resume with a value
    X(surroundingAgent.resumeEvaluate({
      debuggerStatementCompletion: NormalCompletion(Value(42)),
    }));
    expect(completion).toBeDefined();
    const value = X(completion) as NumberValue;
    expect(value).toBeInstanceOf(NumberValue);
    expect(R(value)).toBe(42);
  });
});

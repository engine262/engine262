/* eslint-disable quotes */
import { expect, test } from 'vitest';
import {
  Agent,
  type EventLoop,
  MicroTaskEventLoop,
  WebLikeEventLoop,
  type Job,
  Value,
  setSurroundingAgent,
  NodeJSLikeEventLoop,
} from '#self';

type EventLoopCtor<T extends EventLoop> = new (agent: Agent) => T;

function createTrackedJob(
  queueName: string,
  calls: string[],
  onRun?: () => void,
): Job {
  return {
    queueName,
    job: function* job() {
      calls.push(queueName);
      onRun?.();
      return Value.undefined;
    },
    callerRealm: undefined,
    callerScriptOrModule: Value.null,
  };
}

function createAgentWithEventLoop<T extends EventLoop>(EventLoop: EventLoopCtor<T>) {
  const agent = new Agent({ startEventLoop: false, eventLoop: (agent) => new EventLoop(agent) });
  setSurroundingAgent(agent);
  return { agent, eventLoop: agent.eventLoop };
}

test('MicroTaskEventLoop drains jobs in enqueue order', () => {
  const calls: string[] = [];
  const { agent, eventLoop } = createAgentWithEventLoop(MicroTaskEventLoop);

  agent.jobQueue.enqueueGenericJob(createTrackedJob('micro-1', calls));
  agent.eventLoop.enqueue('custom', createTrackedJob('custom-1', calls));
  agent.jobQueue.enqueueGenericJob(createTrackedJob('micro-2', calls));
  expect(calls).toEqual([]);
  eventLoop.run('automatic');

  expect(calls.join(',')).toMatchInlineSnapshot(`"micro-1,custom-1,micro-2"`);
});

test('MicroTaskEventLoop reruns when a job enqueues more work', () => {
  const calls: string[] = [];
  const { agent, eventLoop } = createAgentWithEventLoop(MicroTaskEventLoop);

  agent.jobQueue.enqueueGenericJob(createTrackedJob('micro-1', calls, () => {
    agent.jobQueue.enqueueGenericJob(createTrackedJob('micro-2', calls));
  }));
  expect(calls).toEqual([]);
  eventLoop.run('automatic');

  expect(calls.join(',')).toMatchInlineSnapshot(`"micro-1,micro-2"`);
});

test('WebLikeEventLoop keeps microtasks ahead of macrotasks', () => {
  const calls: string[] = [];
  const { agent, eventLoop } = createAgentWithEventLoop(WebLikeEventLoop);

  agent.jobQueue.enqueueGenericJob(createTrackedJob('microtask', calls));
  eventLoop.enqueue('timers', createTrackedJob('timer', calls));
  eventLoop.enqueue('check', createTrackedJob('check', calls));
  agent.jobQueue.enqueueGenericJob(createTrackedJob('microtask-2', calls));
  expect(calls).toEqual([]);
  eventLoop.run('automatic');

  expect(calls.join(',')).toMatchInlineSnapshot(`"microtask,microtask-2,timer,check"`);
});

test('NodeJSLikeEventLoop keeps microtasks ahead of macrotasks', () => {
  const calls: string[] = [];
  const { agent, eventLoop } = createAgentWithEventLoop(NodeJSLikeEventLoop);

  agent.jobQueue.enqueueGenericJob(createTrackedJob('microtask', calls));
  eventLoop.enqueue('check', createTrackedJob('check', calls));
  eventLoop.enqueue('timers', createTrackedJob('timer', calls));
  agent.jobQueue.enqueueGenericJob(createTrackedJob('microtask-2', calls));
  expect(calls).toEqual([]);
  eventLoop.run('automatic');

  expect(calls.join(',')).toMatchInlineSnapshot(`"microtask,microtask-2,timer,check"`);
});

/* eslint-disable no-console */
import { styleText } from 'util';
import { type WriteStream } from 'fs';
import * as React from 'react';
import {
  render, Text, useApp, useInput, useStdout,
} from 'ink';
import { TaskList, Task } from 'ink-task-list';
import { BarChart } from '@pppp606/ink-chart';
import { link, type Test } from './base.mts';

const { createElement: h } = React;
export const isCI = process.env.CI && process.env.CONTINUOUS_INTEGRATION;
export const supportColor = !isCI && styleText('red', 'test') !== 'test';

function Fragment(...children: (React.JSX.Element | null)[]) {
  return h(React.Fragment, null, ...children);
}

// from https://github.com/sindresorhus/cli-spinners
const spinner = {
  interval: 80,
  frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
};

const quitMessage = [styleText('gray', 'Press '), styleText('yellow', 'q'), styleText('gray', ' to exit.')].join('');
function TerminalUI({ runner }: { runner: TerminalUIReporter }) {
  useFlushStdout(runner);
  const exiting = useExit(runner);

  const tasks = useWorkers(runner);
  const runtime = JSON.parse(useRuntimeUpdate(runner)) as number[];
  const needPad = runtime.some((time) => time >= runner.slowThreshold);
  const runtimePadLength = needPad ? String(Math.max(...runtime)).length : 0;
  const previous = React.useRef<number[]>([]);

  return Fragment(
    h(ProgressBar, { runner, running: !exiting, exiting }),
    h(
      TaskList,
      null,
      ...(exiting ? [] : tasks).map((test, index) => {
        previous.current.length = tasks.length;
        previous.current[index] = test?.id ?? previous.current[index];

        let label: string;
        let padding = '';
        let status = '';
        let state: 'loading' | 'success' = 'loading';
        if (test) {
          label = test.file;
          status = test.currentTestFlag;
          if (runtime[index] >= runner.slowThreshold) {
            padding = styleText('red', `[${String(runtime[index]).padStart(runtimePadLength)}s] `);
          }
        } else {
          let test = runner.tests.get(previous.current[index]);
          if (test && (Date.now() - test.endTime! > 200)) {
            test = undefined;
          }
          label = styleText('dim', test?.file ?? 'Idle');
          status = test?.currentTestFlag ?? '';
          state = test ? 'loading' : 'success';
          if (!test && needPad) {
            padding = ' '.repeat(runtimePadLength + 3);
          }
        }
        if (!padding && needPad) {
          padding = ' '.repeat(runtimePadLength + 4);
        }
        label = `${padding}${label}`;

        return h(Task, {
          key: index, label, state, spinner, status,
        });
      }),
    ),
  );
}

function ProgressBar({ runner, running, exiting }: { runner: TestReporter, running: boolean, exiting: boolean }) {
  const stats = useStats(runner);
  if (!stats) {
    return null;
  }
  const {
    failed, passed, pending, skipped, total, ready,
  } = stats;
  if (!ready && running) {
    return h(
      Text,
      null,
      `Discovering tests... ${total} found so far. ${passed} passed, ${skipped} skipped, ${failed} failed, ${pending} pending. `,
      exiting ? '' : quitMessage,
    );
  }
  return Fragment(
    h(Text, null, `${total} tests in total. `, exiting ? '' : quitMessage),
    h(
      BarChart,
      {
        data: [
          { label: `${passed} passed`, value: passed, color: 'green' },
          { label: `${skipped} skipped`, value: skipped, color: 'yellow' },
          { label: `${failed} failed`, value: failed, color: 'red' },
          running || pending ? { label: `${pending} pending`, value: pending, color: 'cyan' } : null!,
        ].filter(Boolean),
        width: 'full',
        max: total,
      },
    ),
  );
}

function useStats(runner: TestReporter) {
  return React.useSyncExternalStore(
    (onUpdate) => {
      runner.addEventListener('stats', onUpdate);
      return () => runner.removeEventListener('stats', onUpdate);
    },
    () => runner.getStats(),
  );
}

function useWorkers(runner: TestReporter) {
  return React.useSyncExternalStore(
    (onUpdate) => {
      runner.addEventListener('update', onUpdate);
      return () => runner.removeEventListener('update', onUpdate);
    },
    () => runner.workers,
  );
}

function useRuntimeUpdate(runner: TestReporter) {
  return React.useSyncExternalStore(
    (onUpdate) => {
      runner.addEventListener('update', onUpdate);
      return () => runner.removeEventListener('update', onUpdate);
    },
    () => JSON.stringify(
      runner.workers.map((test) => test?.getRuntimeSeconds()),
    ),
  );
}

function useExit(runner: TestReporter) {
  const exitRequested = React.useSyncExternalStore(
    (onExit) => {
      runner.addEventListener('exit', onExit);
      return () => runner.removeEventListener('exit', onExit);
    },
    () => runner.exited,
  );
  const { exit } = useApp();
  const [previousExitState, setExitState] = React.useState<boolean>(false);
  if (exitRequested && !previousExitState) {
    setExitState(true);
    setTimeout(exit, 10);
  }
  useInput((input, key) => {
    if (input === 'q' || (key.ctrl && input === 'c')) {
      setExitState(true);
      runner.exit();
    }
  });
  return previousExitState;
}

function useFlushStdout(runner: TerminalUIReporter) {
  const stdout = useStdout();
  React.useEffect(() => {
    function flush() {
      stdout.write(runner.pending_stdout.join(''));
      runner.pending_stdout.length = 0;
    }
    runner.addEventListener('flush', flush);
    return () => runner.removeEventListener('flush', flush);
  });
}

export type SkipReason = 'feature-disabled' | 'skip-list' | 'slow-list';

export abstract class TestReporter extends EventTarget {
  tests: Map<number, Test> = new Map();

  workers: (Test | undefined)[] = [];

  protected skipped = 0;

  protected passed = 0;

  protected failed = 0;

  protected ready = false;

  setSlowTestReporting(threshold: number, stream: WriteStream) {
    this.slowThreshold = threshold;
    this.slowStream = stream;
  }

  slowThreshold = 2;

  protected slowStream: WriteStream | null = null;

  protected stats: { total: number; pending: number; passed: number; failed: number; skipped: number; ready: boolean } = this.getStats();

  protected statsStale = false;

  getStats() {
    if (!this.statsStale) {
      return this.stats;
    }
    this.statsStale = false;
    this.stats = {
      total: this.tests.size,
      pending: this.tests.size - this.passed - this.failed - this.skipped,
      passed: this.passed,
      failed: this.failed,
      skipped: this.skipped,
      ready: this.ready,
    };
    return this.stats;
  }

  exited = false;

  abstract stdout(...message: string[]): void

  abstract start(): void

  protected slowTimer: NodeJS.Timeout | null = null;

  protected startSlowTimer() {
    const seenSlow = new Set<string>();
    this.slowTimer = setInterval(() => {
      let hasSlow = false;
      for (const test of this.tests.values()) {
        if (test.getRuntimeSeconds() >= this.slowThreshold) {
          if (this.slowStream && !seenSlow.has(test.file)) {
            this.slowStream?.write(`${test.file}\n`);
            seenSlow.add(test.file);
          }
          hasSlow = true;
        }
      }
      if (hasSlow) {
        this.dispatchEvent(new Event('update'));
      }
    }, 400);
  }

  allTestsDiscovered() {
    this.ready = true;
    this.statsStale = true;
    this.dispatchEvent(new Event('stats'));
  }

  onExit = Promise.withResolvers<void>();

  exit() {
    this.exited = true;
    if (this.slowTimer) {
      clearInterval(this.slowTimer);
      this.slowTimer = null;
    }
    this.dispatchEvent(new Event('exit'));
  }

  addTest(test: Test) {
    this.tests.set(test.id, test);
    this.statsStale = true;
  }

  updateWorker(workerId: number, taskId: number | null) {
    if (this.workers.length <= workerId) {
      const next = [...this.workers];
      next.length = workerId + 1;
      this.workers = next;
    }
    if (taskId === null) {
      this.workers = this.workers.with(workerId, undefined);
    } else {
      const test = this.tests.get(taskId)!;
      test.status = 'running';
      test.startTime = Date.now();
      this.workers = this.workers.with(workerId, test!);
    }
    this.statsStale = true;
    this.dispatchEvent(new Event('update'));
  }

  skipTest(testId: number, reason: SkipReason, feature?: string) {
    const test = this.tests.get(testId)!;
    test.status = 'skipped';
    test.skipReason = reason;
    test.skipFeature = feature ?? null;
    this.skipped += 1;
    this.statsStale = true;
    test.endTime = Date.now();
    this.dispatchEvent(new Event('stats'));
  }

  testFailed(testId: number) {
    const test = this.tests.get(testId);
    this.failed += 1;
    this.statsStale = true;
    test!.status = 'failed';
    test!.endTime = Date.now();
    this.dispatchEvent(new Event('stats'));
  }

  assertFailedTestFails(testId: number) {
    this.testPassed(testId);
  }

  testPassed(testId: number) {
    const test = this.tests.get(testId);
    test!.status = 'passed';
    test!.endTime = Date.now();
    this.passed += 1;
    this.statsStale = true;
    this.dispatchEvent(new Event('stats'));
  }
}

class BasicReporter extends TestReporter {
  stdout(...message: string[]): void {
    process.stdout.write(message.join(''));
  }

  start(): void {
    this.timer = setInterval(() => {
      if (this.ready) {
        console.log(`Total ${this.tests.size}, ${this.passed} passed, ${this.skipped} skipped, ${this.failed} failed, ${this.tests.size - this.passed - this.failed} pending`);
      } else {
        console.log(`Total ${this.tests.size}, ${this.passed} passed, ${this.skipped} skipped, ${this.failed} failed`);
      }
      const seen = new Set();
      this.workers.forEach((task) => {
        if (!task || seen.has(task.file)) {
          return;
        }
        seen.add(task.file);
        const time = task?.getRuntimeSeconds() || 0;
        if (time >= this.slowThreshold) {
          console.log(`${task?.file} is slow. Taking ${time}s.`);
        }
      });
    }, 1000);
  }

  private timer: NodeJS.Timeout | undefined;

  override exit(): void {
    super.exit();
    clearInterval(this.timer);
    this.onExit.resolve();
  }
}
class TerminalUIReporter extends TestReporter {
  pending_stdout: string[] = [];

  stdout(...message: string[]) {
    this.pending_stdout.push(...message);
    this.statsStale = true;
    this.dispatchEvent(new Event('flush'));
  }

  start() {
    render(h(TerminalUI, { runner: this }), { incrementalRendering: true, exitOnCtrlC: false }).waitUntilExit().then(this.onExit.resolve);
    this.startSlowTimer();
  }

  override exit() {
    super.exit();
    process.stdin.setRawMode(false);
  }
}

export function createTestReporter(): TestReporter {
  if (isCI) {
    return new BasicReporter();
  } else {
    return new TerminalUIReporter();
  }
}

export function annotateFileWithURL(filePath: string) {
  if (supportColor) {
    const fileLink = link(filePath, new URL(`./test262/test/${filePath}`, import.meta.url));
    return `${fileLink} ${link('[GitHub]', `https://github.com/tc39/test262/blob/main/test/${filePath}`)}`;
  }
  return filePath;
}

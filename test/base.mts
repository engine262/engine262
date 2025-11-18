// @ts-check
import readline from 'node:readline';
import os from 'node:os';
import fs from 'node:fs';
import util from 'node:util';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

process.on('unhandledRejection', (reason) => {
  fs.writeSync(0, `\n${util.inspect(reason)}\n`);
  process.exit(1);
});

export const CI = !!process.env.CONTINUOUS_INTEGRATION;
export const NUM_WORKERS = process.env.NUM_WORKERS
  ? Number.parseInt(process.env.NUM_WORKERS, 10)
  : Math.round(os.cpus().length * 0.75);

const ANSI = CI ? {
  reset: '',
  red: '',
  green: '',
  yellow: '',
  blue: '',
} : {
  reset: '\u001b[0m',
  red: '\u001b[31m',
  green: '\u001b[32m',
  yellow: '\u001b[33m',
  blue: '\u001b[34m',
};

const start = Date.now();
const handledPerSecLast5: number[] = [];

let handledPerSecCounter = 0;
let skipped = 0;
let passed = 0;
export let failed = 0;
let total = 0;
const running: [file: string, flags: string, since: number][] = new Array(NUM_WORKERS).fill(['', Date.now()]);
export const pendingWork: number[] = new Array(NUM_WORKERS).fill(0);
const TEST262 = process.env.TEST262 || path.resolve(import.meta.dirname, 'test262', 'test262');
const TEST262_TESTS = path.join(TEST262, 'test');

let slowTestThreshold = Infinity;
let slowTestCallback: (newSlowTestFound: string) => void = () => { };
export function setSlowTestThreshold(threshold: number, callback: (newSlowTestFound: string) => void) {
  slowTestThreshold = threshold;
  slowTestCallback = callback;
}

const pad = (n: number, l: number, c = '0') => n.toString().padStart(l, c);
const average = (array: readonly number[]) => (array.reduce((a, b) => a + b, 0) / array.length) || 0;
const workerPadding = running.length.toString().length;

export function printStatusLine() {
  const elapsed = Math.floor((Date.now() - start) / 1000);
  const min = Math.floor(elapsed / 60);
  const sec = elapsed % 60;

  const time = `${pad(min, 2)}:${pad(sec, 2)}`;
  const found = `${ANSI.blue}All ${pad(total, 5, ' ')}${ANSI.reset}`;
  const l = `⏳ ${pad(total - passed - failed - skipped, 5, ' ')}`;
  const p = `${ANSI.green}✅ ${pad(passed, 5, ' ')}${ANSI.reset}`;
  const f = `${ANSI.red}❌ ${pad(failed, 5, ' ')}${ANSI.reset}`;
  const s = `${ANSI.yellow}⏭️ ${pad(skipped, 5, ' ')}${ANSI.reset}`;
  const testsPerSec = average(handledPerSecLast5);

  const line = `[${time}|${found}|${l}|${p}|${f}|${s}] (${testsPerSec.toFixed(2)}/s)`;
  process.stdout.clearLine(0);
  process.stdout.write(`${line}${CI ? '\n' : ''}`);
  readline.cursorTo(process.stdout, 0);
}
function printStatusUI() {
  const maxLineLength = process.stdout.columns;

  if (!CI) {
    const now = Date.now();
    const workerLines = running.map(({ 0: test, 1: flags, 2: since }, index): [text: string, lengthOffset: number] => {
      let lengthOffset = ANSI.green.length + ANSI.reset.length;
      const workerName = `${ANSI.green}Worker ${String(index).padStart(workerPadding)}${ANSI.reset} [${pendingWork[index]}]`;
      if (!test) {
        return [`${workerName}: ${ANSI.green}idle${ANSI.reset}`, lengthOffset * 2];
      }

      const taskName = flags ? `[${ANSI.blue}${flags.padStart(6)}${ANSI.reset}] ${test}` : test;
      if (flags) {
        lengthOffset += ANSI.blue.length + ANSI.reset.length;
      }
      const timeInSec = ~~((now - since) / 1000);
      if (timeInSec < 3) {
        return [`${workerName}: ${taskName}`, lengthOffset];
      }
      if (timeInSec > slowTestThreshold) {
        slowTestCallback(test);
      }
      lengthOffset += ANSI.red.length + ANSI.reset.length;
      const time = `${ANSI.red + timeInSec.toString().padStart(2)}s${ANSI.reset}`;
      return [`${workerName}: [${time}] ${taskName}`, lengthOffset];
    });
    readline.clearLine(process.stdout, 0);
    process.stdout.write('\n');
    for (let i = 0; i < workerLines.length; i += 1) {
      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);
      process.stdout.write(`${workerLines[i][0].slice(0, maxLineLength + workerLines[i][1] - 1)}\n`);
    }
    readline.clearLine(process.stdout, 0);
    process.stdout.write('\n');
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
  } else {
    const now = Date.now();
    running.forEach(({ 0: test, 2: since }) => {
      if (!test) {
        return;
      }
      const timeInSec = ~~((now - since) / 1000);
      if (timeInSec < 20) {
        return;
      }
      process.stdout.write(`Slow test: ${test} has been running for ${timeInSec} seconds.\n`);
    });
  }
  printStatusLine();
  if (!CI) {
    readline.moveCursor(process.stdout, 0, -running.length - 2);
  }
}

setInterval(() => {
  handledPerSecLast5.unshift(handledPerSecCounter);
  handledPerSecCounter = 0;
  if (handledPerSecLast5.length > 5) {
    handledPerSecLast5.length = 5;
  }
}, 1000).unref();

export function incr_total() {
  total += 1;
}
export function pass(workerId: number) {
  running[workerId][0] = '';
  passed += 1;
  handledPerSecCounter += 1;
}
export function fail(workerId: number, name: string, desc: string | undefined, error: string) {
  running[workerId][0] = '';
  failed += 1;
  handledPerSecCounter += 1;
  process.exitCode = 1;
  readline.clearScreenDown(process.stdout);
  if (!CI) {
    const OSC = '\u001B]';
    const BEL = '\u0007';
    const SEP = ';';
    const fileName = name;
    name = `${OSC}8${SEP}${SEP}${pathToFileURL(path.resolve(TEST262_TESTS, fileName))}${BEL}${fileName}${OSC}8${SEP}${SEP}${BEL}`;
    name += ` ${OSC}8${SEP}${SEP}https://github.com/tc39/test262/blob/main/test/${fileName}${BEL}[GitHub]${OSC}8${SEP}${SEP}${BEL}`;
  }
  const line1 = `\n${ANSI.red}FAILED ${name}${ANSI.reset}\n`;
  const line2 = desc ? `  ${ANSI.yellow}${desc}${ANSI.reset}${desc.endsWith('\n') ? '' : '\n'}` : '';
  const line3 = `${error}\n`;
  process.stdout.write(`${line1}${line2}${line3}`);
}
export function fatal(message: string): never {
  process.exitCode = 1;
  readline.moveCursor(process.stdout, 0, -NUM_WORKERS - 2);
  readline.clearScreenDown(process.stdout);
  process.stderr.write(`\n${ANSI.red}ERROR: ${message}${ANSI.reset}\n\n`);
  process.exit(1);
}
export function skip(workerId?: number) {
  skipped += 1;
  if (workerId) {
    running[workerId][0] = '';
  }
  // doesn't count towards testsPerSec
}
export function run(workerId: number, test: string, flags: string) {
  running[workerId] = [test, flags, Date.now()];
}

export function startTestPrinter() {
  process.stdout.write(`
${ANSI.yellow}####### engine262 Test Runner #######${ANSI.reset}
`);

  printStatusUI();
  const i = setInterval(() => {
    printStatusUI();
  }, CI ? 5000 : 100).unref();
  return i;
}


export type Test = {
  file: string
  attrs: {
    description: string
    features?: string[]
    includes: string[]
    flags: {
      async?: boolean
      module?: boolean
      onlyStrict?: boolean
      noStrict?: boolean
      raw?: boolean
    }
    negative: {
      type: string
      phase: string
    }
  }
  flags: string
  contents: string
}

export type SupervisorToWorker = Test
export type WorkerToSupervisor =
  | { status: 'RUNNING'; file: string; flags: string; }
  | { status: 'PASS'; file: string; }
  | { status: 'FAIL'; file: string; flags: string; description: string; error: string }


export function readList(path: string) {
  const source = fs.readFileSync(path, 'utf8');
  return source.split('\n').filter((l) => l && !l.startsWith('#') && !l.startsWith(';')).map((x) => x.split('#')[0].split(';')[0].trim());
}

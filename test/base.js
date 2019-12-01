'use strict';

const readline = require('readline');
const os = require('os');

process.on('unhandledRejection', (reason) => {
  require('fs').writeSync(0, `\n${require('util').inspect(reason)}\n`);
  process.exit(1);
});

const CI = !!process.env.CONTINUOUS_INTEGRATION;

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

const CPU_COUNT = os.cpus().length;

let skipped = 0;
let passed = 0;
let failed = 0;
let total = 0;

const start = Date.now();

const handledPerSecLast5 = [];
const pad = (n, l, c = '0') => n.toString().padStart(l, c);
const average = (array) => (array.reduce((a, b) => a + b, 0) / array.length) || 0;

const printStatusLine = () => {
  const elapsed = Math.floor((Date.now() - start) / 1000);
  const min = Math.floor(elapsed / 60);
  const sec = elapsed % 60;

  const time = `${pad(min, 2)}:${pad(sec, 2)}`;
  const found = `${ANSI.blue}:${pad(total, 5, ' ')}${ANSI.reset}`;
  const p = `${ANSI.green}+${pad(passed, 5, ' ')}${ANSI.reset}`;
  const f = `${ANSI.red}-${pad(failed, 5, ' ')}${ANSI.reset}`;
  const s = `${ANSI.yellow}»${pad(skipped, 5, ' ')}${ANSI.reset}`;
  const testsPerSec = average(handledPerSecLast5);

  const line = `[${time}|${found}|${p}|${f}|${s}] (${testsPerSec.toFixed(2)}/s)`;

  if (!CI) {
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
  }
  process.stdout.write(`${line}${CI ? '\n' : ''}`);
};

let handledPerSecCounter = 0;

setInterval(() => {
  handledPerSecLast5.unshift(handledPerSecCounter);
  handledPerSecCounter = 0;
  if (handledPerSecLast5.length > 5) {
    handledPerSecLast5.length = 5;
  }
}, 1000).unref();

module.exports = {
  total() {
    total += 1;
  },
  pass() {
    passed += 1;
    handledPerSecCounter += 1;
  },
  fail(name, error) {
    failed += 1;
    handledPerSecCounter += 1;
    process.stderr.write(`\nFAILURE! ${name}\n${error}\n`);
  },
  skip() {
    skipped += 1;
    handledPerSecCounter += 1;
  },
  CPU_COUNT,
  CI,
};

process.stdout.write(`
#######################
 engine262 Test Runner
 Detected ${CPU_COUNT} CPUs
 ${CI ? 'Running' : 'Not running'} on CI
#######################

`);

printStatusLine();
setInterval(() => {
  printStatusLine();
}, CI ? 5000 : 500).unref();

process.on('exit', () => {
  printStatusLine();
});

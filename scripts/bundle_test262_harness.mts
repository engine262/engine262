import fs from 'fs';

const harnessDir = new URL('../test/test262/test262/harness/', import.meta.url);
fs.mkdirSync(new URL('../lib', import.meta.url), { recursive: true });
const outputFile = new URL('../lib/test262-harness.json', import.meta.url);

const harnessFiles = fs.readdirSync(harnessDir).filter((file) => file.endsWith('.js')).concat(
  fs.readdirSync(new URL('./sm', harnessDir)).filter((file) => file.endsWith('.js')).map((file) => `sm/${file}`),
);

const harnessContent: Record<string, string> = {};
for (const file of harnessFiles) {
  const content = fs.readFileSync(new URL(file, harnessDir), 'utf-8');
  harnessContent[file] = content;
}

fs.writeFileSync(outputFile, JSON.stringify(harnessContent, null, 2));

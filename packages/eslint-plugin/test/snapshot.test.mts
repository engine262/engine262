import { resolve } from 'node:path';
import { expect, test } from 'vitest';
import { generateRuleSnapshot, snapshots } from './snapshot-generator.mts';

const snapshotDirectory = resolve(import.meta.dirname, 'snapshot');

for (const { name, fixtures } of snapshots) {
  test(`snapshot ${name}`, async () => {
    await expect(generateRuleSnapshot(fixtures))
      .toMatchFileSnapshot(resolve(snapshotDirectory, `${name}.log`));
  });
}

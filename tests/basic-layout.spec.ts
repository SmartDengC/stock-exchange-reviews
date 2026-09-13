import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const basicLayout = readFileSync(
  resolve(process.cwd(), 'apps/web-antd/src/layouts/basic.vue'),
  'utf8',
);

describe('basic layout brand area', () => {
  it('routes brand clicks to the research overview', () => {
    expect(basicLayout).toContain("@click-logo=\"router.push('/')\"");
  });
});

// scripts/list-eligibility-canonicals.ts

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

interface CanonicalEligibility {
  key: string;
  canonical: string;
  category?: string;
  aliases: string[];
}

/**
 * Same parsing style as your pipeline:
 * supports:
 * - { eligibilities: [...] }
 * - { eligibilities: { ... } }
 * - top-level array
 * - top-level map
 */
function parseEligibilitiesYaml(doc: any): CanonicalEligibility[] {
  if (!doc) return [];

  const source = (doc as any).eligibilities ?? doc;
  const result: CanonicalEligibility[] = [];

  // List format
  if (Array.isArray(source)) {
    for (const item of source) {
      if (!item) continue;
      const key = (item as any).key || (item as any).id;
      if (!key || !(item as any).canonical) continue;

      result.push({
        key: String(key),
        canonical: String((item as any).canonical),
        category: (item as any).category,
        aliases: Array.isArray((item as any).aliases)
          ? (item as any).aliases.map((a: any) => String(a))
          : [],
      });
    }
    return result;
  }

  // Map format
  if (typeof source === 'object') {
    for (const [rawKey, value] of Object.entries(source)) {
      if (!value || typeof value !== 'object') continue;
      const v: any = value;
      const key = v.key || rawKey;
      const canonical = v.canonical;
      if (!key || !canonical) continue;

      const aliases: string[] = Array.isArray(v.aliases)
        ? v.aliases.map((a: any) => String(a))
        : [];

      result.push({
        key: String(key),
        canonical: String(canonical),
        category: v.category,
        aliases,
      });
    }
    return result;
  }

  return [];
}

async function main() {
  console.log('========================================');
  console.log('▶ LIST ALL CANONICAL ELIGIBILITIES');
  console.log('========================================');
  console.log('process.cwd() =', process.cwd());
  console.log('');

  try {
    const root = process.cwd();
    const eligPath = path.join(
      root,
      'src',
      'app',
      'config',
      'dictionaries',
      'eligibilities.yaml'
    );

    console.log('Reading:', eligPath);
    if (!fs.existsSync(eligPath)) {
      console.error('❌ eligibilities.yaml not found at this path.');
      process.exit(1);
    }

    const rawYaml = await fs.promises.readFile(eligPath, 'utf8');
    const doc = yaml.load(rawYaml);
    const eligList = parseEligibilitiesYaml(doc);

    console.log(`Total parsed eligibilities: ${eligList.length}`);
    console.log('');

    eligList.forEach((e, index) => {
      console.log(`${index + 1}. ${e.canonical}`);
    });

    console.log('');
    console.log('✅ Done listing canonical eligibilities.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error while listing eligibilities:', err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('❌ Unhandled error:', err);
  process.exit(1);
});

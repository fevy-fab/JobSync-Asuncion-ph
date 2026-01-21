// scripts/check-eligibilities-health.ts
//
// Run with:
//   npx ts-node scripts/check-eligibilities-health.ts
//
// This script:
//  - Loads src/app/config/dictionaries/eligibilities.yaml
//  - Parses it with the SAME logic as normalization.ts
//  - Normalizes alias strings the same way
//  - Reports:
//      * total eligibilities
//      * total aliases
//      * distinct normalized alias strings
//      * how many aliases are shared by multiple canonical keys (duplicates)
//      * top duplicate aliases and their keys

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

interface CanonicalEligibility {
  key: string;
  canonical: string;
  category?: string;
  aliases: string[];
}

// Same normalization as in normalization.ts
function normalizeKey(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ');
}

// Same parsing logic as parseEligibilitiesYaml in normalization.ts
function parseEligibilitiesYaml(doc: any): CanonicalEligibility[] {
  if (!doc) return [];

  const source = (doc as any).eligibilities ?? doc;
  const result: CanonicalEligibility[] = [];

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
  const root = process.cwd();
  const eligibilitiesPath = path.join(
    root,
    'src',
    'app',
    'config',
    'dictionaries',
    'eligibilities.yaml'
  );

  console.log('========================================');
  console.log('▶ ELIGIBILITIES DICTIONARY HEALTH CHECK');
  console.log('========================================');
  console.log('process.cwd() =', root);
  console.log('Using eligibilities.yaml =', eligibilitiesPath);

  if (!fs.existsSync(eligibilitiesPath)) {
    console.error('❌ eligibilities.yaml NOT FOUND at the expected path.');
    process.exit(1);
  }

  const raw = await fs.promises.readFile(eligibilitiesPath, 'utf8');
  const doc = yaml.load(raw);
  const eligList = parseEligibilitiesYaml(doc);

  console.log('\n1) BASIC COUNTS');
  console.log('----------------');
  console.log('Total canonical eligibilities:', eligList.length);

  let totalAliases = 0;
  let emptyAliasEntries = 0;
  const categoriesCount = new Map<string, number>();

  for (const e of eligList) {
    totalAliases += e.aliases.length;
    if (e.aliases.length === 0) {
      emptyAliasEntries++;
    }
    if (e.category) {
      const c = e.category;
      categoriesCount.set(c, (categoriesCount.get(c) ?? 0) + 1);
    }
  }

  console.log('Total alias strings (excluding canonical):', totalAliases);
  console.log('Entries with NO aliases:', emptyAliasEntries);
  console.log('Categories distribution:');
  for (const [cat, count] of categoriesCount.entries()) {
    console.log(`  - ${cat}: ${count}`);
  }

  console.log('\n2) NORMALIZED ALIAS DUPLICATE ANALYSIS');
  console.log('--------------------------------------');

  // alias → set of keys that use it
  const aliasToKeys = new Map<string, Set<string>>();

  for (const e of eligList) {
    // include canonical + aliases (how normalization.ts builds alias index)
    const allStrings = new Set<string>();
    allStrings.add(e.canonical);
    for (const a of e.aliases) {
      allStrings.add(a);
    }

    for (const s of allStrings) {
      const nk = normalizeKey(s);
      if (!nk) continue;

      if (!aliasToKeys.has(nk)) {
        aliasToKeys.set(nk, new Set());
      }
      aliasToKeys.get(nk)!.add(e.key);
    }
  }

  const totalNormalizedAliases = aliasToKeys.size;
  let duplicateAliasCount = 0;
  const duplicates: { alias: string; keys: string[] }[] = [];

  for (const [alias, keysSet] of aliasToKeys.entries()) {
    const keys = Array.from(keysSet);
    if (keys.length > 1) {
      duplicateAliasCount++;
      duplicates.push({ alias, keys });
    }
  }

  console.log('Distinct normalized alias strings (including canonical):', totalNormalizedAliases);
  console.log(
    'Aliases that map to MORE THAN ONE canonical key (potential duplicates/ambiguity):',
    duplicateAliasCount
  );

  // Sort duplicates by how many keys they hit (descending), then alphabetically
  duplicates.sort((a, b) => {
    if (b.keys.length !== a.keys.length) {
      return b.keys.length - a.keys.length;
    }
    return a.alias.localeCompare(b.alias);
  });

  console.log('\nTop duplicate aliases (up to 30):');
  for (let i = 0; i < Math.min(30, duplicates.length); i++) {
    const d = duplicates[i];
    console.log(
      `  ${i + 1}. "${d.alias}" → keys: ${d.keys.join(', ')} (count=${d.keys.length})`
    );
  }

  console.log('\n3) QUICK SANITY FLAGS');
  console.log('---------------------');
  if (duplicateAliasCount === 0) {
    console.log('✅ No normalized alias is shared by multiple eligibilities. Very clean.');
  } else {
    console.log(
      '⚠️ Some aliases are shared by multiple canonical keys. Review carefully if they are truly distinct eligibilities or should be merged.'
    );
  }

  console.log('\n✅ Eligibilities health check completed.');
}

main().catch((err) => {
  console.error('\n❌ Eligibilities health check FAILED');
  console.error(err);
  process.exit(1);
});

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
 * Same normalization as normalization.ts:
 * lowercase, strip punctuation, collapse spaces.
 */
function normalizeAlias(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ');
}

/**
 * Parse various eligibilities.yaml layouts into a flat list,
 * mirroring parseEligibilitiesYaml in the pipeline.
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
  console.log('▶ ELIGIBILITIES DUPLICATE CHECK');
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

    console.log('Using eligibilities.yaml at:', eligPath);
    if (!fs.existsSync(eligPath)) {
      console.error('❌ eligibilities.yaml not found at this path.');
      process.exit(1);
    }

    const rawYaml = await fs.promises.readFile(eligPath, 'utf8');
    const doc = yaml.load(rawYaml);
    const eligList = parseEligibilitiesYaml(doc);

    console.log(`Total canonical eligibilities parsed: ${eligList.length}`);

    // 1) Duplicate keys
    const keyCounts = new Map<string, number>();
    for (const e of eligList) {
      keyCounts.set(e.key, (keyCounts.get(e.key) ?? 0) + 1);
    }

    const duplicateKeys = Array.from(keyCounts.entries()).filter(([, count]) => count > 1);

    // 2) Duplicate aliases within the same eligibility
    type WithinDup = {
      key: string;
      canonical: string;
      duplicates: string[];
    };
    const withinEntryDuplicates: WithinDup[] = [];

    // 3) Alias collisions across different eligibilities
    type AliasInfo = {
      canonicalKeys: Set<string>;
      canonicalNames: Set<string>;
    };
    const aliasMap = new Map<string, AliasInfo>();

    let totalAliasCount = 0;

    for (const e of eligList) {
      const seenInThisEntry = new Map<string, number>();
      for (const alias of e.aliases) {
        const norm = normalizeAlias(alias);
        if (!norm) continue;

        totalAliasCount++;

        // track within-entry duplicates
        seenInThisEntry.set(norm, (seenInThisEntry.get(norm) ?? 0) + 1);

        // track global collisions
        if (!aliasMap.has(norm)) {
          aliasMap.set(norm, {
            canonicalKeys: new Set<string>([e.key]),
            canonicalNames: new Set<string>([e.canonical]),
          });
        } else {
          const info = aliasMap.get(norm)!;
          info.canonicalKeys.add(e.key);
          info.canonicalNames.add(e.canonical);
        }
      }

      const duplicatesForEntry = Array.from(seenInThisEntry.entries())
        .filter(([, count]) => count > 1)
        .map(([norm]) => norm);

      if (duplicatesForEntry.length > 0) {
        withinEntryDuplicates.push({
          key: e.key,
          canonical: e.canonical,
          duplicates: duplicatesForEntry,
        });
      }
    }

    const aliasCollisions = Array.from(aliasMap.entries()).filter(
      ([, info]) => info.canonicalKeys.size > 1
    );

    console.log('');
    console.log('----------------------------------------');
    console.log('SUMMARY');
    console.log('----------------------------------------');
    console.log(`Total canonical eligibilities : ${eligList.length}`);
    console.log(`Total aliases (raw)           : ${totalAliasCount}`);
    console.log(`Duplicate keys                : ${duplicateKeys.length}`);
    console.log(
      `Within-entry alias duplicates : ${withinEntryDuplicates.length} eligibilities with repeats`
    );
    console.log(
      `Alias collisions across entries: ${aliasCollisions.length} normalized alias(es) reused by multiple eligibilities`
    );
    console.log('');

    if (duplicateKeys.length > 0) {
      console.log('🚨 Duplicate keys:');
      duplicateKeys.forEach(([key, count]) => {
        const sample = eligList
          .filter((e) => e.key === key)
          .map((e) => e.canonical)
          .slice(0, 3);
        console.log(`- key="${key}" appears ${count} times; canonical samples:`, sample);
      });
      console.log('');
    }

    if (withinEntryDuplicates.length > 0) {
      console.log(
        '🚨 Within-entry alias duplicates (same eligibility listing same alias multiple times):'
      );
      withinEntryDuplicates.forEach((item) => {
        console.log(`- key="${item.key}", canonical="${item.canonical}"`);
        console.log(`  duplicated normalized aliases: ${item.duplicates.join(', ')}`);
      });
      console.log('');
    }

    if (aliasCollisions.length > 0) {
      console.log('🚨 Alias collisions across DIFFERENT eligibilities:');
      aliasCollisions.forEach(([aliasNorm, info]) => {
        const keys = Array.from(info.canonicalKeys);
        const names = Array.from(info.canonicalNames);
        console.log(`- alias="${aliasNorm}" is used by ${keys.length} eligibilities:`);
        console.log(`  keys     : ${keys.join(', ')}`);
        console.log(`  canonical: ${names.join(' | ')}`);
      });
      console.log('');
    }

    if (
      duplicateKeys.length === 0 &&
      withinEntryDuplicates.length === 0 &&
      aliasCollisions.length === 0
    ) {
      console.log(
        '✅ No duplicate keys, no within-entry alias duplicates, and no cross-entry alias collisions found.'
      );
    } else {
      console.log(
        '⚠️  Duplicates and/or alias collisions were found. Review the details above and clean up eligibilities.yaml.'
      );
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error while checking eligibilities.yaml:', err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('❌ Unhandled error:', err);
  process.exit(1);
});

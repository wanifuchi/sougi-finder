/**
 * 施設名でキャッシュをスキャン
 */

import { kv } from '@vercel/kv';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function main() {
  const searchNames = process.argv.slice(2);

  if (searchNames.length === 0) {
    console.log('使用方法: npx tsx scripts/scan-facility-names.ts <施設名1> <施設名2> ...');
    console.log('例: npx tsx scripts/scan-facility-names.ts "新樹葬祭" "セレハウス谷原"');
    process.exit(1);
  }

  console.log(`Scanning for facilities: ${searchNames.join(', ')}\n`);

  let cursor = 0;
  const foundKeys: Map<string, string> = new Map();
  let scannedCount = 0;

  do {
    const [nextCursor, keys] = await kv.scan(cursor, {
      match: 'description:*',
      count: 100
    });

    cursor = nextCursor;
    scannedCount += keys.length;

    for (const key of keys) {
      const value = await kv.get<string>(key);
      if (!value) continue;

      for (const name of searchNames) {
        if (value.includes(name)) {
          foundKeys.set(key, name);
          const preview = value.slice(0, 100);
          console.log(`✅ Found "${name}"`);
          console.log(`   Key: ${key}`);
          console.log(`   Preview: ${preview}...\n`);
          break;
        }
      }
    }

    if (scannedCount >= 500) {
      console.log('⚠️  Scan limit reached (500 keys)\n');
      break;
    }

  } while (cursor !== 0);

  console.log(`\nScanned ${scannedCount} keys`);
  console.log(`Found ${foundKeys.size} matching keys`);

  if (foundKeys.size === 0) {
    console.log('\n⚠️  No caches found for these facilities.');
    console.log('They may not have cached descriptions yet.');
  } else {
    console.log('\n=== Delete Commands ===');
    for (const [key] of foundKeys) {
      const placeId = key.replace('description:', '');
      console.log(`npx tsx scripts/clear-cache-specific.ts ${placeId}`);
    }
  }
}

main().catch(console.error);

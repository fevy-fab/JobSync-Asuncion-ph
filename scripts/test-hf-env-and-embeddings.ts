// scripts/test-hf-env-and-embeddings.ts
import 'dotenv/config';
import { getSkillEmbedding, semanticSimilarityPercent } from '@/lib/semantic/sbertSkills';

async function main() {
  console.log('▶ SBERT / HF environment + embedding test');

  console.log('process.cwd() =', process.cwd());
  console.log('----------------------------------------');

  const hasKey = !!process.env.HF_API_KEY;
  const apiUrl = process.env.HF_EMBEDDINGS_API_URL;

  console.log('HF_API_KEY present:', hasKey);
  console.log('HF_EMBEDDINGS_API_URL:', apiUrl ?? '(using default router URL)');

  console.log('\nCalling HF embeddings API...');

  const embA = await getSkillEmbedding('customer service');
  const embB = await getSkillEmbedding('client support');
  const embC = await getSkillEmbedding('wiring installation');

  console.log('\nEmbedding dims:');
  console.log('  "customer service":', embA.length);
  console.log('  "client support":   ', embB.length);
  console.log('  "wiring installation":', embC.length);

  if (embA.length && embB.length && embC.length) {
    const simAB = semanticSimilarityPercent(embA, embB);
    const simAC = semanticSimilarityPercent(embA, embC);

    console.log('\nSBERT semantic similarity (percent):');
    console.log('  "customer service" vs "client support" (should be HIGH): ', simAB.toFixed(2) + '%');
    console.log('  "customer service" vs "wiring installation" (should be LOWER):', simAC.toFixed(2) + '%');
  } else {
    console.log('\n❌ Embeddings are empty. SBERT is NOT working in this environment.');
    console.log('   Check HF_API_KEY and HF_EMBEDDINGS_API_URL.');
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error('❌ Error running SBERT test:', err);
  process.exit(1);
});

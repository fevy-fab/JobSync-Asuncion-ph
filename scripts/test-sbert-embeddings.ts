// scripts/test-sbert-embeddings.ts
import 'dotenv/config';
import {
  getSkillEmbedding,
  semanticSimilarityPercent,
} from '../src/lib/semantic/sbertSkills';

async function main() {
  console.log('▶ SBERT / Hugging Face basic check\n');

  console.log('HF_API_KEY present:', !!process.env.HF_API_KEY);
  console.log('HF_EMBEDDINGS_API_URL:', process.env.HF_EMBEDDINGS_API_URL);
  console.log('----------------------------------------');

  const a = 'customer service';
  const b = 'client support';
  const c = 'wiring installation';

  const [embA, embB, embC] = await Promise.all([
    getSkillEmbedding(a),
    getSkillEmbedding(b),
    getSkillEmbedding(c),
  ]);

  console.log(`Embedding dims:`);
  console.log(`  "${a}":`, embA.length);
  console.log(`  "${b}":`, embB.length);
  console.log(`  "${c}":`, embC.length);

  if (!embA.length || !embB.length || !embC.length) {
    console.log('\n⚠️ One or more embeddings are empty.');
    console.log(
      '   → Check console for [JobSync][SBERT] errors (API key, URL, or network).'
    );
    return;
  }

  const simAB = semanticSimilarityPercent(embA, embB);
  const simAC = semanticSimilarityPercent(embA, embC);

  console.log('\nSBERT semantic similarity (percent):');
  console.log(`  "${a}" vs "${b}" (should be HIGH):  ${simAB.toFixed(2)}%`);
  console.log(`  "${a}" vs "${c}" (should be LOWER): ${simAC.toFixed(2)}%`);

  console.log('\n✅ If simAB >> simAC and no HF errors, SBERT is working.');
}

main().catch(err => {
  console.error('❌ test-sbert-embeddings failed:', err);
});

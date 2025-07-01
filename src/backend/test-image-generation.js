const { getIllustration } = require('./dist/services/imageService');

async function testImageGeneration() {
  console.log('Testing Image Generation System');
  console.log('================================');
  console.log('');
  
  console.log('Environment check:');
  console.log(`  UNSPLASH_ACCESS_KEY: ${process.env.UNSPLASH_ACCESS_KEY ? '✅ Set' : '⚠️  Not set'}`);
  console.log(`  REPLICATE_API_TOKEN: ${process.env.REPLICATE_API_TOKEN ? '✅ Set' : '⚠️  Not set'}`);
  console.log('');
  
  const testPrompts = [
    'Technology AI artificial intelligence breakthrough',
    'Sports championship basketball finals',
    'Business startup funding investment'
  ];
  
  for (let i = 0; i < testPrompts.length; i++) {
    const prompt = testPrompts[i];
    console.log(`Test ${i + 1}: "${prompt}"`);
    
    try {
      const result = await getIllustration(prompt);
      console.log(`  ✅ Success!`);
      console.log(`  📸 Source: ${result.source}`);
      console.log(`  🔗 URL: ${result.url}`);
      console.log(`  📝 Attribution: ${result.attribution || 'None'}`);
    } catch (error) {
      console.log(`  ❌ Failed: ${error.message}`);
    }
    
    console.log('');
  }
}

console.log('Synapse Image Generation Test');
console.log('============================');
console.log('');

testImageGeneration().catch(console.error);
// Quick test script for location extraction
const axios = require('axios');

async function testLocationExtraction() {
  const testCases = [
    'תוסיף את קפה איטליה למפה',
    'הוסף את סטארבקס למפה', 
    'add coffee italia to maps'
  ];

  console.log('Testing location extraction service...\n');

  for (const text of testCases) {
    console.log(`Testing: "${text}"`);
    
    try {
      // Test the Claude AI analysis directly
      const anthropicKey = process.env.ANTHROPIC_API_KEY;
      
      if (!anthropicKey) {
        console.log('❌ No ANTHROPIC_API_KEY found');
        continue;
      }

      const prompt = `
Analyze the following voice message transcription and determine if it contains location-related intent.
The text may be in Hebrew, English, or mixed languages. Extract any location names, addresses, or place names mentioned.

Text: "${text}"

Please respond with a JSON object containing:
- hasLocationIntent: boolean (true if user wants to add/search/navigate to a location)
- locationQuery: string (the location name/address to search for, if any)
- confidence: "high" | "medium" | "low" (confidence in the location extraction)
- action: "add" | "search" | "navigate" (what the user wants to do with the location)

Examples in Hebrew:
- "תוסיף את קפה איטליה למפה" → {"hasLocationIntent": true, "locationQuery": "קפה איטליה", "confidence": "high", "action": "add"}
`;

      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: 'claude-3-sonnet-20240229',
          max_tokens: 200,
          messages: [{ role: 'user', content: prompt }]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01'
          }
        }
      );

      const aiResponse = response.data.content[0].text;
      console.log('✅ Claude AI Response:', aiResponse);
      
      try {
        const parsed = JSON.parse(aiResponse);
        console.log('✅ Parsed Result:', parsed);
      } catch (e) {
        console.log('⚠️ Could not parse JSON response');
      }
      
    } catch (error) {
      console.error('❌ Error:', error.response?.data || error.message);
    }
    
    console.log('---\n');
  }
}

// Run the test
testLocationExtraction().catch(console.error);
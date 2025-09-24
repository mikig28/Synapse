const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const readline = require('readline');

const apiId = Number(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH;
const phone = process.env.TELEGRAM_LOGIN_PHONE;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer.trim());
    });
  });
}

async function main() {
  console.log('🚀 Telegram Session Generator for Synapse Project\n');

  if (!apiId || !apiHash || !phone) {
    console.error('❌ Missing required environment variables:');
    console.error('   TELEGRAM_API_ID, TELEGRAM_API_HASH, TELEGRAM_LOGIN_PHONE');
    process.exit(1);
  }

  console.log(`📱 Generating session for: ${phone}`);
  console.log(`🔑 API ID: ${apiId}\n`);

  const client = new TelegramClient(new StringSession(''), apiId, apiHash, {
    connectionRetries: 5,
  });

  try {
    await client.start({
      phoneNumber: phone,
      password: async () => {
        const password = await askQuestion('🔐 Enter your 2FA password (leave empty if none): ');
        return password;
      },
      phoneCode: async () => {
        const code = await askQuestion('📲 Enter the Telegram verification code: ');
        return code;
      },
      onError: (err) => {
        console.error('❌ Authentication error:', err);
      },
    });

    console.log('\n✅ Successfully authenticated with Telegram!');
    console.log('\n📋 Copy this TELEGRAM_USER_SESSION value to your environment variables:');
    console.log('='.repeat(80));
    console.log(client.session.save());
    console.log('='.repeat(80));
    console.log('\n💡 Add this to your Render environment variables or .env file:');
    console.log(`TELEGRAM_USER_SESSION=${client.session.save()}`);

    await client.disconnect();
    console.log('\n🔒 Session saved and client disconnected successfully!');

  } catch (error) {
    console.error('❌ Failed to generate session:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
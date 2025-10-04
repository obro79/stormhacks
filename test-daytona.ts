import { buildApp } from './src/lib/orchestrator';

async function test() {
  console.log('Building tic-tac-toe app...');

  const result = await buildApp('Create a basic HTML tic-tac-toe game with vanilla JavaScript. Include HTML, CSS, and JS in separate files. Make it playable and styled nicely.');

  console.log('\n=== Result ===');
  console.log('Success:', result.success);
  console.log('Message:', result.message);
  console.log('Files generated:', result.files.length);
  console.log('\nFiles:');
  result.files.forEach(f => console.log(`  - ${f.path}`));

  if (result.sandboxUrl) {
    console.log('\n🚀 Sandbox URL:', result.sandboxUrl);
  }

  if (result.sandboxId) {
    console.log('📦 Sandbox ID:', result.sandboxId);
  }
}

test().catch(console.error);

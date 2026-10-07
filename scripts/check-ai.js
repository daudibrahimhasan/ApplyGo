import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Helper to parse .env file
function loadEnv() {
  const envPath = path.join(rootDir, '.env');
  const env = { ...process.env };

  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        // remove surrounding quotes if present
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        env[key] = val;
      }
    }
  }
  return env;
}

const env = loadEnv();

const apiKey = env.VITE_API_KEY || env.API_KEY || env.OPENAI_API_KEY || env.GEMINI_API_KEY || '';
const baseUrl = env.VITE_AI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/';
const model = env.VITE_AI_MODEL || 'gemini-1.5-flash';

console.log('='.repeat(60));
console.log('  ApplyGo — Local AI Diagnostic & Check Tool');
console.log('='.repeat(60));
console.log(`Base URL : ${baseUrl}`);
console.log(`Model    : ${model}`);
console.log(`API Key  : ${apiKey ? apiKey.slice(0, 7) + '...' + apiKey.slice(-4) : '(NOT CONFIGURED IN .env)'}`);
console.log('-'.repeat(60));

if (!apiKey || apiKey === 'your_gemini_api_key_here') {
  console.log('\n❌ No valid API key found in .env!');
  console.log('\nTo configure your local key:');
  console.log('1. Open .env in your editor');
  console.log('2. Set VITE_API_KEY=<your-key>');
  console.log('   - Google Gemini (Free): https://aistudio.google.com/app/apikey');
  console.log('   - OpenAI: https://platform.openai.com/api-keys');
  console.log('   - Ollama (Local free): VITE_API_KEY=ollama VITE_AI_BASE_URL=http://localhost:11434/v1');
  console.log('3. Re-run: npm run check:ai\n');
  process.exit(1);
}

async function runCheck() {
  // Step 1: Check connection and list available models
  console.log('\n[1/2] Testing API connection and listing models...');
  const modelsEndpoint = `${baseUrl.replace(/\/+$/, '')}/models`;

  try {
    const res = await fetch(modelsEndpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.log(`❌ Provider returned HTTP ${res.status}: ${errText.slice(0, 200)}`);
      process.exit(1);
    }

    const data = await res.json();
    const modelList = data.data ? data.data.map((m) => m.id).slice(0, 5) : [];
    console.log(`✓ Connected successfully! Found models: ${modelList.join(', ') || 'available'}`);
  } catch (err) {
    console.log(`❌ Network error reaching ${modelsEndpoint}: ${err.message}`);
    process.exit(1);
  }

  // Step 2: Test Grounded Generation with JSON Schema
  console.log(`\n[2/2] Testing structured grounded answer generation with model "${model}"...`);
  const chatEndpoint = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;

  const payload = {
    model,
    messages: [
      {
        role: 'system',
        content:
          'You are ApplyGo AI. Answer the question using ONLY the provided verified facts. Return a JSON object with: { answer: string, usedKnowledgeIds: string[], unsupportedClaims: string[], missingInformation: string[], confidence: "high"|"medium"|"low" }.',
      },
      {
        role: 'user',
        content:
          '--- KNOWLEDGE ENTRIES ---\n[ID: k1] Candidate developed deterministic form filling engine in TypeScript.\n[ID: k2] Candidate has 3 years of experience in AI safety.\n\n--- QUESTION ---\nDescribe your technical background and experience with form engines.',
      },
    ],
    temperature: 0.2,
    response_format: { type: 'json_object' },
  };

  try {
    const startTime = Date.now();
    const res = await fetch(chatEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const elapsed = Date.now() - startTime;

    if (!res.ok) {
      const errText = await res.text();
      console.log(`❌ Model generation failed HTTP ${res.status}: ${errText.slice(0, 250)}`);
      process.exit(1);
    }

    const json = await res.json();
    const content = json.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content || '{}');

    console.log(`✓ Received response in ${elapsed}ms!`);
    console.log('\n--- Model Output ---');
    console.log(`Answer     : ${parsed.answer || content}`);
    console.log(`Knowledge  : ${JSON.stringify(parsed.usedKnowledgeIds || [])}`);
    console.log(`Confidence : ${parsed.confidence || 'N/A'}`);
    console.log('--------------------');
    console.log('\n🎉 ALL CHECKS PASSED: Your local AI environment is working properly!\n');
  } catch (err) {
    console.log(`❌ Error during generation test: ${err.message}`);
    process.exit(1);
  }
}

runCheck();

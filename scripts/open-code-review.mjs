import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import minimist from 'minimist';

const args = process.argv.slice(2);
const require = createRequire(import.meta.url);
const ocrEntry = require.resolve('@alibaba-group/open-code-review/bin/ocr.js');
const topLevelCommands = new Set(['review', 'rules', 'config', 'llm', 'viewer', 'version']);
const ocrArgs = buildOcrArgs(args);

const requiredEnv = ['OCR_LLM_URL', 'OCR_LLM_TOKEN', 'OCR_LLM_MODEL'];
const missingEnv = requiredEnv.filter((name) => !String(process.env[name] ?? '').trim());

if (missingEnv.length > 0) {
  console.error(`Missing OCR environment variables: ${missingEnv.join(', ')}`);
  console.error('');
  console.error('Set them before running the review, for example:');
  console.error('  OCR_LLM_URL=http://127.0.0.1:11434/v1/chat/completions');
  console.error('  OCR_LLM_TOKEN=ollama');
  console.error('  OCR_LLM_MODEL=qwen3.6:latest');
  console.error('  OCR_USE_ANTHROPIC=false');
  process.exit(1);
}

const result = spawnSync(process.execPath, [ocrEntry, ...ocrArgs], {
  stdio: 'inherit',
  env: {
    ...process.env,
    OCR_NO_UPDATE: process.env.OCR_NO_UPDATE || '1'
  },
  windowsHide: true
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);

function buildOcrArgs(inputArgs) {
  const parsed = minimist(inputArgs);
  const firstArg = parsed._[0];

  if (!firstArg) {
    return ['review', ...withDefaultReviewFlags(inputArgs, parsed)];
  }

  if (topLevelCommands.has(firstArg)) {
    if (firstArg === 'review') {
      const reviewArgs = inputArgs.slice(1);
      return ['review', ...withDefaultReviewFlags(reviewArgs, minimist(reviewArgs))];
    }

    return inputArgs;
  }

  return ['review', ...withDefaultReviewFlags(inputArgs, parsed)];
}

function withDefaultReviewFlags(reviewArgs, parsedArgs) {
  const hasAudience = parsedArgs.audience !== undefined;
  const hasFormat = parsedArgs.format !== undefined;
  return [
    ...(hasAudience ? [] : ['--audience', 'agent']),
    ...(hasFormat ? [] : ['--format', 'text']),
    ...reviewArgs
  ];
}

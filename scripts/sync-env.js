const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const envPath = path.join(__dirname, '..', '.env.local');

if (!fs.existsSync(envPath)) {
    console.error('Error: .env.local file not found in the project root.');
    process.exit(1);
}

console.log('Reading .env.local...');
const envContent = fs.readFileSync(envPath, 'utf8');
const lines = envContent.split('\n');

let successCount = 0;
let failCount = 0;

const stripMatchingSurroundingQuotes = (rawValue) => {
    if (rawValue.length < 2) {
        return rawValue;
    }

    const quoteChar = rawValue[0];
    const lastChar = rawValue[rawValue.length - 1];
    const charBeforeLast = rawValue[rawValue.length - 2];
    const isQuoteChar = quoteChar === '"' || quoteChar === "'";
    const hasMatchingQuotes = isQuoteChar && lastChar === quoteChar && charBeforeLast !== '\\';

    if (!hasMatchingQuotes) {
        return rawValue;
    }

    const innerValue = rawValue.slice(1, -1);
    const unescapedQuotes = quoteChar === '"'
        ? innerValue.replace(/\\"/g, '"')
        : innerValue.replace(/\\'/g, "'");

    return unescapedQuotes.replace(/\\\\/g, '\\');
};

lines.forEach((line) => {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) return;

    const parts = trimmedLine.split('=');
    const key = parts[0].trim();
    // Join back the rest in case value contains '='
    let value = parts.slice(1).join('=').trim();

    // Remove matching surrounding quotes only when the closing quote is not escaped
    value = stripMatchingSurroundingQuotes(value);

    if (!key) return; // Skip if no key

    if (!value) {
        console.warn(`Skipping ${key}: Value is empty.`);
        return;
    }

    console.log(`Setting sensitive env: ${key}`);

    const environments = ['development', 'preview', 'production'];
    let keySuccess = false;

    const easCreate = (env) => spawnSync('eas', [
        'env:create',
        '--environment', env,
        '--name', key,
        '--value', value,
        '--visibility', 'sensitive',
        '--force',
        '--non-interactive'
    ], { encoding: 'utf-8', shell: true, stdio: ['pipe', 'pipe', 'pipe'] });

    for (const env of environments) {
        let result = easCreate(env);

        // EAS blocks downgrading secret → sensitive; delete then recreate
        const combined = [result.stderr, result.stdout].map(s => (s || '')).join(' ');
        if (result.status !== 0 && combined.includes('cannot change a secret variable')) {
            console.log(`  ↻ [${env}] ${key}: was secret, deleting to recreate as sensitive...`);
            spawnSync('eas', [
                'env:delete',
                '--variable-environment', env,
                '--variable-name', key,
                '--non-interactive'
            ], { encoding: 'utf-8', shell: true, stdio: ['pipe', 'pipe', 'pipe'] });
            result = easCreate(env);
        }

        if (result.status === 0) {
            console.log(`  ✓ [${env}] ${key}`);
            keySuccess = true;
        } else {
            const errMsg = [result.stderr, result.stdout]
                .map(s => (s || '').trim())
                .filter(Boolean)
                .join(' | ');
            console.error(`  ✗ [${env}] ${key}: ${errMsg}`);
        }
    }

    if (keySuccess) successCount++; else failCount++;
});

console.log(`\nSync complete. Success: ${successCount}, Failed: ${failCount}`);


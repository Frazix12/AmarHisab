import fs from "node:fs";
import path from "node:path";

const gradlePath = path.join(process.cwd(), "android", "app", "build.gradle");

if (!fs.existsSync(gradlePath)) {
  console.error(`❌ build.gradle not found at: ${gradlePath}`);
  process.exit(1);
}

let content = fs.readFileSync(gradlePath, "utf8");

// Idempotency marker
const MARK = "// CI_SIGNING_PATCH";
if (!content.includes(MARK)) {
  const loader = `
// CI_SIGNING_PATCH
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file("key.properties")
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
// CI_SIGNING_PATCH_END
`;

  const applyIdx = content.indexOf("apply plugin");
  if (applyIdx !== -1) {
    const lineStart = content.lastIndexOf("\n", applyIdx);
    content = content.slice(0, lineStart + 1) + loader + "\n" + content.slice(lineStart + 1);
  } else {
    content = loader + "\n" + content;
  }
}

// Helper: ensure android { exists
const androidIdx = content.indexOf("android {");
if (androidIdx === -1) {
  console.error("❌ Could not find `android {` block in build.gradle");
  process.exit(1);
}

// The release signing config we want
const releaseSigningConfig = `
        release {
            if (keystorePropertiesFile.exists()) {
                storeFile file(keystoreProperties["storeFile"])
                storePassword keystoreProperties["storePassword"]
                keyAlias keystoreProperties["keyAlias"]
                keyPassword keystoreProperties["keyPassword"]
            }
        }
`;

// 1) Ensure signingConfigs exists
if (!content.includes("signingConfigs {")) {
  const insertPos = androidIdx + "android {".length;
  const signingBlock = `
    signingConfigs {
${releaseSigningConfig}
    }
`;
  content = content.slice(0, insertPos) + signingBlock + content.slice(insertPos);
} else {
  // 2) signingConfigs exists: ensure it contains "release {"
  const signingConfigsRegex = /signingConfigs\s*\{([\s\S]*?)\n\s*\}/m;
  const match = content.match(signingConfigsRegex);
  if (!match) {
    console.error("❌ Found `signingConfigs {` but couldn't parse its block.");
    process.exit(1);
  }

  const fullBlock = match[0];
  const inner = match[1];

  if (!/release\s*\{/.test(inner)) {
    // Insert release config near top of signingConfigs block
    const patched = fullBlock.replace(
      /signingConfigs\s*\{/,
      `signingConfigs {\n${releaseSigningConfig}`
    );
    content = content.replace(fullBlock, patched);
  }
}

// 3) Ensure buildTypes.release uses the release signing config safely
// Use getByName("release") so it doesn't depend on property access.
const wantedLine = `signingConfig signingConfigs.getByName("release")`;

if (content.includes("buildTypes {")) {
  const buildTypesRegex = /buildTypes\s*\{([\s\S]*?)\n\s*\}/m;
  const btMatch = content.match(buildTypesRegex);
  if (!btMatch) {
    console.error("❌ Found buildTypes but couldn't parse it.");
    process.exit(1);
  }

  const btBlock = btMatch[0];

  // If there's a release { ... } block, ensure the wantedLine exists inside it
  const releaseRegex = /release\s*\{([\s\S]*?)\n\s*\}/m;
  const relMatch = btBlock.match(releaseRegex);

  if (relMatch) {
    if (!relMatch[0].includes("signingConfig")) {
      const patchedRelease = relMatch[0].replace(
        /release\s*\{/,
        `release {\n            ${wantedLine}`
      );
      content = content.replace(relMatch[0], patchedRelease);
    } else if (!relMatch[0].includes(wantedLine)) {
      // Replace any existing signingConfig line with ours
      const patchedRelease = relMatch[0].replace(
        /signingConfig\s+[^\n]+/g,
        wantedLine
      );
      content = content.replace(relMatch[0], patchedRelease);
    }
  } else {
    // No release block: insert one
    const patchedBt = btBlock.replace(
      /buildTypes\s*\{/,
      `buildTypes {\n        release {\n            ${wantedLine}\n        }\n`
    );
    content = content.replace(btBlock, patchedBt);
  }
} else {
  // No buildTypes at all: add minimal inside android
  const insertPos = androidIdx + "android {".length;
  const btBlock = `
    buildTypes {
        release {
            ${wantedLine}
        }
    }
`;
  content = content.slice(0, insertPos) + btBlock + content.slice(insertPos);
}

fs.writeFileSync(gradlePath, content, "utf8");
console.log("✅ Signing patch applied/verified.");

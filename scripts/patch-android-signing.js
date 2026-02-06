import fs from "node:fs";
import path from "node:path";

const gradlePath = path.join(process.cwd(), "android", "app", "build.gradle");

if (!fs.existsSync(gradlePath)) {
  console.error(`❌ build.gradle not found at: ${gradlePath}`);
  process.exit(1);
}

let content = fs.readFileSync(gradlePath, "utf8");

const findMatchingBrace = (text, openBraceIndex) => {
  let depth = 0;

  for (let i = openBraceIndex; i < text.length; i += 1) {
    const char = text[i];
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return i;
      }
    }
  }

  return -1;
};

const findBlock = (text, blockName, fromIndex = 0) => {
  const blockStart = text.indexOf(blockName, fromIndex);
  if (blockStart === -1) return null;

  const openBraceIndex = text.indexOf("{", blockStart);
  if (openBraceIndex === -1) return null;

  const closeBraceIndex = findMatchingBrace(text, openBraceIndex);
  if (closeBraceIndex === -1) return null;

  return {
    start: blockStart,
    openBraceIndex,
    end: closeBraceIndex + 1,
    block: text.slice(blockStart, closeBraceIndex + 1),
  };
};

const replaceRange = (text, start, end, replacement) => {
  return text.slice(0, start) + replacement + text.slice(end);
};

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
  const signingConfigsBlock = findBlock(content, "signingConfigs");
  if (!signingConfigsBlock) {
    console.error("❌ Found `signingConfigs {` but couldn't parse its block.");
    process.exit(1);
  }

  if (!/release\s*\{/.test(signingConfigsBlock.block)) {
    const insertAt = signingConfigsBlock.openBraceIndex + 1;
    content =
      content.slice(0, insertAt) +
      `\n${releaseSigningConfig}` +
      content.slice(insertAt);
  }
}

// 3) Ensure buildTypes.release uses the release signing config safely
// Use getByName("release") so it doesn't depend on property access.
const wantedLine = `signingConfig signingConfigs.getByName("release")`;

if (content.includes("buildTypes {")) {
  const buildTypesBlock = findBlock(content, "buildTypes");
  if (!buildTypesBlock) {
    console.error("❌ Found buildTypes but couldn't parse it.");
    process.exit(1);
  }

  let patchedBuildTypes = buildTypesBlock.block;

  // If there's a release { ... } block, ensure the wantedLine exists inside it
  const releaseBlock = findBlock(patchedBuildTypes, "release");

  if (releaseBlock) {
    let patchedRelease = releaseBlock.block;

    if (!patchedRelease.includes("signingConfig")) {
      patchedRelease = patchedRelease.replace(
        /release\s*\{/,
        `release {\n            ${wantedLine}`,
      );
    } else if (!patchedRelease.includes(wantedLine)) {
      // Replace any existing signingConfig line with ours
      patchedRelease = patchedRelease.replace(
        /signingConfig\s+[^\n]+/g,
        wantedLine,
      );
    }

    if (patchedRelease !== releaseBlock.block) {
      patchedBuildTypes = replaceRange(
        patchedBuildTypes,
        releaseBlock.start,
        releaseBlock.end,
        patchedRelease,
      );
    }
  } else {
    // No release block: insert one
    patchedBuildTypes = patchedBuildTypes.replace(
      /buildTypes\s*\{/,
      `buildTypes {\n        release {\n            ${wantedLine}\n        }\n`,
    );
  }

  if (patchedBuildTypes !== buildTypesBlock.block) {
    content = replaceRange(
      content,
      buildTypesBlock.start,
      buildTypesBlock.end,
      patchedBuildTypes,
    );
  }
} else {
  // No buildTypes at all: add minimal inside android
  const freshAndroidIdx = content.indexOf("android {");
  if (freshAndroidIdx === -1) {
    console.error("❌ Could not find `android {` block in build.gradle");
    process.exit(1);
  }

  const insertPos = freshAndroidIdx + "android {".length;
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

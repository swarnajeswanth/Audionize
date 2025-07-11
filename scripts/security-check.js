#!/usr/bin/env node

/**
 * Security Check Script for Audionize
 * This script checks for common security issues in the codebase
 */

const fs = require("fs");
const path = require("path");

// Security patterns to check for
const SECURITY_PATTERNS = {
  // Dangerous patterns
  consoleLog: /console\.log\(/g,
  eval: /eval\(/g,
  innerHTML: /\.innerHTML\s*=/g,
  documentWrite: /document\.write\(/g,
  sqlInjection: /SELECT.*\$\{.*\}/g,
  hardcodedPassword: /password.*=.*['"][^'"]{1,20}['"]/gi,
  hardcodedSecret: /secret.*=.*['"][^'"]{1,20}['"]/gi,
  hardcodedKey: /key.*=.*['"][^'"]{1,20}['"]/gi,

  // Good patterns to check for
  bcryptHash: /bcrypt\.hash\(/g,
  bcryptCompare: /bcrypt\.compare\(/g,
  sanitizeInput: /sanitizeInput\(/g,
  validateEmail: /validateEmail\(/g,
  validatePassword: /validatePassword\(/g,
  escapeHtml: /escapeHtml\(/g,
  securityHeaders: /getSecurityHeaders\(/g,
  rateLimit: /checkRateLimit\(/g,
};

// Files to exclude from checks
const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.git/,
  /\.next/,
  /dist/,
  /build/,
  /coverage/,
  /\.env/,
  /package-lock\.json/,
  /yarn\.lock/,
];

// Files to include
const INCLUDE_EXTENSIONS = [".js", ".jsx", ".ts", ".tsx"];

let issues = [];
let goodPractices = [];

function checkFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const relativePath = path.relative(process.cwd(), filePath);

    // Check for dangerous patterns
    Object.entries(SECURITY_PATTERNS).forEach(([patternName, pattern]) => {
      const matches = content.match(pattern);
      if (matches) {
        if (
          patternName.startsWith("hardcoded") ||
          patternName === "consoleLog" ||
          patternName === "eval" ||
          patternName === "innerHTML" ||
          patternName === "documentWrite" ||
          patternName === "sqlInjection"
        ) {
          issues.push({
            file: relativePath,
            pattern: patternName,
            count: matches.length,
            severity: "HIGH",
          });
        } else {
          goodPractices.push({
            file: relativePath,
            pattern: patternName,
            count: matches.length,
          });
        }
      }
    });
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
  }
}

function walkDirectory(dir) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    // Skip excluded patterns
    if (EXCLUDE_PATTERNS.some((pattern) => pattern.test(filePath))) {
      return;
    }

    if (stat.isDirectory()) {
      walkDirectory(filePath);
    } else if (INCLUDE_EXTENSIONS.includes(path.extname(file))) {
      checkFile(filePath);
    }
  });
}

// Run security check
console.log("🔒 Running Security Check for Audionize...\n");

walkDirectory("src");

// Display results
console.log("📊 Security Check Results:\n");

if (issues.length === 0) {
  console.log("✅ No high-severity security issues found!");
} else {
  console.log("⚠️  Found security issues:");
  issues.forEach((issue) => {
    console.log(
      `   ${issue.severity}: ${issue.pattern} in ${issue.file} (${issue.count} occurrences)`
    );
  });
}

if (goodPractices.length > 0) {
  console.log("\n✅ Good security practices found:");
  const practiceCount = {};
  goodPractices.forEach((practice) => {
    practiceCount[practice.pattern] =
      (practiceCount[practice.pattern] || 0) + practice.count;
  });

  Object.entries(practiceCount).forEach(([pattern, count]) => {
    console.log(`   ${pattern}: ${count} implementations`);
  });
}

console.log("\n📋 Security Summary:");
console.log(`   Files checked: ${goodPractices.length + issues.length}`);
console.log(`   Security issues: ${issues.length}`);
console.log(`   Good practices: ${goodPractices.length}`);

if (issues.length === 0) {
  console.log("\n🎉 All security checks passed!");
  process.exit(0);
} else {
  console.log("\n🔧 Please review and fix the security issues above.");
  process.exit(1);
}

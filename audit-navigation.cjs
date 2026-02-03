/**
 * PCBancard Navigation Audit Script
 * ===================================
 * 
 * This script audits all page components for proper navigation implementation.
 * It checks for HamburgerMenu presence and generates a report with fix recommendations.
 * 
 * USAGE:
 *   1. Upload this file to your Replit project root
 *   2. Run: node audit-navigation.js
 *   3. Review the generated report and fix files
 * 
 * OUTPUT:
 *   - Console report with findings
 *   - navigation-audit-report.md (detailed markdown report)
 *   - navigation-fixes.txt (copy-paste fix snippets)
 */

const fs = require('fs');
const path = require('path');

// Configuration - adjust these paths if your structure differs
const CONFIG = {
  pagesDir: './client/src/pages',
  componentsDir: './client/src/components',
  outputReport: './navigation-audit-report.md',
  outputFixes: './navigation-fixes.txt',
};

// Pages that are known to be fixed (from documentation)
const KNOWN_FIXED = ['equipiq.tsx', 'esign-document-library.tsx'];

// Pages that legitimately don't need HamburgerMenu (login, auth, etc.)
const EXEMPT_PAGES = [
  'login.tsx',
  'register.tsx',
  'auth-callback.tsx',
  'forgot-password.tsx',
  'reset-password.tsx',
  'not-found.tsx',
  '404.tsx',
  'error.tsx',
  'onboarding.tsx',
];

// Patterns to detect navigation components
const PATTERNS = {
  hamburgerImport: /import\s*{[^}]*HamburgerMenu[^}]*}\s*from\s*["']@\/components\/BottomNav["']/,
  hamburgerUsage: /<HamburgerMenu\s*\/?>/,
  backButton: /<(?:Button|button)[^>]*(?:onClick|onPress)[^>]*(?:back|goBack|navigate\(-1\)|history\.back)/i,
  arrowLeftIcon: /ArrowLeft|ChevronLeft|BackArrow/,
  headerPattern: /<(?:div|header)[^>]*className[^>]*(?:header|flex[^"]*items-center)/i,
};

// Results storage
const results = {
  hasHamburgerMenu: [],
  missingHamburgerMenu: [],
  hasBackButtonOnly: [],
  exempt: [],
  errors: [],
};

/**
 * Check if a file contains HamburgerMenu implementation
 */
function analyzeFile(filePath, fileName) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    const hasImport = PATTERNS.hamburgerImport.test(content);
    const hasUsage = PATTERNS.hamburgerUsage.test(content);
    const hasBackButton = PATTERNS.backButton.test(content) || PATTERNS.arrowLeftIcon.test(content);
    const hasHeader = PATTERNS.headerPattern.test(content);
    
    // Extract the component/page name from the file
    const componentMatch = content.match(/(?:export\s+default\s+function|function|const)\s+(\w+)/);
    const componentName = componentMatch ? componentMatch[1] : fileName.replace('.tsx', '');
    
    // Extract route if defined
    const routeMatch = content.match(/["']\/([^"']+)["']/);
    const possibleRoute = routeMatch ? `/${routeMatch[1]}` : 'Unknown';
    
    return {
      fileName,
      filePath,
      componentName,
      possibleRoute,
      hasImport,
      hasUsage,
      hasHamburgerMenu: hasImport && hasUsage,
      hasBackButton,
      hasHeader,
      lineCount: content.split('\n').length,
    };
  } catch (error) {
    return {
      fileName,
      filePath,
      error: error.message,
    };
  }
}

/**
 * Scan directory for page files
 */
function scanPages(directory) {
  if (!fs.existsSync(directory)) {
    console.error(`❌ Pages directory not found: ${directory}`);
    console.log('\n💡 Tip: Make sure you run this from your project root directory.');
    console.log('   Expected structure: ./client/src/pages/');
    process.exit(1);
  }
  
  const files = fs.readdirSync(directory);
  const tsxFiles = files.filter(f => f.endsWith('.tsx') || f.endsWith('.jsx'));
  
  console.log(`\n📂 Found ${tsxFiles.length} page files to analyze...\n`);
  
  tsxFiles.forEach(fileName => {
    const filePath = path.join(directory, fileName);
    
    // Check if exempt
    if (EXEMPT_PAGES.includes(fileName.toLowerCase())) {
      results.exempt.push({ fileName, reason: 'Auth/utility page - no navigation needed' });
      return;
    }
    
    const analysis = analyzeFile(filePath, fileName);
    
    if (analysis.error) {
      results.errors.push(analysis);
      return;
    }
    
    if (analysis.hasHamburgerMenu) {
      results.hasHamburgerMenu.push(analysis);
    } else if (analysis.hasBackButton && !analysis.hasHamburgerMenu) {
      results.hasBackButtonOnly.push(analysis);
    } else {
      results.missingHamburgerMenu.push(analysis);
    }
  });
}

/**
 * Generate the fix code snippet for a file
 */
function generateFixSnippet(analysis) {
  return `
// ============================================
// FIX FOR: ${analysis.fileName}
// ============================================

// STEP 1: Add import at top of file (with other imports)
import { HamburgerMenu } from "@/components/BottomNav";

// STEP 2: Find your header/title section and update it to:
<div className="flex items-center gap-3">
  <HamburgerMenu />
  <h1 className="text-xl font-semibold">${analysis.componentName}</h1>
</div>

// STEP 3: If you have a back button, consider keeping both:
<div className="flex items-center gap-3">
  <HamburgerMenu />
  <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
    <ArrowLeft className="h-5 w-5" />
  </Button>
  <h1 className="text-xl font-semibold">${analysis.componentName}</h1>
</div>
`;
}

/**
 * Generate markdown report
 */
function generateReport() {
  const timestamp = new Date().toISOString();
  const totalPages = results.hasHamburgerMenu.length + 
                     results.missingHamburgerMenu.length + 
                     results.hasBackButtonOnly.length;
  
  let report = `# PCBancard Navigation Audit Report

**Generated:** ${timestamp}
**Total Pages Analyzed:** ${totalPages}
**Exempt Pages:** ${results.exempt.length}

---

## Summary

| Status | Count | Percentage |
|--------|-------|------------|
| ✅ Has HamburgerMenu | ${results.hasHamburgerMenu.length} | ${((results.hasHamburgerMenu.length / totalPages) * 100).toFixed(1)}% |
| ⚠️ Back Button Only | ${results.hasBackButtonOnly.length} | ${((results.hasBackButtonOnly.length / totalPages) * 100).toFixed(1)}% |
| ❌ Missing Navigation | ${results.missingHamburgerMenu.length} | ${((results.missingHamburgerMenu.length / totalPages) * 100).toFixed(1)}% |

---

## ❌ CRITICAL: Pages Missing HamburgerMenu (${results.missingHamburgerMenu.length})

These pages need immediate attention - users can get stuck!

| File | Component | Has Header | Priority |
|------|-----------|------------|----------|
`;

  results.missingHamburgerMenu.forEach(p => {
    const priority = p.hasHeader ? '🔴 HIGH' : '🟡 MEDIUM';
    report += `| ${p.fileName} | ${p.componentName} | ${p.hasHeader ? 'Yes' : 'No'} | ${priority} |\n`;
  });

  report += `

---

## ⚠️ WARNING: Pages with Back Button Only (${results.hasBackButtonOnly.length})

These pages have navigation but users can't access the main menu.

| File | Component | Notes |
|------|-----------|-------|
`;

  results.hasBackButtonOnly.forEach(p => {
    const isKnown = KNOWN_FIXED.includes(p.fileName) ? ' (Marked as fixed in docs)' : '';
    report += `| ${p.fileName} | ${p.componentName} | Back button present${isKnown} |\n`;
  });

  report += `

---

## ✅ Properly Implemented (${results.hasHamburgerMenu.length})

These pages have correct navigation.

| File | Component |
|------|-----------|
`;

  results.hasHamburgerMenu.forEach(p => {
    report += `| ${p.fileName} | ${p.componentName} |\n`;
  });

  report += `

---

## 📋 Exempt Pages (${results.exempt.length})

These pages don't require main navigation.

| File | Reason |
|------|--------|
`;

  results.exempt.forEach(p => {
    report += `| ${p.fileName} | ${p.reason} |\n`;
  });

  if (results.errors.length > 0) {
    report += `

---

## ⚠️ Errors During Analysis

| File | Error |
|------|-------|
`;
    results.errors.forEach(p => {
      report += `| ${p.fileName} | ${p.error} |\n`;
    });
  }

  report += `

---

## 🔧 How to Fix

### Quick Fix Pattern

For each page missing HamburgerMenu:

\`\`\`tsx
// 1. Add import
import { HamburgerMenu } from "@/components/BottomNav";

// 2. Update header section
<div className="flex items-center gap-3">
  <HamburgerMenu />
  <h1 className="text-xl font-semibold">Page Title</h1>
</div>
\`\`\`

### Detailed fix snippets have been generated in: navigation-fixes.txt

---

## 🎯 Recommended Fix Order

1. **Dashboard & main entry points first** - These are high-traffic
2. **Detail pages** (merchant-detail, drop-detail, etc.) - Users navigate here frequently  
3. **Utility pages** (settings, profile) - Lower priority but still needed

---

*Report generated by PCBancard Navigation Audit Script*
`;

  return report;
}

/**
 * Generate fix snippets file
 */
function generateFixesFile() {
  let fixes = `/**
 * PCBancard Navigation Fix Snippets
 * ==================================
 * 
 * Copy and paste these fixes into the corresponding files.
 * Generated: ${new Date().toISOString()}
 */

// ============================================
// STANDARD IMPORT (add to top of each file)
// ============================================
import { HamburgerMenu } from "@/components/BottomNav";

`;

  // Add fixes for missing pages
  const allNeedsFix = [...results.missingHamburgerMenu, ...results.hasBackButtonOnly];
  
  allNeedsFix.forEach(analysis => {
    fixes += generateFixSnippet(analysis);
  });

  fixes += `

// ============================================
// VERIFICATION CHECKLIST
// ============================================
// After applying fixes, verify each page:
// 
// [ ] HamburgerMenu is visible in top-left
// [ ] Menu opens when clicked
// [ ] All navigation items work
// [ ] Page title is still visible
// [ ] Back button still works (if applicable)
//
// Pages to verify:
`;

  allNeedsFix.forEach(p => {
    fixes += `// [ ] ${p.fileName}\n`;
  });

  return fixes;
}

/**
 * Print console summary
 */
function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 NAVIGATION AUDIT RESULTS');
  console.log('='.repeat(60));
  
  console.log(`\n✅ Has HamburgerMenu: ${results.hasHamburgerMenu.length} pages`);
  results.hasHamburgerMenu.forEach(p => console.log(`   • ${p.fileName}`));
  
  console.log(`\n⚠️  Back Button Only: ${results.hasBackButtonOnly.length} pages`);
  results.hasBackButtonOnly.forEach(p => console.log(`   • ${p.fileName} - NEEDS HamburgerMenu added`));
  
  console.log(`\n❌ Missing Navigation: ${results.missingHamburgerMenu.length} pages`);
  results.missingHamburgerMenu.forEach(p => console.log(`   • ${p.fileName} - CRITICAL: Users can get stuck!`));
  
  console.log(`\n📋 Exempt: ${results.exempt.length} pages`);
  results.exempt.forEach(p => console.log(`   • ${p.fileName} (${p.reason})`));
  
  if (results.errors.length > 0) {
    console.log(`\n⚠️  Errors: ${results.errors.length} files`);
    results.errors.forEach(p => console.log(`   • ${p.fileName}: ${p.error}`));
  }
  
  console.log('\n' + '='.repeat(60));
  
  const totalIssues = results.missingHamburgerMenu.length + results.hasBackButtonOnly.length;
  if (totalIssues > 0) {
    console.log(`\n🚨 ACTION REQUIRED: ${totalIssues} pages need navigation fixes!`);
    console.log('\n📄 Reports generated:');
    console.log(`   • ${CONFIG.outputReport} - Detailed analysis`);
    console.log(`   • ${CONFIG.outputFixes} - Copy-paste fix code`);
  } else {
    console.log('\n🎉 All pages have proper navigation!');
  }
  
  console.log('\n');
}

/**
 * Main execution
 */
function main() {
  console.log('\n🔍 PCBancard Navigation Audit');
  console.log('==============================\n');
  console.log('Scanning for pages missing HamburgerMenu...');
  
  // Run the scan
  scanPages(CONFIG.pagesDir);
  
  // Generate reports
  const report = generateReport();
  const fixes = generateFixesFile();
  
  // Write output files
  fs.writeFileSync(CONFIG.outputReport, report);
  fs.writeFileSync(CONFIG.outputFixes, fixes);
  
  // Print summary
  printSummary();
}

// Run the audit
main();

import { ESLint } from 'eslint';
const eslint = new ESLint();
const results = await eslint.lintFiles('.');
const formatter = await eslint.loadFormatter('compact');
const output = await formatter.format(results);
console.log(output);
const errorCount = results.reduce((s, r) => s + r.errorCount, 0);
const warnCount = results.reduce((s, r) => s + r.warningCount, 0);
console.log(`\nTotal: ${errorCount} errors, ${warnCount} warnings`);

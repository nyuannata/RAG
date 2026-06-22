const fs = require('fs');
const path = require('path');

const files = [
  'frontend/src/app/login/page.tsx',
  'frontend/src/app/register/page.tsx',
  'frontend/src/app/dashboard/page.tsx'
];

const replacements = [
  { regex: /RAGDoc AI/g, replace: 'RAG Yuan AI' },
  // background colors
  { regex: /bg-slate-950/g, replace: 'bg-slate-50' },
  { regex: /bg-slate-900/g, replace: 'bg-white' },
  { regex: /bg-slate-800/g, replace: 'bg-slate-100' },
  // text colors
  { regex: /text-slate-100/g, replace: 'text-slate-900' },
  { regex: /text-slate-200/g, replace: 'text-slate-800' },
  { regex: /text-slate-300/g, replace: 'text-slate-700' },
  { regex: /text-slate-400/g, replace: 'text-slate-600' },
  { regex: /text-slate-600/g, replace: 'text-slate-400' }, // e.g. placeholders
  { regex: /text-slate-950/g, replace: 'text-white' },
  // borders
  { regex: /border-slate-900/g, replace: 'border-slate-200' },
  { regex: /border-slate-800/g, replace: 'border-slate-300' },
  { regex: /border-slate-700/g, replace: 'border-slate-400' }
];

for (const file of files) {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    continue;
  }
  let content = fs.readFileSync(filePath, 'utf8');
  for (const {regex, replace} of replacements) {
    content = content.replace(regex, replace);
  }
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Processed ${file}`);
}
console.log('Theme switched successfully.');

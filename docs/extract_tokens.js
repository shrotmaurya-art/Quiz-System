const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, 'stitch-ui');
if (!fs.existsSync(baseDir)) {
  console.error("Directory not found:", baseDir);
  process.exit(1);
}

const folders = fs.readdirSync(baseDir).filter(f => fs.statSync(path.join(baseDir, f)).isDirectory());

console.log(`Found ${folders.length} screen folders.`);

const output = [];

folders.forEach(folder => {
  const htmlPath = path.join(baseDir, folder, 'code.html');
  if (!fs.existsSync(htmlPath)) return;
  
  const content = fs.readFileSync(htmlPath, 'utf8');
  
  // Extract custom style blocks
  const styleMatch = content.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
  const styles = styleMatch ? styleMatch.map(s => s.replace(/<\/?style[^>]*>/gi, '').trim()) : [];
  
  // Find interesting inline styles or styling properties
  // e.g. background gradients, border-radius, box-shadow
  const stylesFound = [];
  const inlineStyles = [];
  const inlineRegex = /style="([^"]+)"/g;
  let match;
  while ((match = inlineRegex.exec(content)) !== null) {
    inlineStyles.push(match[1]);
  }
  
  // Extract key colors, gradients, spacing, fonts from inline styles and styles
  const filterStyles = inlineStyles.filter(s => {
    return s.includes('background') || s.includes('color') || s.includes('border') || s.includes('shadow') || s.includes('font') || s.includes('gradient');
  });

  // Let's summarize Tailwind classes of interest
  const classRegex = /class="([^"]+)"/g;
  const classesFound = [];
  while ((match = classRegex.exec(content)) !== null) {
    const cls = match[1].split(/\s+/);
    cls.forEach(c => {
      if (c.startsWith('rounded-') || c.startsWith('bg-') || c.startsWith('text-') || c.startsWith('shadow-') || c.startsWith('border-') || c.startsWith('font-') || c.startsWith('p-') || c.startsWith('m-') || c.startsWith('gap-') || c.startsWith('space-')) {
        if (!classesFound.includes(c)) {
          classesFound.push(c);
        }
      }
    });
  }

  output.push({
    folder,
    styles,
    inlineStyles: [...new Set(filterStyles)],
    classes: classesFound.sort()
  });
});

fs.writeFileSync(path.join(__dirname, 'stitch_raw_extracted.json'), JSON.stringify(output, null, 2), 'utf8');
console.log("Extraction complete. Raw output written to docs/stitch_raw_extracted.json");

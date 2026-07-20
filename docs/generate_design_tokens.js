const fs = require('fs');
const path = require('path');

const stitchUiDir = path.join(__dirname, 'stitch-ui');
const outputDir = path.join(__dirname, 'stitch-ui-source');
const outputFilePath = path.join(outputDir, 'DESIGN_TOKENS.md');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

if (!fs.existsSync(stitchUiDir)) {
  console.error("Directory not found:", stitchUiDir);
  process.exit(1);
}

const folders = fs.readdirSync(stitchUiDir).filter(f => fs.statSync(path.join(stitchUiDir, f)).isDirectory());

let markdownContent = `# DESIGN TOKENS (Source of Truth from Stitch HTML/CSS Exports)

This file is the single reference for styling values (border-radius, box-shadow, color hex/rgba, gradient stops and angles, typography, and animations) extracted from the RAW Stitch exports in \`docs/stitch-ui/\`.

---

`;

folders.forEach((folder, idx) => {
  const htmlPath = path.join(stitchUiDir, folder, 'code.html');
  if (!fs.existsSync(htmlPath)) return;
  
  const content = fs.readFileSync(htmlPath, 'utf8');
  
  // Extract style blocks
  const styleMatch = content.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
  const styles = styleMatch ? styleMatch.map(s => s.replace(/<\/?style[^>]*>/gi, '').trim()) : [];
  
  // Extract Tailwind config customization if any exists in tailwind script tag
  const tailwindConfigMatch = content.match(/tailwind\.config\s*=\s*(\{[\s\S]*?\})/i);
  const tailwindConfig = tailwindConfigMatch ? tailwindConfigMatch[1].trim() : '';

  // Extract inline styles of interest
  const inlineStyles = [];
  const inlineRegex = /style="([^"]+)"/g;
  let match;
  while ((match = inlineRegex.exec(content)) !== null) {
    const val = match[1].trim();
    if (val) inlineStyles.push(val);
  }
  const uniqueInlineStyles = [...new Set(inlineStyles)].filter(s => {
    return s.includes('background') || s.includes('color') || s.includes('border') || s.includes('shadow') || s.includes('font') || s.includes('clip-path') || s.includes('gradient');
  });

  // Extract specific tailwind classes for shadows, shapes, transitions
  const classRegex = /class="([^"]+)"/g;
  const tailwindClasses = [];
  while ((match = classRegex.exec(content)) !== null) {
    const cls = match[1].split(/\s+/);
    cls.forEach(c => {
      if (c.startsWith('rounded-') || c.startsWith('bg-') || c.startsWith('text-') || c.startsWith('shadow-') || c.startsWith('border-') || c.startsWith('font-') || c.startsWith('gap-') || c.startsWith('p-') || c.startsWith('m-') || c.includes('transition') || c.includes('animate-') || c.includes('duration-')) {
        if (!tailwindClasses.includes(c)) {
          tailwindClasses.push(c);
        }
      }
    });
  }
  const sortedClasses = tailwindClasses.sort();

  markdownContent += `## Screen: ${folder}

### 1. Custom Styles (<style> block)
\`\`\`css
${styles.length > 0 ? styles.join('\n\n') : '/* No custom <style> block declarations */'}
\`\`\`

${tailwindConfig ? `### 2. Custom Tailwind Config\n\`\`\`javascript\ntailwind.config = ${tailwindConfig};\n\`\`\`\n` : ''}

### 3. Key Inline Styles (Gradients, Shapes, Sizes)
${uniqueInlineStyles.length > 0 ? uniqueInlineStyles.map(s => `- \`${s}\``).join('\n') : '*None found*'}

### 4. Style-Affecting Tailwind Classes
- **Borders & Radii:** ${sortedClasses.filter(c => c.startsWith('rounded-') || c.startsWith('border-')).map(c => `\`${c}\``).join(', ') || '*None*'}
- **Colors & Gradients:** ${sortedClasses.filter(c => c.startsWith('bg-') || c.startsWith('text-')).map(c => `\`${c}\``).join(', ') || '*None*'}
- **Shadows:** ${sortedClasses.filter(c => c.startsWith('shadow-') || c.includes('shadow')).map(c => `\`${c}\``).join(', ') || '*None*'}
- **Typography:** ${sortedClasses.filter(c => c.startsWith('font-')).map(c => `\`${c}\``).join(', ') || '*None*'}
- **Animations & Transitions:** ${sortedClasses.filter(c => c.includes('transition') || c.includes('animate-') || c.includes('duration-')).map(c => `\`${c}\``).join(', ') || '*None*'}

---

`;
});

fs.writeFileSync(outputFilePath, markdownContent, 'utf8');
console.log("Tokens file generated at docs/stitch-ui-source/DESIGN_TOKENS.md");
// Copy to docs/stitch-ui/DESIGN_TOKENS.md just in case they search there
fs.writeFileSync(path.join(stitchUiDir, 'DESIGN_TOKENS.md'), markdownContent, 'utf8');
console.log("Tokens file also copied to docs/stitch-ui/DESIGN_TOKENS.md");

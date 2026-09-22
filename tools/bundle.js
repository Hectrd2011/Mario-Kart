/* Inline every script and stylesheet into one self-contained HTML file.
   The game has no dependencies and loads no images, so the whole thing
   collapses into a single file that runs from anywhere.
   usage: node tools/bundle.js [out.html] */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
/* --artifact strips the document wrapper: the Artifact host supplies its
   own doctype/head/body skeleton and the page must not bring one. */
const artifact = process.argv.includes('--artifact');
const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const out = args[0] || path.join(root, 'dist',
  artifact ? 'artifact.html' : 'super-kart-grand-prix.html');

let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

/* stylesheet */
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (m, href) => {
  const css = fs.readFileSync(path.join(root, href), 'utf8');
  return '<style>\n' + css + '\n</style>';
});

/* scripts, in the order index.html declares them */
const scripts = [];
html = html.replace(/<script src="([^"]+)"><\/script>\s*/g, (m, src) => {
  scripts.push(src);
  return '';
});

const bundled = scripts.map(src => {
  const code = fs.readFileSync(path.join(root, src), 'utf8');
  return '/* ==== ' + src + ' ==== */\n' + code;
}).join('\n');

/* A replacer function, not a replacement string: the bitmap font
   contains a '$' glyph, and String.replace reads $' in a replacement
   string as "everything after the match" — which spliced the closing
   </html> into the middle of the code. */
html = html.replace('</body>', () => '<script>\n' + bundled + '\n</script>\n</body>');

if (artifact) {
  /* keep <title>, the inlined <style>, the body content and the script */
  const title = (html.match(/<title>([^<]*)<\/title>/) || [, 'Super Kart Grand Prix'])[1];
  const style = (html.match(/<style>[\s\S]*?<\/style>/) || [''])[0];
  const body = (html.match(/<body>([\s\S]*)<\/body>/) || [, ''])[1];
  html = '<title>' + title + '</title>\n' + style + '\n' +
    '<style>\n' +
    '/* the Artifact host pads :root for phone safe areas and sets its own\n' +
    '   ground; the game wants the whole box and paints its own. */\n' +
    'html, body { height: 100%; }\n' +
    ':root { padding: 0 !important; }\n' +
    '</style>\n' + body;
}

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
console.log('bundled ' + scripts.length + ' scripts -> ' + out + ' (' + kb + ' KB)');

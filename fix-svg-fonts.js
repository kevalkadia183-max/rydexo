const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

walk('artifacts/smart-driver/components/speedometers', file => {
  if (!file.endsWith('.tsx')) return;
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  const replace = (a, b) => {
    if (content.includes(a)) {
      content = content.split(a).join(b);
      changed = true;
    }
  };

  replace('fontWeight="700"', 'fontFamily="SpaceGrotesk_700Bold"');
  replace('fontWeight="600"', 'fontFamily="SpaceGrotesk_600SemiBold"');
  replace('fontWeight="500"', 'fontFamily="SpaceGrotesk_500Medium"');

  if (changed) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
});

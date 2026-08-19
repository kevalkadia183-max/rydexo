const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

walk('artifacts/smart-driver', file => {
  if (!file.endsWith('.tsx') && !file.endsWith('.ts')) return;
  
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  const replace = (a, b) => {
    if (content.includes(a)) {
      content = content.split(a).join(b);
      changed = true;
    }
  };

  replace('Inter_700Bold', 'SpaceGrotesk_700Bold');
  replace('Inter_600SemiBold', 'SpaceGrotesk_600SemiBold');
  replace('Inter_500Medium', 'SpaceGrotesk_500Medium');

  replace('#09090B', '#000000');
  replace('#18181B', '#0A0A0C');
  replace('#27272A', '#1F1F23');
  replace('#00D4FF', '#00E5FF');
  replace('#0099CC', '#00B8CC'); // adjusted secondary tint
  replace('#30D158', '#00FF66');
  replace('#FF9F0A', '#FFE600');
  replace('#FF3B30', '#FF003C');

  if (changed) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
});

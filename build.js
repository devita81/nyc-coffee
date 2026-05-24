const fs = require('fs');

const sha = (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7) || 'local';
const data = {
  commit: sha,
  deployedAt: new Date().toISOString()
};

fs.writeFileSync('version.json', JSON.stringify(data));
console.log('version.json:', data);

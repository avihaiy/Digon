const https = require('https');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf-8');
const match = env.match(/V\s*I\s*T\s*E\s*_\s*G\s*E\s*M\s*I\s*N\s*I\s*_\s*A\s*P\s*I\s*_\s*K\s*E\s*Y\s*=\s*(.*)/);
if (match) {
  const key = match[1].replace(/\s/g, '').trim();
  https.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`, (res) => {
    let data = '';
    res.on('data', d => data += d);
    res.on('end', () => console.log(data));
  }).on('error', e => console.error(e));
} else {
  console.log('Key not found');
}

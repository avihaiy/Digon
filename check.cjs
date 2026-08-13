const https = require('https');
const key = 'AIzaSyAmNVakJkD0sem4B27LWJWJUlAJqZUL648';
https.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => console.log(data));
}).on('error', e => console.error(e));

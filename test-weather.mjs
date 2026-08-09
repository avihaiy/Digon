import https from 'https';

https.get('https://marine-api.open-meteo.com/v1/marine?latitude=32.08&longitude=34.75&hourly=wave_height,wave_direction,wave_period,ocean_tide_elevation&timezone=auto', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('Marine API keys:', Object.keys(json.hourly || {}));
      console.log('Has ocean_tide_elevation:', !!(json.hourly && json.hourly.ocean_tide_elevation));
      if (json.hourly && json.hourly.ocean_tide_elevation) {
        console.log('First 5 values:', json.hourly.ocean_tide_elevation.slice(0, 5));
      }
    } catch (e) { console.error(e); }
  });
});

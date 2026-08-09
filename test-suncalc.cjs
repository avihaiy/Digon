const SunCalc = require('suncalc');
const times = SunCalc.getTimes(new Date(), 32.0853, 34.7818);
console.log(times);

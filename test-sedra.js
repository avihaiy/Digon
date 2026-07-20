import { HDate, HebrewCalendar, flags } from '@hebcal/core';
const hd = new HDate(new Date(2026, 6, 25)); // A Saturday in July 2026
const events = HebrewCalendar.calendar({
  start: hd.greg(),
  end: hd.greg(),
  sedrot: true,
});
console.log(events.map(e => ({ name: e.render('he'), desc: e.getDesc(), flags: e.getFlags() })));

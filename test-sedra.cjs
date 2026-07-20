const { HDate, Sedra, HebrewCalendar, flags } = require('@hebcal/core');

function getUpcomingJewishEvent(date = new Date()) {
  const hdate = new HDate(date);
  
  // Find upcoming Shabbat
  const daysUntilSaturday = (6 - date.getDay()) % 7;
  const upcomingShabbat = new HDate(new Date(date.getTime() + daysUntilSaturday * 24 * 60 * 60 * 1000));
  
  // Get holidays for the current day
  const todayHolidays = HebrewCalendar.getHolidaysOnDate(hdate, true) || [];
  const majorHoliday = todayHolidays.find(h => h.mask & flags.CHAG);
  
  if (majorHoliday) {
    return majorHoliday.render('he');
  }

  // Get Parasha
  const sedra = new Sedra(upcomingShabbat.getFullYear(), true);
  if (sedra.isParsha(upcomingShabbat)) {
    const parsha = sedra.get(upcomingShabbat);
    if (parsha && parsha.length > 0) {
      const parshaHe = upcomingShabbat.getSedra('h');
      if (parshaHe && parshaHe.length > 0) {
        return `פרשת ${parshaHe.join('-')}`;
      }
    }
  }
  
  return null;
}

console.log(getUpcomingJewishEvent());

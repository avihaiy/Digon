import { HDate, HebrewCalendar, flags, Event } from '@hebcal/core';
import { OMER_DAYS } from './omer-data';

export interface SiddurAlert {
  id: string;
  type: 'warning' | 'info' | 'critical';
  title: string;
  message: string;
  icon: string;
}

export function getSiddurAlerts(date: Date = new Date()): SiddurAlert[] {
  const hdate = new HDate(date);
  const alerts: SiddurAlert[] = [];
  
  // Get holidays and events for the current Hebrew date
  const events = HebrewCalendar.getHolidaysOnDate(hdate) || [];
  
  const isRoshChodesh = events.some(e => e.getFlags() & flags.ROSH_CHODESH);
  const isCholHamoed = events.some(e => e.getFlags() & flags.CHOL_HAMOED);
  const isChanukah = events.some(e => e.getDesc().includes('Chanukah'));
  const isPurim = events.some(e => e.getDesc().includes('Purim'));
  const isFastDay = events.some(e => e.getFlags() & flags.MINOR_FAST);
  
  // Yaaleh V'Yavo
  if (isRoshChodesh || isCholHamoed) {
    alerts.push({
      id: 'yaaleh-veyavo',
      type: 'warning',
      title: 'יעלה ויבוא',
      message: isRoshChodesh 
        ? 'היום ראש חודש! לא לשכוח לומר "יעלה ויבוא" והלל.'
        : 'חול המועד! לא לשכוח לומר "יעלה ויבוא" והלל.',
      icon: '🌙'
    });
  }

  // Al HaNissim
  if (isChanukah) {
    alerts.push({
      id: 'al-hanissim-chanukah',
      type: 'info',
      title: 'על הניסים',
      message: 'חנוכה - לא לשכוח "על הניסים" והלל שלם.',
      icon: '🕎'
    });
  }
  
  if (isPurim) {
    alerts.push({
      id: 'al-hanissim-purim',
      type: 'info',
      title: 'על הניסים',
      message: 'פורים - לא לשכוח "על הניסים".',
      icon: '🎭'
    });
  }

  // Fast Days
  if (isFastDay) {
    alerts.push({
      id: 'fast-day',
      type: 'critical',
      title: 'צום / תענית',
      message: 'היום תענית ציבור - מוסיפים "עננו". במנחה אומרים גם תחנון ו"שים שלום".',
      icon: '⚠️'
    });
  }

  // Mashiv HaRuach vs Morid HaTal
  const month = hdate.getMonth();
  const day = hdate.getDate();
  const isWinter = 
    (month > 7 /* Tishrei */) || 
    (month === 7 && day >= 22 /* Shemini Atzeret */) || 
    (month < 1 /* Nisan */) || 
    (month === 1 && day < 15 /* Before Pesach */);

  alerts.push({
    id: 'rain-dew',
    type: 'info',
    title: isWinter ? 'משיב הרוח ומוריד הגשם' : 'מוריד הטל',
    message: isWinter ? 'אומרים "משיב הרוח ומוריד הגשם" ו"ברך עלינו".' : 'קיץ - אומרים "מוריד הטל" ו"ברכנו".',
    icon: isWinter ? '🌧️' : '☀️'
  });

  return alerts;
}

export function getOmerDayString(date: Date = new Date()): string | null {
  const hdate = new HDate(date);
  
  // Sefirat HaOmer is recited at night. If it's after sunset (roughly 18:00), we count for the next Hebrew day.
  if (date.getHours() >= 18) {
    hdate.setDate(hdate.getDate() + 1);
  }
  
  const year = hdate.getFullYear();
  // 15 Nisan of the current Jewish year (Nisan is month 1 in Hebcal core)
  const nisan15 = new HDate(15, 1, year);
  const omerDay = hdate.abs() - nisan15.abs();
  
  if (omerDay >= 1 && omerDay <= 49) {
    return OMER_DAYS[omerDay - 1];
  }
  return null;
}


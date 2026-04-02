import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { getSefiratHaOmer } from '@/lib/hebrew-utils';

const HEBREW_NUMBERS: Record<number, string> = {
  1: 'א', 2: 'ב', 3: 'ג', 4: 'ד', 5: 'ה', 6: 'ו', 7: 'ז',
  8: 'ח', 9: 'ט', 10: 'י', 11: 'יא', 12: 'יב', 13: 'יג', 14: 'יד',
  15: 'טו', 16: 'טז', 17: 'יז', 18: 'יח', 19: 'יט', 20: 'כ',
  21: 'כא', 22: 'כב', 23: 'כג', 24: 'כד', 25: 'כה', 26: 'כו', 27: 'כז',
  28: 'כח', 29: 'כט', 30: 'ל', 31: 'לא', 32: 'לב', 33: 'לג', 34: 'לד',
  35: 'לה', 36: 'לו', 37: 'לז', 38: 'לח', 39: 'לט', 40: 'מ',
  41: 'מא', 42: 'מב', 43: 'מג', 44: 'מד', 45: 'מה', 46: 'מו', 47: 'מז',
  48: 'מח', 49: 'מט',
};

const SEFIROT: Record<number, { name: string; color: string }> = {
  1: { name: 'חסד שבחסד', color: '#FFFFFF' },
  2: { name: 'גבורה שבחסד', color: '#FF4444' },
  3: { name: 'תפארת שבחסד', color: '#FFD700' },
  4: { name: 'נצח שבחסד', color: '#90EE90' },
  5: { name: 'הוד שבחסד', color: '#FFA500' },
  6: { name: 'יסוד שבחסד', color: '#9370DB' },
  7: { name: 'מלכות שבחסד', color: '#4169E1' },
  8: { name: 'חסד שבגבורה', color: '#FFFFFF' },
  9: { name: 'גבורה שבגבורה', color: '#FF4444' },
  10: { name: 'תפארת שבגבורה', color: '#FFD700' },
  11: { name: 'נצח שבגבורה', color: '#90EE90' },
  12: { name: 'הוד שבגבורה', color: '#FFA500' },
  13: { name: 'יסוד שבגבורה', color: '#9370DB' },
  14: { name: 'מלכות שבגבורה', color: '#4169E1' },
  15: { name: 'חסד שבתפארת', color: '#FFFFFF' },
  16: { name: 'גבורה שבתפארת', color: '#FF4444' },
  17: { name: 'תפארת שבתפארת', color: '#FFD700' },
  18: { name: 'נצח שבתפארת', color: '#90EE90' },
  19: { name: 'הוד שבתפארת', color: '#FFA500' },
  20: { name: 'יסוד שבתפארת', color: '#9370DB' },
  21: { name: 'מלכות שבתפארת', color: '#4169E1' },
  22: { name: 'חסד שבנצח', color: '#FFFFFF' },
  23: { name: 'גבורה שבנצח', color: '#FF4444' },
  24: { name: 'תפארת שבנצח', color: '#FFD700' },
  25: { name: 'נצח שבנצח', color: '#90EE90' },
  26: { name: 'הוד שבנצח', color: '#FFA500' },
  27: { name: 'יסוד שבנצח', color: '#9370DB' },
  28: { name: 'מלכות שבנצח', color: '#4169E1' },
  29: { name: 'חסד שבהוד', color: '#FFFFFF' },
  30: { name: 'גבורה שבהוד', color: '#FF4444' },
  31: { name: 'תפארת שבהוד', color: '#FFD700' },
  32: { name: 'נצח שבהוד', color: '#90EE90' },
  33: { name: 'הוד שבהוד', color: '#FFA500' },
  34: { name: 'יסוד שבהוד', color: '#9370DB' },
  35: { name: 'מלכות שבהוד', color: '#4169E1' },
  36: { name: 'חסד שביסוד', color: '#FFFFFF' },
  37: { name: 'גבורה שביסוד', color: '#FF4444' },
  38: { name: 'תפארת שביסוד', color: '#FFD700' },
  39: { name: 'נצח שביסוד', color: '#90EE90' },
  40: { name: 'הוד שביסוד', color: '#FFA500' },
  41: { name: 'יסוד שביסוד', color: '#9370DB' },
  42: { name: 'מלכות שביסוד', color: '#4169E1' },
  43: { name: 'חסד שבמלכות', color: '#FFFFFF' },
  44: { name: 'גבורה שבמלכות', color: '#FF4444' },
  45: { name: 'תפארת שבמלכות', color: '#FFD700' },
  46: { name: 'נצח שבמלכות', color: '#90EE90' },
  47: { name: 'הוד שבמלכות', color: '#FFA500' },
  48: { name: 'יסוד שבמלכות', color: '#9370DB' },
  49: { name: 'מלכות שבמלכות', color: '#4169E1' },
};
function getOmerBracha(dayNum: number): string {
  const hebrewNum = HEBREW_NUMBERS[dayNum];
  const weeks = Math.floor(dayNum / 7);
  const days = dayNum % 7;

  const dayWord = dayNum === 1 ? 'יוֹם אֶחָד' : `${hebrewNum} יָמִים`;
  
  let countText = `הַיּוֹם ${dayWord} בָּעֹמֶר`;
  
  if (weeks > 0 && days === 0) {
    const weekWord = weeks === 1 ? 'שָׁבוּעַ אֶחָד' : `${HEBREW_NUMBERS[weeks]} שָׁבוּעוֹת`;
    countText = `הַיּוֹם ${dayWord} בָּעֹמֶר, שֶׁהֵם ${weekWord}`;
  } else if (weeks > 0 && days > 0) {
    const weekWord = weeks === 1 ? 'שָׁבוּעַ אֶחָד' : `${HEBREW_NUMBERS[weeks]} שָׁבוּעוֹת`;
    const dayRemWord = days === 1 ? 'יוֹם אֶחָד' : `${HEBREW_NUMBERS[days]} יָמִים`;
    countText = `הַיּוֹם ${dayWord} בָּעֹמֶר, שֶׁהֵם ${weekWord} וְ${dayRemWord}`;
  }

  return `בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו וְצִוָּנוּ עַל סְפִירַת הָעֹמֶר.\n${countText}.`;
}

interface OmerDisplaySlideProps {
  previewDay?: number | null;
}

export default function OmerDisplaySlide({ previewDay }: OmerDisplaySlideProps = {}) {
  const omerData = useMemo(() => {
    let dayNum: number | null = null;

    if (previewDay && previewDay >= 1 && previewDay <= 49) {
      dayNum = previewDay;
    } else {
      const now = new Date();
      const omerText = getSefiratHaOmer(now);
      if (!omerText) return null;
      const match = omerText.match(/יום (\d+)/);
      dayNum = match ? parseInt(match[1]) : null;
    }

    if (!dayNum) return null;

    const weeks = Math.floor(dayNum / 7);
    const days = dayNum % 7;
    const sefira = SEFIROT[dayNum];
    const hebrewNum = HEBREW_NUMBERS[dayNum];

    let weeksText = '';
    if (weeks > 0 && days === 0) {
      weeksText = `שהם ${weeks === 1 ? 'שבוע אחד' : `${HEBREW_NUMBERS[weeks]} שבועות`}`;
    } else if (weeks > 0 && days > 0) {
      weeksText = `שהם ${weeks === 1 ? 'שבוע אחד' : `${HEBREW_NUMBERS[weeks]} שבועות`} ו${days === 1 ? 'יום אחד' : `${HEBREW_NUMBERS[days]} ימים`}`;
    }

    const bracha = getOmerBracha(dayNum);

    return { dayNum, hebrewNum, weeks, days, weeksText, sefira, bracha };
  }, [previewDay]);

  if (!omerData) return null;

  const progress = (omerData.dayNum / 49) * 100;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a0533 0%, #0d1b3e 40%, #1a0533 100%)',
        overflow: 'hidden',
      }}
      dir="rtl"
    >
      {/* Decorative background */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.08,
        background: 'radial-gradient(circle at 30% 20%, #FFD700 0%, transparent 50%), radial-gradient(circle at 70% 80%, #9370DB 0%, transparent 50%)',
      }} />

      {/* Stars decoration */}
      {Array.from({ length: 49 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: i < omerData.dayNum ? 0.6 : 0.1 }}
          style={{
            position: 'absolute',
            width: 'clamp(4px, 0.5vw, 8px)',
            height: 'clamp(4px, 0.5vw, 8px)',
            borderRadius: '50%',
            background: i < omerData.dayNum ? '#FFD700' : '#334',
            top: `${10 + Math.random() * 80}%`,
            left: `${5 + Math.random() * 90}%`,
          }}
        />
      ))}

      {/* Title */}
      <motion.h1
        initial={{ y: -20 }}
        animate={{ y: 0 }}
        style={{
          fontSize: 'clamp(28px, 5vh, 64px)',
          fontWeight: 800,
          color: '#FFD700',
          textShadow: '0 2px 20px rgba(255,215,0,0.4), 0 4px 40px rgba(255,215,0,0.2)',
          letterSpacing: '0.05em',
          zIndex: 1,
          marginBottom: 'clamp(8px, 1.5vh, 16px)',
        }}
      >
        🌾 ספירת העומר 🌾
      </motion.h1>

      {/* Day number - big */}
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
        style={{
          fontSize: 'clamp(80px, 18vh, 200px)',
          fontWeight: 900,
          color: '#FFFFFF',
          textShadow: '0 4px 30px rgba(255,215,0,0.5), 0 0 60px rgba(147,112,219,0.3)',
          lineHeight: 1,
          zIndex: 1,
        }}
      >
        {omerData.hebrewNum}
      </motion.div>

      {/* "היום X ימים לעומר" */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        style={{
          fontSize: 'clamp(20px, 4vh, 48px)',
          color: 'rgba(255,255,255,0.9)',
          fontWeight: 600,
          zIndex: 1,
          marginTop: 'clamp(4px, 1vh, 12px)',
          textShadow: '0 2px 12px rgba(0,0,0,0.5)',
        }}
      >
        היום {omerData.dayNum === 1 ? 'יום אחד' : `${omerData.hebrewNum} ימים`} בעומר
      </motion.p>

      {/* Weeks breakdown */}
      {omerData.weeksText && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{
            fontSize: 'clamp(16px, 3vh, 36px)',
            color: 'rgba(255,215,0,0.85)',
            fontWeight: 500,
            zIndex: 1,
            marginTop: 'clamp(2px, 0.5vh, 8px)',
          }}
        >
          {omerData.weeksText}
        </motion.p>
      )}

      {/* Sefira */}
      {omerData.sefira && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          style={{
            marginTop: 'clamp(12px, 2vh, 24px)',
            padding: 'clamp(8px, 1.5vh, 16px) clamp(20px, 3vw, 40px)',
            borderRadius: 'clamp(8px, 1vw, 16px)',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,215,0,0.25)',
            backdropFilter: 'blur(8px)',
            zIndex: 1,
          }}
        >
          <p style={{
            fontSize: 'clamp(18px, 3.5vh, 40px)',
            color: omerData.sefira.color,
            fontWeight: 700,
            textShadow: `0 2px 12px ${omerData.sefira.color}40`,
          }}>
            {omerData.sefira.name}
          </p>
        </motion.div>
      )}

      {/* Bracha */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        style={{
          marginTop: 'clamp(12px, 2vh, 24px)',
          padding: 'clamp(8px, 1.2vh, 14px) clamp(16px, 2.5vw, 36px)',
          borderRadius: 'clamp(8px, 1vw, 16px)',
          background: 'rgba(255,215,0,0.06)',
          border: '1px solid rgba(255,215,0,0.15)',
          backdropFilter: 'blur(8px)',
          zIndex: 1,
          maxWidth: '90%',
          textAlign: 'center',
        }}
      >
        <p style={{
          fontSize: 'clamp(14px, 2.2vh, 28px)',
          color: 'rgba(255,255,255,0.85)',
          fontWeight: 500,
          lineHeight: 1.8,
          whiteSpace: 'pre-line',
          direction: 'rtl',
        }}>
          {omerData.bracha}
        </p>
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        style={{
          position: 'absolute',
          bottom: 'clamp(16px, 3vh, 40px)',
          width: '80%',
          maxWidth: '600px',
          zIndex: 1,
        }}
      >
        <div style={{
          height: 'clamp(6px, 1vh, 12px)',
          borderRadius: '999px',
          background: 'rgba(255,255,255,0.1)',
          overflow: 'hidden',
          border: '1px solid rgba(255,215,0,0.15)',
        }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            style={{
              height: '100%',
              borderRadius: '999px',
              background: 'linear-gradient(90deg, #FFD700, #FFA500, #FFD700)',
              boxShadow: '0 0 12px rgba(255,215,0,0.4)',
            }}
          />
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 'clamp(2px, 0.3vh, 4px)',
          fontSize: 'clamp(10px, 1.5vh, 16px)',
          color: 'rgba(255,255,255,0.4)',
        }}>
          <span>פסח</span>
          <span>{omerData.dayNum}/49</span>
          <span>שבועות</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

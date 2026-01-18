import { motion } from 'framer-motion';
import { getBirkatHashanim } from '@/lib/hebrew-utils';

interface BirkatHashanimSectionProps {
  date?: Date;
}

export function BirkatHashanimSection({ date = new Date() }: BirkatHashanimSectionProps) {
  const birkat = getBirkatHashanim(date);
  
  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-5 border-2 border-amber-200 shadow-lg">
      <h3 className="text-xl font-bold text-center text-amber-800 mb-4 bg-amber-100 py-2 rounded-lg">
        ברכת השנים
      </h3>
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <div className={`text-2xl font-bold py-4 px-6 rounded-xl ${
          birkat.isTalUmatar 
            ? 'bg-blue-100 text-blue-800 border-2 border-blue-200' 
            : 'bg-green-100 text-green-800 border-2 border-green-200'
        }`}>
          {birkat.text}
        </div>
      </motion.div>
    </div>
  );
}

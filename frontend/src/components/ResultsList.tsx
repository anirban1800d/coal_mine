import { motion, AnimatePresence } from 'framer-motion';
import { type CPCBResponse, type DGMSResponse } from '../services/api';
import ResultCardCPCB from './ResultCardCPCB';
import ResultCardDGMS from './ResultCardDGMS';

interface ResultsListProps {
  cpcbData: CPCBResponse | null;
  dgmsData: DGMSResponse | null;
  domain: 'cpcb' | 'dgms';
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
};

export default function ResultsList({ cpcbData, dgmsData, domain }: ResultsListProps) {
  const isCpcb = domain === 'cpcb' && !!cpcbData?.recomendations;
  const isDgms = domain === 'dgms' && !!dgmsData?.results;

  const totalResults = isCpcb
    ? cpcbData!.total_result
    : isDgms
      ? dgmsData!.total
      : 0;

  return (
    <div className="w-full py-8" aria-live="polite">
      <div className="mb-6 flex items-center justify-between border-b border-[var(--color-border)] pb-4">
        <h2 className="text-base font-semibold tracking-tight text-white">Results</h2>
        <span className="font-mono-tight text-xs text-[var(--color-muted)]">
          {totalResults} {totalResults === 1 ? 'match' : 'matches'}
        </span>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-5 lg:grid-cols-2"
      >
        <AnimatePresence mode="popLayout">
          {isCpcb &&
            cpcbData!.recomendations.map((item, index) => (
              <ResultCardCPCB
                key={`${item.Requirement_id}-${index}`}
                item={item}
                variants={itemVariants}
              />
            ))}

          {isDgms &&
            dgmsData!.results.map((item, index) => (
              <ResultCardDGMS
                key={`${item['Requirement ID']}-${index}`}
                item={item}
                variants={itemVariants}
              />
            ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

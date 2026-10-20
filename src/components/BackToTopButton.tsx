import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp } from 'lucide-react';
import { triggerHaptic } from '../lib/haptics';
import { useLang } from '../contexts/LanguageContext';

export default function BackToTopButton() {
  const { lang } = useLang();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show when scrolled down past 280px
      if (window.scrollY > 280) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    triggerHaptic('tap');
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          type="button"
          initial={{ opacity: 0, scale: 0.7, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.7, y: 15 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          onClick={scrollToTop}
          title={lang === 'th' ? 'กลับขึ้นด้านบน' : 'Back to top'}
          aria-label={lang === 'th' ? 'กลับขึ้นด้านบน' : 'Back to top'}
          className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-30 h-10 w-10 sm:h-11 sm:w-11 rounded-full liquid-glass border border-forest/20 text-forest hover:bg-forest hover:text-cream shadow-xl flex items-center justify-center transition active:scale-90"
        >
          <ChevronUp className="h-5 w-5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

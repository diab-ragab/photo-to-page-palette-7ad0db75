import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { Shield } from 'lucide-react';

export const ConsentPopup = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const consent = localStorage.getItem('consent-accepted');
    if (!consent) {
      // Small delay to let the page load first
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('consent-accepted', 'true');
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem('consent-accepted', 'declined');
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100]"
            onClick={handleAccept}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4"
          >
            <div className="w-[90%] max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl">
              {/* Icon */}
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <Shield className="w-8 h-8 text-primary" />
                </div>
              </div>

              {/* Title */}
              <h2 className="text-xl font-display font-bold text-center mb-3">
                {t('consent.title')}
              </h2>

              {/* Description */}
              <p className="text-muted-foreground text-center text-sm mb-4">
                {t('consent.description')}
              </p>

              {/* Links */}
              <div className="flex justify-center gap-4 mb-6">
                <Link 
                  to="/terms" 
                  className="text-primary hover:underline text-sm"
                  onClick={handleAccept}
                >
                  {t('consent.terms')}
                </Link>
                <Link 
                  to="/privacy" 
                  className="text-primary hover:underline text-sm"
                  onClick={handleAccept}
                >
                  {t('consent.privacy')}
                </Link>
              </div>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={handleDecline}
                >
                  {t('consent.decline')}
                </Button>
                <Button 
                  variant="default" 
                  className="flex-1"
                  onClick={handleAccept}
                >
                  {t('consent.accept')}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

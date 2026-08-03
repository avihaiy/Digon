import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Accessibility, Type, Eye, Link as LinkIcon, MinusCircle, Sun, FileText, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function AccessibilityWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState({
    largeText: false,
    readableFont: false,
    highlightLinks: false,
    monochrome: false,
    highContrast: false,
  });

  // Apply classes to document element based on settings
  useEffect(() => {
    const html = document.documentElement;
    
    settings.largeText ? html.classList.add('a11y-large-text') : html.classList.remove('a11y-large-text');
    settings.readableFont ? html.classList.add('a11y-readable-font') : html.classList.remove('a11y-readable-font');
    settings.highlightLinks ? html.classList.add('a11y-highlight-links') : html.classList.remove('a11y-highlight-links');
    settings.monochrome ? html.classList.add('a11y-monochrome') : html.classList.remove('a11y-monochrome');
    settings.highContrast ? html.classList.add('a11y-high-contrast') : html.classList.remove('a11y-high-contrast');

  }, [settings]);

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const resetSettings = () => {
    setSettings({
      largeText: false,
      readableFont: false,
      highlightLinks: false,
      monochrome: false,
      highContrast: false,
    });
  };

  return (
    <div className="fixed bottom-24 left-4 z-[100]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="absolute bottom-16 left-0 w-[280px] max-w-[90vw]"
          >
            <Card className="border-2 border-primary/20 shadow-2xl overflow-hidden rounded-2xl">
              <CardContent className="p-4 bg-background">
                <div className="flex items-center justify-between mb-4 border-b pb-2">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <Accessibility className="w-5 h-5 text-primary" />
                    תפריט נגישות
                  </h3>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setIsOpen(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-2 max-h-[60vh] overflow-y-auto pl-1 pr-1 pb-2">
                  <Button 
                    variant={settings.largeText ? "default" : "outline"}
                    className="w-full justify-start gap-3 h-12"
                    onClick={() => toggleSetting('largeText')}
                  >
                    <Type className="w-5 h-5" />
                    טקסט מוגדל
                  </Button>

                  <Button 
                    variant={settings.readableFont ? "default" : "outline"}
                    className="w-full justify-start gap-3 h-12"
                    onClick={() => toggleSetting('readableFont')}
                  >
                    <Type className="w-5 h-5" />
                    פונט קריא (אריאל)
                  </Button>

                  <Button 
                    variant={settings.highlightLinks ? "default" : "outline"}
                    className="w-full justify-start gap-3 h-12"
                    onClick={() => toggleSetting('highlightLinks')}
                  >
                    <LinkIcon className="w-5 h-5" />
                    הדגשת קישורים
                  </Button>

                  <Button 
                    variant={settings.monochrome ? "default" : "outline"}
                    className="w-full justify-start gap-3 h-12"
                    onClick={() => toggleSetting('monochrome')}
                  >
                    <Eye className="w-5 h-5" />
                    גווני אפור (מונוכרום)
                  </Button>

                  <Button 
                    variant={settings.highContrast ? "default" : "outline"}
                    className="w-full justify-start gap-3 h-12"
                    onClick={() => toggleSetting('highContrast')}
                  >
                    <Sun className="w-5 h-5" />
                    ניגודיות גבוהה
                  </Button>
                  
                  <div className="pt-2 mt-2 border-t border-border">
                    <Button 
                      variant="ghost"
                      className="w-full justify-start gap-3 h-10 text-muted-foreground hover:text-foreground"
                      onClick={() => alert("הצהרת הנגישות בתהליך כתיבה בהתאם לתקן 5568. פותח על ידי צוות דיגון.")}
                    >
                      <FileText className="w-4 h-4" />
                      הצהרת נגישות
                    </Button>
                  </div>
                </div>

                <Button 
                  variant="destructive" 
                  className="w-full mt-3 h-10 rounded-xl"
                  onClick={resetSettings}
                >
                  <MinusCircle className="w-4 h-4 ml-2" />
                  איפוס הגדרות נגישות
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        size="icon"
        className={`w-14 h-14 rounded-full shadow-2xl border-4 ${isOpen ? 'border-primary bg-primary text-primary-foreground' : 'border-background bg-blue-600 text-white hover:bg-blue-700'} transition-all duration-300`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="פתח תפריט נגישות"
      >
        <Accessibility className="w-7 h-7" />
      </Button>
    </div>
  );
}

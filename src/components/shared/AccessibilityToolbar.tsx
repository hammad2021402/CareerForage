import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, X, Plus, Minus } from 'lucide-react';

interface AccessibilitySettings {
  fontSize: number;
  highContrast: boolean;
  dyslexicFont: boolean;
  textToSpeech: boolean;
}

export default function AccessibilityToolbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<AccessibilitySettings>({
    fontSize: 16,
    highContrast: false,
    dyslexicFont: false,
    textToSpeech: false,
  });

  useEffect(() => {
    document.documentElement.style.fontSize = `${settings.fontSize}px`;
    if (settings.highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
    if (settings.dyslexicFont) {
      document.documentElement.classList.add('dyslexic-font');
    } else {
      document.documentElement.classList.remove('dyslexic-font');
    }
  }, [settings]);

  const updateSetting = <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <>
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 bg-gradient-to-br from-violet-600 to-cyan-500 text-white rounded-2xl shadow-[0_0_24px_rgba(139,92,246,0.40)] flex items-center justify-center transition-all hover:shadow-[0_0_36px_rgba(139,92,246,0.55)]"
        aria-label="Open Accessibility Toolbar"
      >
        <Eye className="w-6 h-6" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-[var(--surface-elevated)] shadow-2xl z-[70] overflow-y-auto border-l border-[var(--border)]"
          >
            <div className="p-6">
              <button onClick={() => setIsOpen(false)} className="mb-4 p-2 hover:bg-[var(--surface-hover)] rounded-xl transition-colors">
                <X className="w-6 h-6 text-[var(--text-muted)]" />
              </button>
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Accessibility</h2>
              <div className="space-y-6">
                <div className="space-y-3">
                  <h3 className="text-[var(--text-primary)] font-medium">Font Size</h3>
                  <div className="flex items-center gap-4">
                    <button onClick={() => updateSetting('fontSize', Math.max(12, settings.fontSize - 2))} className="p-2 bg-[var(--surface-hover)] border border-[var(--border)] rounded-xl hover:bg-[var(--surface-card-hover)] transition-colors">
                      <Minus className="w-5 h-5 text-[var(--text-secondary)]" />
                    </button>
                    <span className="text-[var(--text-primary)] font-medium">{settings.fontSize}px</span>
                    <button onClick={() => updateSetting('fontSize', Math.min(24, settings.fontSize + 2))} className="p-2 bg-[var(--surface-hover)] border border-[var(--border)] rounded-xl hover:bg-[var(--surface-card-hover)] transition-colors">
                      <Plus className="w-5 h-5 text-[var(--text-secondary)]" />
                    </button>
                  </div>
                </div>
                <div>
                   <button onClick={() => updateSetting('highContrast', !settings.highContrast)} className={`w-full p-4 rounded-xl border text-sm font-medium transition-colors ${ settings.highContrast ? 'bg-violet-500/15 border-violet-500/40 text-violet-300' : 'bg-[var(--surface-hover)] border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-card-hover)]' }`}>
                    High Contrast: {settings.highContrast ? 'On' : 'Off'}
                  </button>
                </div>
                <div>
                  <button onClick={() => updateSetting('dyslexicFont', !settings.dyslexicFont)} className={`w-full p-4 rounded-xl border text-sm font-medium transition-colors ${ settings.dyslexicFont ? 'bg-violet-500/15 border-violet-500/40 text-violet-300' : 'bg-[var(--surface-hover)] border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-card-hover)]' }`}>
                    Dyslexic Font: {settings.dyslexicFont ? 'On' : 'Off'}
                  </button>
                </div>
                <div>
                  <button onClick={() => updateSetting('textToSpeech', !settings.textToSpeech)} className={`w-full p-4 rounded-xl border text-sm font-medium transition-colors ${ settings.textToSpeech ? 'bg-violet-500/15 border-violet-500/40 text-violet-300' : 'bg-[var(--surface-hover)] border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-card-hover)]' }`}>
                    Text-to-Speech: {settings.textToSpeech ? 'On' : 'Off'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

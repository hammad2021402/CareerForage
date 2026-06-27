import { useState, useEffect } from 'react';

interface AccessibilitySettings {
  textToSpeech: boolean;
  speechToText: boolean;
  highContrast: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'xl';
  dyslexiaFont: boolean;
}

export const useAccessibility = () => {
  const [settings, setSettings] = useState<AccessibilitySettings>({
    textToSpeech: false,
    speechToText: false,
    highContrast: false,
    fontSize: 'medium',
    dyslexiaFont: false,
  });

  useEffect(() => {
    const saved = localStorage.getItem('accessibility');
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('accessibility', JSON.stringify(settings));
    
    // Apply settings
    document.documentElement.classList.toggle('high-contrast', settings.highContrast);
    document.documentElement.classList.toggle('dyslexia-font', settings.dyslexiaFont);
    
    const fontSizes = { small: '14px', medium: '16px', large: '18px', xl: '20px' };
    document.documentElement.style.fontSize = fontSizes[settings.fontSize];
  }, [settings]);

  const updateSetting = <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return { settings, updateSetting };
};
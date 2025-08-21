import { useEffect } from 'react';

export const FontInjector = () => {
  useEffect(() => {
    // Force apply Figtree to all elements after React renders
    const applyFonts = () => {
      const elements = document.querySelectorAll('*');
      elements.forEach((el) => {
        if (el instanceof HTMLElement) {
          el.style.fontFamily = "'Figtree', 'FigtreeLocal', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";
        }
      });
      console.log('🎯 Applied Figtree to', elements.length, 'elements');
    };

    // Apply immediately
    applyFonts();
    
    // Apply after a delay to catch late-rendered elements
    const timeouts = [100, 500, 1000, 2000].map(delay => 
      setTimeout(applyFonts, delay)
    );
    
    // Cleanup timeouts
    return () => timeouts.forEach(clearTimeout);
  }, []);

  return null;
};
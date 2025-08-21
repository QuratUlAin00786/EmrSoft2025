// Enhanced Font Loading Utility
export class FigtreeLoader {
  private static instance: FigtreeLoader;
  private loaded = false;
  
  static getInstance(): FigtreeLoader {
    if (!FigtreeLoader.instance) {
      FigtreeLoader.instance = new FigtreeLoader();
    }
    return FigtreeLoader.instance;
  }
  
  async loadFigtree(): Promise<void> {
    if (this.loaded) return;
    
    try {
      // Create multiple font face declarations
      const fonts = [
        new FontFace('FigtreeRuntime', 'url(https://fonts.gstatic.com/s/figtree/v5/_Xmq-H86tzKDdAPa-KPQZ-AC5i-4icjSJhc.woff2)', {
          weight: '400',
          style: 'normal',
          display: 'swap'
        }),
        new FontFace('FigtreeRuntime', 'url(/fonts/figtree-500.woff2)', {
          weight: '500',
          style: 'normal', 
          display: 'swap'
        }),
        new FontFace('FigtreeRuntime', 'url(/fonts/figtree-600.woff2)', {
          weight: '600',
          style: 'normal',
          display: 'swap'
        })
      ];
      
      // Load all fonts
      const loadedFonts = await Promise.all(fonts.map(font => font.load()));
      
      // Add to document fonts
      loadedFonts.forEach(font => {
        (document as any).fonts.add(font);
      });
      
      // Apply to document
      this.applyFigtreeStyles();
      this.loaded = true;
      
      console.log('✅ Figtree loaded via TypeScript utility');
    } catch (error) {
      console.warn('❌ Figtree loading failed:', error);
      this.applyFallbackStyles();
    }
  }
  
  private applyFigtreeStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .figtree-runtime * {
        font-family: 'Figtree', 'FigtreeRuntime', 'FigtreeLocal', system-ui, sans-serif !important;
      }
    `;
    document.head.appendChild(style);
    document.documentElement.classList.add('figtree-runtime');
  }
  
  private applyFallbackStyles() {
    document.body.style.fontFamily = "system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  }
}
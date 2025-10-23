import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { useEffect } from "react";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const style = document.getElementById('theme-image-style') || document.createElement('style');
    style.id = 'theme-image-style';
    
    if (theme === 'dark') {
      style.textContent = `
        .dark img:not([data-theme-exempt]) {
          filter: brightness(0.8) contrast(1.2);
        }
        .dark img[src*="logo"]:not([data-theme-exempt]),
        .dark img[alt*="logo"]:not([data-theme-exempt]),
        .dark img[alt*="Logo"]:not([data-theme-exempt]) {
          filter: brightness(0.9) contrast(1.1);
        }
      `;
    } else {
      style.textContent = '';
    }
    
    if (!document.head.contains(style)) {
      document.head.appendChild(style);
    }
  }, [theme]);

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="h-9 w-9 p-0"
      title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
    >
      {theme === "light" ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
    </Button>
  );
}
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
        .dark .bg-white:not(.dark\\:bg-\\[hsl\\(var\\(--cura-midnight\\)\\)\\]) {
          background-color: hsl(222.2, 84%, 4.9%) !important;
          color: hsl(210, 40%, 98%) !important;
        }
        .dark .bg-blue-50:not([class*="dark:bg-"]) {
          background-color: hsl(222.2, 84%, 10%) !important;
          border-color: hsl(222.2, 84%, 20%) !important;
        }
        .dark .bg-gray-50:not([class*="dark:bg-"]) {
          background-color: hsl(222.2, 84%, 8%) !important;
          border-color: hsl(222.2, 84%, 18%) !important;
        }
        .dark .text-black:not([class*="dark:text-"]) {
          color: hsl(210, 40%, 98%) !important;
        }
        .dark .text-gray-700:not([class*="dark:text-"]) {
          color: hsl(215, 20%, 85%) !important;
        }
        .dark .text-gray-600:not([class*="dark:text-"]) {
          color: hsl(215, 20%, 75%) !important;
        }
        .dark .text-blue-700:not([class*="dark:text-"]) {
          color: hsl(217, 91%, 70%) !important;
        }
        .dark .text-blue-800:not([class*="dark:text-"]) {
          color: hsl(217, 91%, 75%) !important;
        }
        .dark .border-blue-200:not([class*="dark:border-"]) {
          border-color: hsl(222.2, 84%, 20%) !important;
        }
        .dark .border-gray-200:not([class*="dark:border-"]) {
          border-color: hsl(222.2, 84%, 15%) !important;
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
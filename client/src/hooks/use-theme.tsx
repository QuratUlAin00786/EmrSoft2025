import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize theme from localStorage on client side only
  useEffect(() => {
    const savedTheme = localStorage.getItem("cura-theme") as Theme;
    const initialTheme = savedTheme || "light";
    
    // Apply theme immediately without waiting for state update
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(initialTheme);
    
    setTheme(initialTheme);
    setIsInitialized(true);
  }, []);

  // Apply theme changes immediately when theme state changes
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    
    // Save theme to localStorage
    localStorage.setItem("cura-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    
    // Apply theme change immediately to DOM
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(newTheme);
    
    // Update state
    setTheme(newTheme);
    
    // Save to localStorage immediately
    localStorage.setItem("cura-theme", newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
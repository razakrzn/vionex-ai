import React, { createContext, useContext, useEffect } from "react";
import { useThemeStore } from "@/stores/themeStore";

type Theme = "dark" | "light" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme: themeFromStore, setTheme: setThemeStore } = useThemeStore();

  // Resolve system theme to actual theme
  const getResolvedTheme = (): "dark" | "light" => {
    if (themeFromStore === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return themeFromStore as "dark" | "light";
  };

  const resolvedTheme = getResolvedTheme();

  const setTheme = (newTheme: Theme) => {
    setThemeStore(newTheme);
  };

  const toggleTheme = () => {
    const currentTheme = resolvedTheme;
    setTheme(currentTheme === "dark" ? "light" : "dark");
  };

  useEffect(() => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(resolvedTheme);
  }, [resolvedTheme]);

  return (
    <ThemeContext.Provider value={{ theme: themeFromStore, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

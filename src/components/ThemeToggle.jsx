import React, { useState } from "react";
import { Sun, Moon } from "lucide-react";
import { CommandRow } from "./CommandRow";

const STORAGE_KEY = "lol_tracker_theme";

const getInitialTheme = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // storage unavailable
  }
  return "dark"; // dark is the default theme
};

export const ThemeToggle = () => {
  const [theme, setTheme] = useState(getInitialTheme);
  const isDark = theme === "dark";

  const toggle = () => {
    const next = isDark ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  };

  return (
    <CommandRow
      icon={isDark ? Moon : Sun}
      label="Тема"
      state={isDark ? "тёмная" : "светлая"}
      onClick={toggle}
      title={isDark ? "Включить светлую тему" : "Включить тёмную тему"}
    />
  );
};

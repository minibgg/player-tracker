/** @type {import('tailwindcss').Config} */

// Every colour comes from a CSS variable defined in src/index.css (an "R G B"
// triple), so utilities like `bg-surface` and `border-line/60` follow the theme.
const token = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        canvas: token("canvas"),
        surface: {
          DEFAULT: token("surface"),
          2: token("surface-2"),
          3: token("surface-3"),
        },
        line: {
          DEFAULT: token("line"),
          strong: token("line-strong"),
        },
        ink: {
          DEFAULT: token("ink"),
          2: token("ink-2"),
        },
        accent: {
          DEFAULT: token("accent"),
          hover: token("accent-hover"),
          ink: token("accent-ink"),
          fg: token("accent-fg"),
        },
        success: token("success"),
        warn: token("warn"),
        danger: token("danger"),
        info: token("info"),
        "team-blue": token("team-blue"),
        scrim: token("scrim"),
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        display: ["var(--font-display)"],
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
      },
      boxShadow: {
        sm: "none",
        DEFAULT: "none",
        md: "none",
        lg: "var(--shadow-soft)",
        xl: "var(--shadow-soft)",
        "2xl": "var(--shadow-soft)",
        inner: "none",
      },
      transitionDuration: { DEFAULT: "200ms" },
      transitionTimingFunction: { DEFAULT: "cubic-bezier(0, 0, 0.2, 1)" },
      animation: {
        "pulse-subtle": "pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};

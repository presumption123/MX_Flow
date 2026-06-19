/** Theme presets — sets data-theme + CSS variables on document.documentElement */

export const THEMES = {
  dark: {
    label: "Dark",
    appBg: "#0a0a0a",
    bgSecondary: "#111111",
    bgTertiary: "#171717",
    border: "#333333",
    text: "#e8e8e8",
    textMuted: "#888888",
    aff: "#0a8fea",
    neg: "#ff4d00",
    speechAffText: "#9db5c8",
    speechNegText: "#d9a8a9",
    gridBg: "#0a0a0a",
    gridHeaderBg: "#161616",
    toolbarBg: "#111111",
    selection: "rgba(10, 143, 234, 0.12)",
    dropped: "#5a1e1e",
    conceded: "#1e4d2b",
  },
  light: {
    label: "Light",
    appBg: "#ffffff",
    bgSecondary: "#f5f5f5",
    bgTertiary: "#ebebeb",
    border: "#d4d4d4",
    text: "#111111",
    textMuted: "#666666",
    aff: "#2f80ed",
    neg: "#ef4444",
    speechAffText: "#4a6f8c",
    speechNegText: "#9b5051",
    gridBg: "#ffffff",
    gridHeaderBg: "#ffffff",
    toolbarBg: "#f5f5f5",
    selection: "rgba(47, 128, 237, 0.1)",
    dropped: "#fecaca",
    conceded: "#bbf7d0",
  },
  courtroom: {
    label: "Courtroom",
    appBg: "#120f0b",
    bgSecondary: "#1a1610",
    bgTertiary: "#231e16",
    border: "#3d3428",
    text: "#d8d2c5",
    textMuted: "#8a8278",
    aff: "#d8d2c5",
    neg: "#9a5a2d",
    speechAffText: "#a5b5c2",
    speechNegText: "#cc9488",
    gridBg: "#120f0b",
    gridHeaderBg: "#1a1610",
    toolbarBg: "#1a1610",
    selection: "rgba(216, 210, 197, 0.1)",
    dropped: "#5a1e1e",
    conceded: "#1e4d2b",
  },
  classic: {
    label: "Classic",
    appBg: "#0d1117",
    bgSecondary: "#161b22",
    bgTertiary: "#1c2129",
    border: "#30363d",
    text: "#c9d1d9",
    textMuted: "#8b949e",
    aff: "#58a6ff",
    neg: "#f85149",
    speechAffText: "#9db5c8",
    speechNegText: "#d9a8a9",
    gridBg: "#0d1117",
    gridHeaderBg: "#161b22",
    toolbarBg: "#161b22",
    selection: "rgba(88, 166, 255, 0.08)",
    dropped: "#5a1e1e",
    conceded: "#1e4d2b",
  },
  paper: {
    label: "Paper",
    appBg: "#f5f0e8",
    bgSecondary: "#ebe4d8",
    bgTertiary: "#e0d8c8",
    border: "#c4b8a4",
    text: "#2c2416",
    textMuted: "#6b5f4e",
    aff: "#31572c",
    neg: "#8f1d2c",
    speechAffText: "#4a6f8c",
    speechNegText: "#9b5051",
    gridBg: "#faf7f2",
    gridHeaderBg: "#ebe4d8",
    toolbarBg: "#ebe4d8",
    selection: "rgba(49, 87, 44, 0.1)",
    dropped: "#fecaca",
    conceded: "#bbf7d0",
  },
};

export function applyTheme(themeName, gridFontFamily = "Arial, sans-serif") {
  const theme = THEMES[themeName] || THEMES.dark;
  const root = document.documentElement;
  root.dataset.theme = themeName;
  root.style.setProperty("--app-bg", theme.appBg);
  root.style.setProperty("--bg-secondary", theme.bgSecondary);
  root.style.setProperty("--bg-tertiary", theme.bgTertiary);
  root.style.setProperty("--border", theme.border);
  root.style.setProperty("--text", theme.text);
  root.style.setProperty("--text-muted", theme.textMuted);
  root.style.setProperty("--aff-color", theme.aff);
  root.style.setProperty("--neg-color", theme.neg);
  root.style.setProperty("--speech-aff-text", theme.speechAffText);
  root.style.setProperty("--speech-neg-text", theme.speechNegText);
  root.style.setProperty("--grid-bg", theme.gridBg);
  root.style.setProperty("--grid-header-bg", theme.gridHeaderBg);
  root.style.setProperty("--toolbar-bg", theme.toolbarBg);
  root.style.setProperty("--selection", theme.selection);
  root.style.setProperty("--dropped", theme.dropped);
  root.style.setProperty("--conceded", theme.conceded);
  root.style.setProperty("--grid-font", gridFontFamily);
}

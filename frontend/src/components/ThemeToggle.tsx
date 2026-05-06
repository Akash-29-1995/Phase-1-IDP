import { useTheme } from "../theme/ThemeContext";

export function ThemeToggle({ compact }: { compact?: boolean }) {
  const { theme, toggle } = useTheme();

  return (
    <button
      type="button"
      className={`theme-toggle ${compact ? "compact" : ""}`}
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      title={`Theme: ${theme}`}
    >
      <span className="theme-toggle__glyph" aria-hidden>
        {theme === "dark" ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 18a6 6 0 0 0 0-12 8 8 0 1 1-8 8 6 6 0 0 0 12 4Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
              stroke="currentColor"
              strokeWidth="1.8"
            />
          </svg>
        )}
      </span>
      {!compact ? <span className="theme-toggle__label">{theme === "dark" ? "Dark" : "Light"}</span> : null}
    </button>
  );
}

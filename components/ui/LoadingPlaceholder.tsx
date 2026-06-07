export default function LoadingPlaceholder({ text = "Loading…", isDark = false }: { text?: string; isDark?: boolean }) {
  return (
    <div role="status" aria-live="polite" aria-atomic="true" className={`flex items-center justify-center min-h-32 sm:min-h-48 text-sm ${isDark ? "text-white/60" : "text-slate-500"}`}>
      <span className="animate-pulse">{text}</span>
    </div>
  );
}

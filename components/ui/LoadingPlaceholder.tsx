export default function LoadingPlaceholder({ text = "Loading…", isDark = false }: { text?: string; isDark?: boolean }) {
  return (
    <div role="status" className={`flex items-center justify-center min-h-32 sm:min-h-48 text-sm ${isDark ? "text-white/40" : "text-slate-400 dark:text-white/40"}`}>
      {text}
    </div>
  );
}

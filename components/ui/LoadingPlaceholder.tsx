export default function LoadingPlaceholder({ text = "Loading…" }: { text?: string }) {
  return (
    <div role="status" className="flex items-center justify-center min-h-32 sm:min-h-48 text-slate-400 dark:text-white/40 text-sm">
      {text}
    </div>
  );
}

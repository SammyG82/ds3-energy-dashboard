export default function LoadingPlaceholder({ text = "Loading…" }: { text?: string }) {
  return (
    <div className="flex items-center justify-center h-48 text-slate-400 text-sm font-mono">
      {text}
    </div>
  );
}

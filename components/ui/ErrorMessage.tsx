export default function ErrorMessage({ message, isDark = false }: { message: string; isDark?: boolean }) {
  return (
    <p role="alert" className={`text-sm rounded-lg px-4 py-3 border ${isDark ? "text-red-300 bg-red-950/40 border-red-800" : "text-red-500 bg-red-50 border-red-200"}`}>
      {message}
    </p>
  );
}

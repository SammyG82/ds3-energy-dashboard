export default function ErrorMessage({ message }: { message: string }) {
  return (
    <p className="text-sm text-red-500 font-mono bg-red-50 border border-red-200 rounded-lg px-4 py-3">
      {message}
    </p>
  );
}

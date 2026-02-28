export function CodePreview({ code }: { code: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg bg-zinc-50 p-4 font-mono text-xs text-gray-800">
      <code>{code}</code>
    </pre>
  );
}

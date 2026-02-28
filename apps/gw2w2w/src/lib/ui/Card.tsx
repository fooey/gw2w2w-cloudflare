export function Card({ title, children }: { title?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg bg-white shadow-sm">
      <div className="flex flex-col gap-4 px-4 py-5 sm:p-6">
        {title && (
          <div className="border-b border-gray-200 pb-5">
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

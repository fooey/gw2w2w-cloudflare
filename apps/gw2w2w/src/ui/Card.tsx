import { isPresent } from '@repo/utils';

export function Card({
  title,
  rightContent,
  children,
}: {
  title?: React.ReactNode;
  rightContent?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg bg-white shadow-sm">
      <div className="flex flex-col gap-4 px-4 py-5 sm:p-6">
        {isPresent(title) || isPresent(rightContent) ? (
          <div className="flex items-center justify-between border-b border-gray-200 pb-5">
            {isPresent(title) ? <h3 className="text-base font-semibold text-gray-900">{title}</h3> : null}
            {rightContent}
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}

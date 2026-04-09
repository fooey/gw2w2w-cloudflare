import { TIME_WINDOWS, type TimeWindow } from '#lib/store/logFilters';
import clsx from 'clsx';

export function FilterGroup<T extends string>({
  label,
  options,
  active,
  onToggle,
  getLabel,
}: {
  label: string;
  options: readonly T[];
  active: string[];
  onToggle: (v: T) => void;
  getLabel?: (v: T) => string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-xs text-gray-400">{label}</span>
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => {
              onToggle(opt);
            }}
            className={clsx('rounded px-2 py-0.5 text-xs transition-colors', {
              'bg-gray-200 text-gray-400 line-through': !active.includes(opt),
              'bg-gray-700 text-white': active.includes(opt),
            })}
          >
            {getLabel ? getLabel(opt) : opt}
          </button>
        ))}
      </div>
    </div>
  );
}

export function TimeWindowFilter({ value, onChange }: { value: TimeWindow; onChange: (v: TimeWindow) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-xs text-gray-400">Period</span>
      <div className="flex flex-wrap gap-1">
        {TIME_WINDOWS.map((opt) => (
          <button
            key={opt}
            onClick={() => {
              onChange(opt);
            }}
            className={clsx('rounded px-2 py-0.5 text-xs transition-colors', {
              'bg-gray-100 text-gray-500': value !== opt,
              'bg-gray-700 text-white': value === opt,
            })}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

'use client';

interface LocalTimestampProps {
  value: string;
}

export function LocalTimestamp({ value }: LocalTimestampProps) {
  const formatted =
    typeof Temporal !== 'undefined'
      ? Temporal.Instant.from(value).toString({ timeZone: Temporal.Now.timeZoneId() })
      : value;
  return <span suppressHydrationWarning>{formatted}</span>;
}

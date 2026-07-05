'use client';

interface LocalTimestampProps {
  value: string;
}

export function LocalTimestamp({ value }: LocalTimestampProps) {
  const formatted =
    typeof Temporal === 'undefined'
      ? value
      : Temporal.Instant.from(value).toString({ timeZone: Temporal.Now.timeZoneId() });
  return <span suppressHydrationWarning>{formatted}</span>;
}

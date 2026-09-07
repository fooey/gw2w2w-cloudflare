import { useNavigation } from 'react-router';

/**
 * Global route-transition indicator, mounted once in root so every navigation is covered.
 *
 * The 200ms "don't flash on fast navigations" delay is a CSS animation-delay rather than a timer in
 * state — most navigations resolve well under that, and deriving visibility from render avoids the
 * cascading re-renders a setState-in-effect would cause.
 */
export function NavigationProgress() {
  const navigation = useNavigation();

  if (navigation.state === 'idle') return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading page"
      className="fixed inset-x-0 top-0 z-50 h-0.5 animate-[nav-progress-fade_150ms_ease-out_200ms_both] overflow-hidden bg-indigo-100"
    >
      <div className="h-full w-1/3 animate-[nav-progress_1s_ease-in-out_infinite] bg-indigo-600" />
    </div>
  );
}

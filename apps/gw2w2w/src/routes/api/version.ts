export function loader() {
  return Response.json({ buildId: import.meta.env.VITE_BUILD_HASH });
}

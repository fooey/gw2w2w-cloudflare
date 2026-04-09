import SiteLayout from '#ui/layout/SiteLayout';
import Link from 'next/link';

export default function NotFound() {
  return (
    <SiteLayout pageHeader={'Not Found'}>
      <div>
        <h2>Not Found</h2>
        <p>Could not find requested resource</p>
        <br />
        <Link href="/">Return Home</Link>
      </div>
    </SiteLayout>
  );
}

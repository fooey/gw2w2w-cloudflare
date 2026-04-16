import { Features } from '#ui/home/Features';
import { Hero } from '#ui/home/Hero';
import SiteLayout from '#ui/layout/SiteLayout';

export default function Home() {
  return (
    <SiteLayout>
      <div className="mx-auto max-w-2xl lg:max-w-none">
        <Hero />
        <Features />
      </div>
    </SiteLayout>
  );
}

import { db } from '@/lib/db';
import Link from 'next/link';
import Image from 'next/image';

export const revalidate = 0;
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

type ProfileMeta = {
  slug: string;
  first_name: string;
  last_name: string;
  job_title: string;
  photo_url: string | null;
};

export default async function PeopleListingPage() {
  const result = await db.query(`
    SELECT slug, first_name, last_name, job_title, photo_url
    FROM profiles
    WHERE status = 'approved'
    ORDER BY last_name
  `);

  const profiles = result.rows as ProfileMeta[];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <nav className="max-w-[1400px] mx-auto px-8 py-6 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <svg className="h-8" viewBox="0 0 1860 612" xmlns="http://www.w3.org/2000/svg">
              <path d="m1404.7,133.12l63.12,345.76h-100.16l-25.07-198.92-54.78,198.92h-89.89l-54.78-198.92-25.07,198.92h-100.15l63.12-345.76h105.96l55.88,203.16,55.88-203.16h105.96Zm-476.91,0l-81.54,233.33-81.54-233.33h-103.74l130.59,345.76h109.39l130.59-345.76h-103.74Zm685.34,257.25V133.12h-95.82v345.76h237.67l33.43-88.52h-175.27Zm-1051.13,123.31v48.33h-48.33l-207.67-207.67-207.67,207.67h-48.33v-48.33s207.67-207.67,207.67-207.67L50,98.33v-48.33s48.33,0,48.33,0l207.67,207.67,207.67-207.67h48.33v48.33l-207.67,207.67s207.67,207.67,207.67,207.67ZM356.77,50l-50.77,50.77-50.77-50.77h-87.33l138.09,138.09L444.09,50h-87.33Zm87.33,512l-138.09-138.09-138.09,138.09h87.33l50.77-50.77,50.77,50.77h87.33Zm117.91-205.23l-50.77-50.77,50.77-50.77v-87.33l-138.09,138.09,138.09,138.09v-87.33ZM50,444.09l138.09-138.09L50,167.91v87.33l50.77,50.77-50.77,50.77v87.33Z" fill="#1a1a1a"/>
            </svg>
          </Link>
          <ul className="hidden md:flex gap-10 list-none">
            <li><Link href="/" className="text-[#4a4a4a] no-underline font-medium text-[0.95rem] hover:text-black transition-colors">Home</Link></li>
            <li><Link href="/people" className="text-[#4a4a4a] no-underline font-medium text-[0.95rem] hover:text-black transition-colors">People</Link></li>
            <li><Link href="/files" className="text-[#4a4a4a] no-underline font-medium text-[0.95rem] hover:text-black transition-colors">Resources</Link></li>
            <li><Link href="/admin" className="text-[#4a4a4a] no-underline font-medium text-[0.95rem] hover:text-black transition-colors">Admin</Link></li>
          </ul>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative h-[300px] vml-gradient-header flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 opacity-50" style={{
          backgroundImage: `url('data:image/svg+xml,<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse"><path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1"/></pattern></defs><rect width="100%" height="100%" fill="url(%23grid)"/></svg>')`
        }}></div>
        <div className="relative text-center text-white max-w-[800px] px-8">
          <h1 className="text-5xl font-extrabold mb-4 tracking-tight">People Directory</h1>
          <p className="text-xl font-light opacity-95">Connect with colleagues across the organization</p>
        </div>
      </section>

      {/* Main */}
      <main className="max-w-[1400px] mx-auto px-8 py-12">
        {profiles.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-xl">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-xl font-semibold text-[#1a1a1a] mb-2">
              No profiles available yet
            </h3>
            <p className="text-[#666] mb-6">
              Get started by adding profiles in the admin panel
            </p>
            <Link
              href="/admin"
              className="btn btn-primary"
              style={{ background: '#667eea', color: 'white' }}
            >
              Go to Admin Panel
            </Link>
          </div>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {profiles.map((p) => {
              const fullName = `${p.first_name} ${p.last_name}`.trim();
              return (
                <Link
                  key={p.slug}
                  href={`/people/${p.slug}`}
                  className="news-card group"
                >
                  <div className="p-6 flex gap-4 items-center">
                    <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                      {p.photo_url ? (
                        <Image
                          src={p.photo_url}
                          alt={fullName}
                          width={64}
                          height={64}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-xl font-semibold">
                          {p.first_name.charAt(0)}
                          {p.last_name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-base font-semibold text-[#1a1a1a] group-hover:text-[#667eea] transition-colors">
                        {fullName}
                      </div>
                      <div className="text-sm text-[#666]">{p.job_title}</div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#1a1a1a] text-white pt-16 pb-8 px-8 mt-16">
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-3 list-none">
              <li><Link href="/" className="text-[#ccc] hover:text-white transition-colors">Home</Link></li>
              <li><Link href="/people" className="text-[#ccc] hover:text-white transition-colors">People Directory</Link></li>
              <li><Link href="/files" className="text-[#ccc] hover:text-white transition-colors">Resources</Link></li>
              <li><Link href="/admin" className="text-[#ccc] hover:text-white transition-colors">Admin</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-semibold mb-4">Resources</h4>
            <ul className="space-y-3 list-none">
              <li><span className="text-[#ccc]">Brand Guidelines</span></li>
              <li><span className="text-[#ccc]">Templates</span></li>
              <li><span className="text-[#ccc]">Learning Hub</span></li>
              <li><span className="text-[#ccc]">IT Support</span></li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-semibold mb-4">Company</h4>
            <ul className="space-y-3 list-none">
              <li><span className="text-[#ccc]">About VML</span></li>
              <li><span className="text-[#ccc]">Leadership</span></li>
              <li><span className="text-[#ccc]">Careers</span></li>
              <li><span className="text-[#ccc]">Contact</span></li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-semibold mb-4">Connect</h4>
            <ul className="space-y-3 list-none">
              <li><span className="text-[#ccc]">Email</span></li>
              <li><span className="text-[#ccc]">Slack</span></li>
              <li><span className="text-[#ccc]">Help Center</span></li>
            </ul>
          </div>
        </div>
        <div className="max-w-[1400px] mx-auto pt-8 border-t border-[#333] text-center text-[#999]">
          <p>© {new Date().getFullYear()} VML. All rights reserved. Building extraordinary experiences together.</p>
        </div>
      </footer>
    </div>
  );
}

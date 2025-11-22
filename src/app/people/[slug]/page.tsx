import { supa } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import SidebarNav from '@/components/SidebarNav';

export const revalidate = 0;
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

interface ProfileRow {
  slug: string;
  first_name: string;
  last_name: string;
  job_title: string;
  description_html: string;
  clients: string[] | null;
  photo_url: string | null;
  email: string;
  experience?: string | null;
  status?: string;
}

export default async function ProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!slug) notFound();

  // Get the profile
    const { data, error } = await supa
      .from('profiles')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'approved')
      .single();

  if (error || !data) notFound();
  const profile = data as ProfileRow;

  // Load all approved policy pages for right-hand navigation (reuse existing navigation)
  const { data: allPages } = await supa
    .from('policies')
    .select('slug, title, parent_slug, section_key')
    .eq('status', 'approved')
    .order('title');

  const { data: sections } = await supa
    .from('sections')
    .select('key, name, icon, sort_order')
    .order('sort_order');

  const fullName = `${profile.first_name} ${profile.last_name}`.trim();

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

      {/* Main layout with sidebar */}
      <div className="max-w-[1400px] mx-auto">
        <div className="flex">
          {/* Main content */}
          <main className="flex-1 px-8 py-12 max-w-4xl">
            {/* Breadcrumb */}
            <nav className="mb-8">
              <ol className="flex items-center flex-wrap gap-2 text-sm text-[#999]">
                <li>
                  <Link href="/" className="hover:text-[#667eea] transition-colors">Home</Link>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#ccc]">/</span>
                  <Link href="/people" className="hover:text-[#667eea] transition-colors">People</Link>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#ccc]">/</span>
                  <span className="text-[#1a1a1a] font-medium">{fullName}</span>
                </li>
              </ol>
            </nav>

            {/* Profile Header */}
            <section className="flex flex-col sm:flex-row sm:items-center gap-6 border-b border-gray-200 pb-8">
              <div className="w-28 h-28 rounded-full overflow-hidden flex-shrink-0" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                {profile.photo_url ? (
                  <Image
                    src={profile.photo_url}
                    alt={fullName}
                    width={112}
                    height={112}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-2xl font-semibold">
                    {profile.first_name.charAt(0)}
                    {profile.last_name.charAt(0)}
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-[#1a1a1a]">{fullName}</h1>
                <p className="text-[#666]">{profile.job_title}</p>
                <div className="mt-2 text-sm">
                  <a href={`mailto:${profile.email}`} className="text-[#667eea] hover:text-[#764ba2] hover:underline transition-colors">
                    {profile.email}
                  </a>
                </div>
                {profile.clients && profile.clients.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-[#999] mb-2 uppercase tracking-wider">Main Clients serviced</p>
                    <div className="flex flex-wrap gap-2">
                      {profile.clients.map((c) => (
                        <span key={c} className="text-xs px-3 py-1.5 rounded-full bg-gray-100 text-[#4a4a4a] font-medium">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Profile Description */}
            <article className="prose prose-lg max-w-none mt-8">
              <div
                className="prose-headings:text-[#1a1a1a] prose-headings:font-semibold prose-p:text-[#4a4a4a] prose-a:text-[#667eea] hover:prose-a:text-[#764ba2] prose-table:border-collapse prose-table:border prose-table:border-gray-300 prose-th:border prose-th:border-gray-300 prose-th:bg-gray-100 prose-th:p-3 prose-th:text-left prose-td:border prose-td:border-gray-300 prose-td:p-3"
                dangerouslySetInnerHTML={{ __html: profile.description_html }}
              />
            </article>

            {/* Work Experience */}
            {profile.experience && profile.experience.trim() !== '' && (
              <section className="mt-10">
                <h2 className="text-2xl font-semibold text-[#1a1a1a] mb-3">Work Experience</h2>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <ul className="space-y-2 text-[#4a4a4a]">
                    {profile.experience.split(';').map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="mt-1 text-[#667eea]">•</span>
                        <span>{item.trim()}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}
          </main>

          {/* Right sidebar: navigation */}
          <aside className="hidden lg:block w-80 border-l border-gray-200 bg-gray-50 sticky top-[89px] h-[calc(100vh-89px)] overflow-y-auto">
            <div className="p-6 space-y-6">
              <SidebarNav items={allPages || []} sections={sections || []} />
            </div>
          </aside>
        </div>
      </div>

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

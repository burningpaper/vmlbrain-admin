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
    .select('slug, title, parent_slug')
    .eq('status', 'approved')
    .order('title');

  const fullName = `${profile.first_name} ${profile.last_name}`.trim();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-gray-900 text-white sticky top-0 z-20 shadow-lg">
        <div className="max-w-screen-2xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
              <Image src="/vml%20logo.jpg" alt="VML" width={24} height={24} className="rounded-sm" />
              <span className="text-xl font-semibold">Knowledge Base</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/people" className="text-sm text-gray-300 hover:text-white transition-colors">
                People
              </Link>
              <Link href="/admin" className="text-sm text-gray-300 hover:text-white transition-colors">
                Admin
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main layout with sidebar */}
      <div className="max-w-screen-2xl mx-auto">
        <div className="flex">
          {/* Main content */}
          <main className="flex-1 px-6 py-8 lg:px-12 lg:py-12 max-w-4xl">
            {/* Profile Header */}
            <section className="flex flex-col sm:flex-row sm:items-center gap-6 border-b pb-6">
              <div className="w-28 h-28 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                {profile.photo_url ? (
                  <img
                    src={profile.photo_url}
                    alt={fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl font-semibold">
                    {profile.first_name.charAt(0)}
                    {profile.last_name.charAt(0)}
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{fullName}</h1>
                <p className="text-gray-600">{profile.job_title}</p>
                <div className="mt-2 text-sm text-gray-700">
                  <a href={`mailto:${profile.email}`} className="text-blue-600 hover:underline">
                    {profile.email}
                  </a>
                </div>
                {profile.clients && profile.clients.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-gray-600 mb-1">Main Clients serviced</p>
                    <div className="flex flex-wrap gap-2">
                      {profile.clients.map((c) => (
                        <span key={c} className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 border">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Profile Description */}
            <article className="prose prose-lg max-w-none mt-6">
              <div
                className="prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-blue-600 hover:prose-a:text-blue-800 prose-table:border-collapse prose-table:border prose-table:border-gray-300 prose-th:border prose-th:border-gray-300 prose-th:bg-gray-100 prose-th:p-3 prose-th:text-left prose-td:border prose-td:border-gray-300 prose-td:p-3"
                dangerouslySetInnerHTML={{ __html: profile.description_html }}
              />
            </article>
          </main>

          {/* Right sidebar: navigation */}
          <aside className="hidden lg:block w-80 border-l border-gray-200 bg-gray-50 sticky top-16 h-screen overflow-y-auto">
            <div className="p-6 space-y-6">
              <SidebarNav items={allPages || []} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

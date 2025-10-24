import { supa } from '@/lib/supabase';
import Link from 'next/link';
import Image from 'next/image';

export const revalidate = 0;
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default async function HomePage() {
  // Get all top-level pages (no parent)
  const { data: topLevelPages } = await supa
    .from('policies')
    .select('slug, title, summary')
    .or('parent_slug.is.null,parent_slug.eq.')
    .eq('status', 'approved')
    .order('title');

  // Get all pages for categories
  const { data: allPages } = await supa
    .from('policies')
    .select('slug, title, summary, parent_slug')
    .eq('status', 'approved')
    .order('title');

  // Normalize types for strict linting
  const top =
    (topLevelPages as { slug: string; title: string; summary: string | null }[] | null) || [];
  const all =
    (allPages as {
      slug: string;
      title: string;
      summary: string | null;
      parent_slug: string | null;
    }[] | null) || [];

  const { data: peopleData } = await supa
    .from('profiles')
    .select('slug, first_name, last_name, job_title, photo_url')
    .eq('status', 'approved')
    .order('last_name')
    .limit(6);

  const people =
    (peopleData as {
      slug: string;
      first_name: string;
      last_name: string;
      job_title: string;
      photo_url: string | null;
    }[] | null) || [];

  // Group pages by top-level parent
  const pageGroups = new Map<
    string,
    { slug: string; title: string; summary: string | null; parent_slug: string | null }[]
  >();

  top.forEach((page) => {
    const children = all.filter((p) => p.parent_slug === page.slug) || [];
    pageGroups.set(page.slug, children);
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-gray-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3">
              <Image src="/vml%20logo.jpg" alt="VML" width={24} height={24} className="rounded-sm" />
              <div>
                <h1 className="text-xl font-semibold">Knowledge Base</h1>
                <p className="text-sm text-gray-300">Your company policies, guides, and documentation</p>
              </div>
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/people"
                className="text-sm text-gray-300 hover:text-white transition-colors"
              >
                People
              </Link>
              <Link
                href="/admin"
                className="text-sm text-gray-300 hover:text-white transition-colors"
              >
                Admin
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Content Categories */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {top.map((page) => {
            const children = pageGroups.get(page.slug) || [];
            return (
              <div
                key={page.slug}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
              >
                <div className="p-6">
                  <Link href={`/p/${page.slug}`}>
                    <h2 className="text-xl font-semibold text-gray-900 hover:text-blue-600 mb-2">
                      {page.title}
                    </h2>
                  </Link>
                  {page.summary && (
                    <p className="text-gray-600 text-sm mb-4">
                      {page.summary}
                    </p>
                  )}
                  
                  {children.length > 0 && (
                    <div className="border-t pt-4 mt-4">
                      <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                        Sub-pages
                      </p>
                      <ul className="space-y-1">
                        {children.slice(0, 5).map((child) => (
                          <li key={child.slug}>
                            <Link
                              href={`/p/${page.slug}/${child.slug}`}
                              className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              → {child.title}
                            </Link>
                          </li>
                        ))}
                        {children.length > 5 && (
                          <li className="text-sm text-gray-500">
                            + {children.length - 5} more
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                  
                  <Link
                    href={`/p/${page.slug}`}
                    className="inline-block mt-4 text-sm font-medium text-blue-600 hover:text-blue-800"
                  >
                    View →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* People */}
        {people.length > 0 && (
          <div className="mt-12">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">People</h2>
              <Link href="/people" className="text-sm text-blue-600 hover:text-blue-800">
                View all →
              </Link>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {people.map((p) => {
                const fullName = `${p.first_name} ${p.last_name}`.trim();
                return (
                  <Link
                    key={p.slug}
                    href={`/people/${p.slug}`}
                    className="group rounded-lg border bg-white hover:shadow-md transition overflow-hidden"
                  >
                    <div className="p-5 flex gap-4 items-center">
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                        {p.photo_url ? (
                          <Image src={p.photo_url} alt={fullName} width={64} height={64} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xl font-semibold">
                            {p.first_name.charAt(0)}
                            {p.last_name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-base font-semibold text-gray-900 group-hover:text-blue-700">
                          {fullName}
                        </div>
                        <div className="text-sm text-gray-600">{p.job_title}</div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {top.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No content available yet.</p>
            <Link
              href="/admin"
              className="mt-4 inline-block text-blue-600 hover:text-blue-800"
            >
              Go to Admin to create content
            </Link>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            Need help? Contact your HR department
          </p>
        </div>
      </footer>
    </div>
  );
}

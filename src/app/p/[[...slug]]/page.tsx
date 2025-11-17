import { supa } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import SidebarNav from '@/components/SidebarNav';
import BoxExplorer from '@/components/BoxExplorer';
import { renderEmbeds } from '@/lib/renderEmbeds';

export const revalidate = 0;
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

interface PolicyRow {
  slug: string;
  title: string;
  summary: string | null;
  body_md: string;
  parent_slug: string | null;
  status?: string;
  box_folder_id?: string | null;
  box_file_ids?: string[] | null;
}

export default async function PolicyPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  // Get the last segment as the actual slug
  const { slug } = await params;
  const slugSegments = slug || [];
  const actualSlug = slugSegments[slugSegments.length - 1] || '';

  if (!actualSlug) {
    notFound();
  }

  const { data, error } = await supa
    .from('policies')
    .select('*')
    .eq('slug', actualSlug)
    .eq('status', 'approved')
    .single();

  if (error || !data) {
    notFound();
  }
  const policy = data as PolicyRow;

  // Build breadcrumb trail
  interface PolicyNav { slug: string; title: string; parent_slug: string | null; }
  const breadcrumb: PolicyNav[] = [];
  let tempSlug: string | null = actualSlug;

  while (tempSlug) {
    const { data } = await supa
      .from('policies')
      .select('slug,title,parent_slug')
      .eq('slug', tempSlug)
      .single();
    const policyNode = data as PolicyNav | null;

    if (policyNode) {
      breadcrumb.unshift(policyNode);
      tempSlug = policyNode.parent_slug;
    } else {
      tempSlug = null;
    }
  }

  // Build URL path from breadcrumb
  const buildPath = (items: PolicyNav[], endIndex: number): string => {
    return '/p/' + items.slice(0, endIndex + 1).map(item => item.slug).join('/');
  };

  // Get all pages for navigation
  const { data: allPages } = await supa
    .from('policies')
    .select('slug, title, parent_slug')
    .eq('status', 'approved')
    .order('title');

  return (
    <div className="min-h-screen bg-white">
      {/* Header with VML Gradient */}
      <header className="vml-gradient-header text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3 hover:opacity-90 transition-smooth">
              <Image
                src="/WHITE%20Icon%20Snowflake.png"
                alt="VML"
                width={40}
                height={40}
                className="object-contain"
              />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">Knowledge Base</h1>
                <p className="text-xs sm:text-sm text-white text-opacity-90 hidden sm:block">
                  Your company intranet & documentation
                </p>
              </div>
            </Link>
            <nav className="flex items-center gap-4">
              <Link
                href="/people"
                className="text-sm font-medium hover:bg-white hover:bg-opacity-20 px-3 py-2 rounded-md transition-smooth"
              >
                People
              </Link>
              <Link
                href="/admin"
                className="text-sm font-medium hover:bg-white hover:bg-opacity-20 px-3 py-2 rounded-md transition-smooth"
              >
                Admin
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main layout with sidebar */}
      <div className="max-w-screen-2xl mx-auto">
        <div className="flex">
          {/* Main content */}
          <main className="flex-1 px-4 sm:px-6 lg:px-12 py-8 lg:py-12 max-w-4xl">
            {/* Breadcrumb */}
            <nav className="mb-6">
              <ol className="flex items-center flex-wrap gap-2 text-sm text-gray-500">
                <li>
                  <Link href="/" className="hover:text-vml-blue transition-smooth flex items-center gap-1">
                    <span>Home</span>
                  </Link>
                </li>
                {breadcrumb.map((item, index) => (
                  <li key={item.slug} className="flex items-center gap-2">
                    <span className="text-gray-400">/</span>
                    {index < breadcrumb.length - 1 ? (
                      <Link 
                        href={buildPath(breadcrumb, index)}
                        className="hover:text-vml-blue transition-smooth"
                      >
                        {item.title}
                      </Link>
                    ) : (
                      <span className="text-gray-900 font-medium">{item.title}</span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>

            {/* Article content */}
            <article className="prose prose-lg max-w-none">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">{policy.title}</h1>
              {policy.summary && (
                <p className="text-xl text-gray-600 mb-8">{policy.summary}</p>
              )}
              <div
                className="prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-vml-blue hover:prose-a:text-vml-pink prose-table:border-collapse prose-table:border prose-table:border-gray-300 prose-th:border prose-th:border-gray-300 prose-th:bg-gray-100 prose-th:p-3 prose-th:text-left prose-td:border prose-td:border-gray-300 prose-td:p-3"
                dangerouslySetInnerHTML={{ __html: renderEmbeds(policy.body_md) }}
              />
            </article>
          </main>

          {/* Right sidebar: navigation + related files */}
          <aside className="hidden lg:block w-80 border-l border-gray-200 bg-gray-50 sticky top-[89px] h-[calc(100vh-89px)] overflow-y-auto">
            <div className="p-6 space-y-6">
              <SidebarNav items={allPages || []} />
              {/* Related files from Box (read/preview) */}
              {(policy.box_folder_id != null || policy.box_file_ids != null) && (
                <BoxExplorer
                  folderId={policy.box_folder_id ?? ''}
                  fileIds={policy.box_file_ids ?? []}
                />
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-gray-50 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-600">
              © {new Date().getFullYear()} VML. All rights reserved.
            </p>
            <p className="text-sm text-gray-600">
              Need help? Contact the People Team
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

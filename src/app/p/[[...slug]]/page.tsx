import { supa } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import SidebarNav from '@/components/SidebarNav';
import BoxExplorer from '@/components/BoxExplorer';

export default async function PolicyPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  // Get the last segment as the actual slug
  const { slug } = await params;
  const slugSegments = slug || [];
  const actualSlug = slugSegments[slugSegments.length - 1] || '';

  if (!actualSlug) {
    notFound();
  }

  const { data: policy, error } = await supa
    .from('policies')
    .select('*')
    .eq('slug', actualSlug)
    .eq('status', 'approved')
    .single();

  if (error || !policy) {
    notFound();
  }

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
      {/* Header */}
      <header className="bg-gray-900 text-white sticky top-0 z-20 shadow-lg">
        <div className="max-w-screen-2xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
              <Image src="/vml%20logo.jpg" alt="VML" width={24} height={24} className="rounded-sm" />
              <span className="text-xl font-semibold">Knowledge Base</span>
            </Link>
            <Link href="/admin" className="text-sm text-gray-300 hover:text-white transition-colors">
              Admin
            </Link>
          </div>
        </div>
      </header>

      {/* Main layout with sidebar */}
      <div className="max-w-screen-2xl mx-auto">
        <div className="flex">
          {/* Main content */}
          <main className="flex-1 px-6 py-8 lg:px-12 lg:py-12 max-w-4xl">
            {/* Breadcrumb */}
            <nav className="mb-6">
              <ol className="flex items-center space-x-2 text-sm text-gray-500">
                <li>
                  <Link href="/" className="hover:text-blue-600 transition-colors">
                    Home
                  </Link>
                </li>
                {breadcrumb.map((item, index) => (
                  <li key={item.slug} className="flex items-center">
                    <span className="mx-2 text-gray-400">/</span>
                    {index < breadcrumb.length - 1 ? (
                      <Link 
                        href={buildPath(breadcrumb, index)}
                        className="hover:text-blue-600 transition-colors"
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
                className="prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-blue-600 hover:prose-a:text-blue-800 prose-table:border-collapse prose-table:border prose-table:border-gray-300 prose-th:border prose-th:border-gray-300 prose-th:bg-gray-100 prose-th:p-3 prose-th:text-left prose-td:border prose-td:border-gray-300 prose-td:p-3"
                dangerouslySetInnerHTML={{ __html: policy.body_md }}
              />
            </article>
          </main>

          {/* Right sidebar: navigation + related files */}
          <aside className="hidden lg:block w-80 border-l border-gray-200 bg-gray-50 sticky top-16 h-screen overflow-y-auto">
            <div className="p-6 space-y-6">
              <SidebarNav items={allPages || []} />
              {/* Related files from Box (read/preview) */}
              {('box_folder_id' in policy || 'box_file_ids' in policy) && (
                <BoxExplorer
                  folderId={(policy as any).box_folder_id || '0'}
                  fileIds={(policy as any).box_file_ids || []}
                />
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

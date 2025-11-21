import { supa } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import Link from 'next/link';
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

  // Get all pages for navigation (include section_key for grouping in SidebarNav)
  const { data: allPages } = await supa
    .from('policies')
    .select('slug, title, parent_slug, section_key')
    .eq('status', 'approved')
    .order('title');

  // Get sections used for grouping
  const { data: sections } = await supa
    .from('sections')
    .select('key, name, icon, sort_order')
    .order('sort_order');

  // Get direct children of this page (approved only)
  const { data: children } = await supa
    .from('policies')
    .select('slug, title')
    .eq('parent_slug', actualSlug)
    .eq('status', 'approved')
    .order('title');

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

      {/* Content hero strip */}
      <section className="relative vml-gradient-header h-[240px] flex items-center overflow-hidden">
        <div className="absolute inset-0 opacity-35" style={{
          backgroundImage: `url('data:image/svg+xml,<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse"><path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/></pattern></defs><rect width="100%" height="100%" fill="url(%23grid)"/></svg>')`
        }}></div>
        <div className="relative max-w-[1200px] mx-auto w-full px-8 text-white">
          <p className="text-sm uppercase tracking-[0.15em] font-semibold opacity-90 mb-2">Knowledge Base</p>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">{policy.title}</h1>
          {policy.summary && (
            <p className="text-lg md:text-xl font-light max-w-3xl opacity-90 leading-relaxed">
              {policy.summary}
            </p>
          )}
        </div>
      </section>

      {/* Main layout with sidebar */}
      <div className="max-w-[1400px] mx-auto">
        <div className="flex">
          {/* Main content */}
          <main className="flex-1 px-8 py-12 max-w-4xl">
            {/* Breadcrumb */}
            <nav className="mb-8">
              <ol className="flex items-center flex-wrap gap-2 text-sm text-[#999]">
                <li>
                  <Link href="/" className="hover:text-[#667eea] transition-colors flex items-center gap-1">
                    <span>Home</span>
                  </Link>
                </li>
                {breadcrumb.map((item, index) => (
                  <li key={item.slug} className="flex items-center gap-2">
                    <span className="text-[#ccc]">/</span>
                    {index < breadcrumb.length - 1 ? (
                      <Link
                        href={buildPath(breadcrumb, index)}
                        className="hover:text-[#667eea] transition-colors"
                      >
                        {item.title}
                      </Link>
                    ) : (
                      <span className="text-[#1a1a1a] font-medium">{item.title}</span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>

            {/* Article content */}
            <article className="prose prose-lg max-w-none">
              <h1 className="text-4xl font-bold text-[#1a1a1a] mb-4 tracking-tight">{policy.title}</h1>
              {policy.summary && (
                <p className="text-xl text-[#666] mb-8 leading-relaxed">{policy.summary}</p>
              )}
              <div
                className="prose-headings:text-[#1a1a1a] prose-headings:font-semibold prose-p:text-[#4a4a4a] prose-a:text-[#667eea] hover:prose-a:text-[#764ba2] prose-table:border-collapse prose-table:border prose-table:border-gray-300 prose-th:border prose-th:border-gray-300 prose-th:bg-gray-100 prose-th:p-3 prose-th:text-left prose-td:border prose-td:border-gray-300 prose-td:p-3"
                dangerouslySetInnerHTML={{ __html: renderEmbeds(policy.body_md) }}
              />

              {/* Auto Table of Contents for sections (only if this page has sub-pages) */}
              {Array.isArray(children) && children.length > 0 && (
                <section className="mt-12">
                  <h2 className="text-2xl font-semibold text-[#1a1a1a] mb-4">In this section</h2>
                  <ul className="divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white overflow-hidden">
                    {children.map((c) => {
                      const path = '/p/' + [...breadcrumb.map(b => b.slug), c.slug].join('/');
                      return (
                        <li key={c.slug} className="p-4 hover:bg-gray-50 transition-colors">
                          <Link href={path} className="text-[#667eea] hover:text-[#764ba2] font-medium flex items-center gap-2">
                            <span>→</span>
                            <span>{c.title}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}
            </article>
          </main>

          {/* Right sidebar: navigation + related files */}
          <aside className="hidden lg:block w-80 border-l border-gray-200 bg-gray-50 sticky top-[89px] h-[calc(100vh-89px)] overflow-y-auto">
            <div className="p-6 space-y-6">
              <SidebarNav items={allPages || []} sections={sections || []} />
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

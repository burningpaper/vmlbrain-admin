import { db } from '@/lib/db';
import Link from 'next/link';
import Image from 'next/image';
import FeatureCard from '@/components/FeatureCard';
import FlyingBird from '@/components/FlyingBird';
import { Page, SectionRow, Person, Category } from '@/types';

async function fetchLatest(orderBy: 'created_at' | 'updated_at'): Promise<Page[]> {
  try {
    const result = await db.query(`
      SELECT slug, title, summary, parent_slug, section_key, created_at, updated_at
      FROM policies
      WHERE (status = 'approved' OR status = 'Approved' OR status IS NULL OR status = '')
        AND ${orderBy} IS NOT NULL
      ORDER BY ${orderBy} DESC
      LIMIT 10
    `);
    return result.rows as Page[];
  } catch (error) {
    console.error(`Error fetching latest by ${orderBy}:`, error);
    return [];
  }
}

export default async function HomePage() {
  // Parallel data fetching
  const [topLevelPages, allPages, sections, people, latestAdded, latestUpdated] = await Promise.all([
    // Get all top-level pages
    db.query(`
      SELECT slug, title, summary, parent_slug, section_key, created_at, updated_at
      FROM policies
      WHERE parent_slug IS NULL OR parent_slug = ''
      ORDER BY title
    `).then(result => result.rows as Page[]).catch(() => [] as Page[]),

    // Get all pages for children lookup
    db.query(`
      SELECT slug, title, summary, parent_slug, section_key, created_at, updated_at
      FROM policies
      ORDER BY title
    `).then(result => result.rows as Page[]).catch(() => [] as Page[]),

    // Get sections
    db.query(`
      SELECT key, name, icon, image_name, sort_order
      FROM sections
      ORDER BY sort_order
    `).then(result => result.rows as SectionRow[]).catch(() => [] as SectionRow[]),

    // Get people
    db.query(`
      SELECT slug, first_name, last_name, job_title, photo_url
      FROM profiles
      ORDER BY last_name
      LIMIT 6
    `).then(result => result.rows as Person[]).catch(() => [] as Person[]),

    // Latest added
    fetchLatest('created_at'),

    // Latest updated
    fetchLatest('updated_at'),
  ]);

  // Helper functions
  const pageMap = new Map<string, Page>();
  allPages.forEach((p: Page) => pageMap.set(p.slug, p));

  const buildPathFromSlug = (slug: string): string | null => {
    const pathParts: string[] = [];
    let current: Page | undefined = pageMap.get(slug);
    while (current) {
      pathParts.unshift(current.slug);
      if (!current.parent_slug) break;
      current = pageMap.get(current.parent_slug);
    }
    if (pathParts.length === 0) return null;
    return `/p/${pathParts.join('/')}`;
  };

  const getSectionPages = (sectionKey: string) => {
    return allPages.filter((p: Page) => (p.section_key || '') === sectionKey);
  };

  const totalArticlesInSection = (sectionKey: string): number => {
    return getSectionPages(sectionKey).length;
  };

  const getSectionLandingPath = (sectionKey: string): string | null => {
    const topLevel = topLevelPages.find((p: Page) => p.section_key === sectionKey);
    if (topLevel) return `/p/${topLevel.slug}`;
    const anyPage = allPages.find((p: Page) => p.section_key === sectionKey);
    if (anyPage) return buildPathFromSlug(anyPage.slug);
    return null;
  };

  const categories: Category[] = sections.map((sec) => ({
    key: sec.key,
    name: sec.name,
    icon: (sec.icon || 'book') as string,
    imageName: sec.image_name || null,
    pages: topLevelPages.filter((p: Page) => p.section_key === sec.key),
  }));

  return (
    <div className="min-h-screen bg-white">
      <FlyingBird />
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <nav className="max-w-[1400px] mx-auto px-8 py-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <svg className="h-8" viewBox="0 0 1860 612" xmlns="http://www.w3.org/2000/svg">
              <path d="m1404.7,133.12l63.12,345.76h-100.16l-25.07-198.92-54.78,198.92h-89.89l-54.78-198.92-25.07,198.92h-100.15l63.12-345.76h105.96l55.88,203.16,55.88-203.16h105.96Zm-476.91,0l-81.54,233.33-81.54-233.33h-103.74l130.59,345.76h109.39l130.59-345.76h-103.74Zm685.34,257.25V133.12h-95.82v345.76h237.67l33.43-88.52h-175.27Zm-1051.13,123.31v48.33h-48.33l-207.67-207.67-207.67,207.67h-48.33v-48.33s207.67-207.67,207.67-207.67L50,98.33v-48.33s48.33,0,48.33,0l207.67,207.67,207.67-207.67h48.33v48.33l-207.67,207.67s207.67,207.67,207.67,207.67ZM356.77,50l-50.77,50.77-50.77-50.77h-87.33l138.09,138.09L444.09,50h-87.33Zm87.33,512l-138.09-138.09-138.09,138.09h87.33l50.77-50.77,50.77,50.77h87.33Zm117.91-205.23l-50.77-50.77,50.77-50.77v-87.33l-138.09,138.09,138.09,138.09v-87.33ZM50,444.09l138.09-138.09L50,167.91v87.33l50.77,50.77-50.77,50.77v87.33Z" fill="#1a1a1a" />
            </svg>
          </div>
          <ul className="hidden md:flex gap-10 list-none">
            <li><Link href="/" className="text-[#4a4a4a] no-underline font-medium text-[0.95rem] hover:text-black transition-colors">Home</Link></li>
            <li><Link href="/people" className="text-[#4a4a4a] no-underline font-medium text-[0.95rem] hover:text-black transition-colors">People</Link></li>
            <li><Link href="/files" className="text-[#4a4a4a] no-underline font-medium text-[0.95rem] hover:text-black transition-colors">Resources</Link></li>
            <li><Link href="/admin" className="text-[#4a4a4a] no-underline font-medium text-[0.95rem] hover:text-black transition-colors">Admin</Link></li>
          </ul>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative h-[400px] vml-gradient-header flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 opacity-50" style={{
          backgroundImage: `url('data:image/svg+xml,<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse"><path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1"/></pattern></defs><rect width="100%" height="100%" fill="url(%23grid)"/></svg>')`
        }}></div>
        <div className="relative text-center text-white max-w-[800px] px-8">
          <h1 className="text-5xl font-extrabold mb-4 tracking-tight">Knowledge Base</h1>
          <p className="text-xl font-light opacity-95">Your central hub for company policies, guides, and documentation</p>
        </div>
      </section>

      {/* Feature Cards - Elevated above hero */}
      <section className="max-w-[1400px] mx-auto -mt-16 px-8 pb-16 relative z-10">
        {categories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {categories.map((category, catIndex) => {
              const sectionPages = getSectionPages(category.key).map((p: Page) => ({
                ...p,
                href: buildPathFromSlug(p.slug) || `/p/${p.slug}`
              }));

              return (
                <FeatureCard
                  key={category.key}
                  category={category}
                  index={catIndex}
                  landingPath={getSectionLandingPath(category.key)}
                  totalArticles={totalArticlesInSection(category.key)}
                  sectionPages={sectionPages}
                />
              )
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-16 bg-gray-50 rounded-xl">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-semibold text-[#1a1a1a] mb-2">
              No content available yet
            </h3>
            <p className="text-[#666] mb-6">
              Get started by creating your first page in the admin panel
            </p>
            <Link
              href="/admin"
              className="btn btn-primary"
              style={{ background: '#667eea', color: 'white' }}
            >
              Go to Admin Panel
            </Link>
          </div>
        )}
      </section>

      {/* Latest activity */}
      <section className="max-w-[1400px] mx-auto px-8 py-24">
        <div className="section-header">
          <h2>Latest Updates</h2>
          <p>New and recently changed articles</p>
        </div>
        <div className="grid gap-8 md:grid-cols-2">
          <div className="news-card">
            <div className="p-8">
              <h3 className="text-xl font-semibold text-[#1a1a1a] mb-4">Latest Added</h3>
              {latestAdded.length > 0 ? (
                <ul className="space-y-3">
                  {latestAdded.map((page: Page) => {
                    const path = buildPathFromSlug(page.slug) || `/p/${page.slug}`;
                    return (
                      <li key={page.slug}>
                        <Link
                          href={path}
                          className="text-[#1a1a1a] hover:text-[#667eea] font-medium transition-colors"
                        >
                          {page.title}
                        </Link>
                        {page.summary && (
                          <p className="text-sm text-[#666] mt-1 line-clamp-2">{page.summary}</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-[#999] italic">No recent additions</p>
              )}
            </div>
          </div>
          <div className="news-card">
            <div className="p-8">
              <h3 className="text-xl font-semibold text-[#1a1a1a] mb-4">Latest Updated</h3>
              {latestUpdated.length > 0 ? (
                <ul className="space-y-3">
                  {latestUpdated.map((page: Page) => {
                    const path = buildPathFromSlug(page.slug) || `/p/${page.slug}`;
                    return (
                      <li key={page.slug}>
                        <Link
                          href={path}
                          className="text-[#1a1a1a] hover:text-[#667eea] font-medium transition-colors"
                        >
                          {page.title}
                        </Link>
                        {page.summary && (
                          <p className="text-sm text-[#666] mt-1 line-clamp-2">{page.summary}</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-[#999] italic">No recent updates</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* People Section */}
      {people.length > 0 && (
        <section className="max-w-[1400px] mx-auto px-8 py-24">
          <div className="section-header">
            <h2>Meet Our Team</h2>
            <p>Connect with colleagues across the organization</p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {people.map((person) => {
              const fullName = `${person.first_name} ${person.last_name}`.trim();
              return (
                <Link
                  key={person.slug}
                  href={`/people/${person.slug}`}
                  className="news-card group"
                >
                  <div className="p-6 flex gap-4 items-center">
                    <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                      {person.photo_url ? (
                        <Image
                          src={person.photo_url}
                          alt={fullName}
                          width={64}
                          height={64}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-xl font-semibold">
                          {person.first_name.charAt(0)}
                          {person.last_name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-base font-semibold text-[#1a1a1a] group-hover:text-[#667eea] transition-colors">
                        {fullName}
                      </div>
                      <div className="text-sm text-[#666]">{person.job_title}</div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="text-center mt-8">
            <Link href="/people" className="read-more">
              View all team members →
            </Link>
          </div>
        </section>
      )}

      {/* Footer intentionally left blank */}
      <footer className="bg-[#1a1a1a] text-white pt-8 pb-8 px-8" />
    </div>
  );
}

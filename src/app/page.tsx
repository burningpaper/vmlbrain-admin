'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supa } from '@/lib/supabase';
import Link from 'next/link';
import Image from 'next/image';
import { RiBuilding2Line, RiTeamLine, RiHandHeartLine, RiClipboardLine, RiBookOpenLine } from 'react-icons/ri';

type Page = {
  slug: string;
  title: string;
  summary: string | null;
  parent_slug: string | null;
  section_key: string | null;
};

type SectionRow = {
  key: string;
  name: string;
  icon: string | null;
  image_name: string | null;
  sort_order: number | null;
};


type Person = {
  slug: string;
  first_name: string;
  last_name: string;
  job_title: string;
  photo_url: string | null;
};

type Category = {
  key: string;
  name: string;
  icon: string;
  imageName: string | null;
  pages: Page[];
};

export default function HomePage() {
  const router = useRouter();
  const [topLevelPages, setTopLevelPages] = useState<Page[]>([]);
  const [allPages, setAllPages] = useState<Page[]>([]);
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      // Get all top-level pages (no parent)
      const { data: topData } = await supa
        .from('policies')
        .select('slug, title, summary, parent_slug, section_key')
        .or('parent_slug.is.null,parent_slug.eq.')
        .eq('status', 'approved')
        .order('title');

      // Get all pages for children lookup
      const { data: allData } = await supa
        .from('policies')
        .select('slug, title, summary, parent_slug, section_key')
        .eq('status', 'approved')
        .order('title');

      // Get sections for homepage grouping
      const { data: sectionsData, error: sectionsError } = await supa
        .from('sections')
        .select('key, name, icon, image_name, sort_order')
        .order('sort_order');
      let resolvedSections = (sectionsData as SectionRow[]) || [];

      // Fallback for older schema without image_name column
      if (sectionsError) {
        const { data: fallbackSections } = await supa
          .from('sections')
          .select('key, name, icon, sort_order')
          .order('sort_order');
        resolvedSections = (fallbackSections as SectionRow[])?.map((sec) => ({
          ...sec,
          image_name: null,
        })) || [];
      }

      const { data: peopleData } = await supa
        .from('profiles')
        .select('slug, first_name, last_name, job_title, photo_url')
        .eq('status', 'approved')
        .order('last_name')
        .limit(6);

      setTopLevelPages((topData as Page[]) || []);
      setAllPages((allData as Page[]) || []);
      setPeople((peopleData as Person[]) || []);
      setSections(resolvedSections);
      setIsLoading(false);
    }

    fetchData();
  }, []);

  // Icon components map
  const iconMap: Record<string, React.ReactNode> = {
    building: <RiBuilding2Line className="text-[#667eea]" size={28} />,
    users: <RiTeamLine className="text-[#667eea]" size={28} />,
    handshake: <RiHandHeartLine className="text-[#667eea]" size={28} />,
    clipboard: <RiClipboardLine className="text-[#667eea]" size={28} />,
    book: <RiBookOpenLine className="text-[#667eea]" size={28} />,
  };

  // Group pages by explicit sections from the database
  const categories: Category[] = (sections || [])
    .map((sec) => ({
      key: sec.key,
      name: sec.name,
      icon: (sec.icon || 'book') as string,
      imageName: sec.image_name || null,
      pages: topLevelPages.filter((p) => p.section_key === sec.key),
    }));

  // Get children for a page
  const getChildren = (parentSlug: string) => {
    return allPages.filter((p) => p.parent_slug === parentSlug);
  };

  // Index children for recursive counts
  const childMap = useMemo(() => {
    const map = new Map<string, Page[]>();
    allPages.forEach((page) => {
      if (!page.parent_slug) return;
      const existing = map.get(page.parent_slug) || [];
      existing.push(page);
      map.set(page.parent_slug, existing);
    });
    return map;
  }, [allPages]);

  const countDescendants = (slug: string): number => {
    const children = childMap.get(slug) || [];
    return children.reduce((sum, child) => sum + 1 + countDescendants(child.slug), 0);
  };

  const totalArticlesInSection = (sectionKey: string): number => {
    return topLevelPages
      .filter((p) => p.section_key === sectionKey)
      .reduce((sum, page) => sum + 1 + countDescendants(page.slug), 0);
  };

  const pageMap = useMemo(() => {
    const map = new Map<string, Page>();
    allPages.forEach((p) => map.set(p.slug, p));
    return map;
  }, [allPages]);

  const buildPathFromSlug = (slug: string): string | null => {
    const pathParts: string[] = [];
    let current: Page | undefined = pageMap.get(slug);
    // Walk up to root
    while (current) {
      pathParts.unshift(current.slug);
      if (!current.parent_slug) break;
      current = pageMap.get(current.parent_slug);
    }
    if (pathParts.length === 0) return null;
    return `/p/${pathParts.join('/')}`;
  };

  const getSectionLandingPath = (sectionKey: string): string | null => {
    // Prefer top-level page for the section
    const topLevel = topLevelPages.find((p) => p.section_key === sectionKey);
    if (topLevel) return `/p/${topLevel.slug}`;

    // Fallback: any page in the section (child), build its full path
    const anyPage = allPages.find((p) => p.section_key === sectionKey);
    if (anyPage) {
      return buildPathFromSlug(anyPage.slug);
    }
    return null;
  };

  const handleSectionClick = (sectionKey: string) => (event: React.MouseEvent) => {
    const landingPath = getSectionLandingPath(sectionKey);
    if (!landingPath) return;
    // Avoid interfering with inner links
    const target = event.target as HTMLElement;
    if (target.closest('a')) return;
    router.push(landingPath);
  };

  const toggleCategory = (categoryName: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName);
    } else {
      newExpanded.add(categoryName);
    }
    setExpandedCategories(newExpanded);
  };

  // Gradient backgrounds for feature cards
  const gradients = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  ];

  // Image mapping for category cards (by section name)
  const categoryImages: Record<string, string> = {
    'How Do I...': '/homepage_howdoi.jpg',
  };

  const getSectionImageSrc = (imageName?: string | null, fallback?: string) => {
    if (imageName) return `/${imageName}`;
    if (fallback) return fallback;
    return null;
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <nav className="max-w-[1400px] mx-auto px-8 py-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <svg className="h-8" viewBox="0 0 1860 612" xmlns="http://www.w3.org/2000/svg">
              <path d="m1404.7,133.12l63.12,345.76h-100.16l-25.07-198.92-54.78,198.92h-89.89l-54.78-198.92-25.07,198.92h-100.15l63.12-345.76h105.96l55.88,203.16,55.88-203.16h105.96Zm-476.91,0l-81.54,233.33-81.54-233.33h-103.74l130.59,345.76h109.39l130.59-345.76h-103.74Zm685.34,257.25V133.12h-95.82v345.76h237.67l33.43-88.52h-175.27Zm-1051.13,123.31v48.33h-48.33l-207.67-207.67-207.67,207.67h-48.33v-48.33s207.67-207.67,207.67-207.67L50,98.33v-48.33s48.33,0,48.33,0l207.67,207.67,207.67-207.67h48.33v48.33l-207.67,207.67s207.67,207.67,207.67,207.67ZM356.77,50l-50.77,50.77-50.77-50.77h-87.33l138.09,138.09L444.09,50h-87.33Zm87.33,512l-138.09-138.09-138.09,138.09h87.33l50.77-50.77,50.77,50.77h87.33Zm117.91-205.23l-50.77-50.77,50.77-50.77v-87.33l-138.09,138.09,138.09,138.09v-87.33ZM50,444.09l138.09-138.09L50,167.91v87.33l50.77,50.77-50.77,50.77v87.33Z" fill="#1a1a1a"/>
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
          <div className="mt-6 flex gap-4 justify-center">
            <Link href="/people" className="btn btn-primary">View People</Link>
            <Link href="/files" className="btn btn-secondary">Explore Resources</Link>
          </div>
        </div>
      </section>

      {/* Feature Cards - Elevated above hero */}
      <section className="max-w-[1400px] mx-auto -mt-16 px-8 pb-16 relative z-10">
        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-16">
            <div className="flex justify-center space-x-2 mb-4">
              <div className="w-3 h-3 bg-[#667eea] rounded-full animate-bounce"></div>
              <div className="w-3 h-3 bg-[#667eea] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-3 h-3 bg-[#667eea] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <p className="text-gray-600 text-sm">Loading content...</p>
          </div>
        )}

        {/* Feature Cards Grid */}
        {!isLoading && categories.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {categories.map((category, catIndex) => {
              const categoryImage = getSectionImageSrc(category.imageName, categoryImages[category.name]);
              const headingImage = getSectionImageSrc(category.imageName, categoryImages[category.name]);
              return (
              <div
                key={category.key}
                className="feature-card"
                role={getSectionLandingPath(category.key) ? 'button' : undefined}
                tabIndex={getSectionLandingPath(category.key) ? 0 : -1}
                onClick={handleSectionClick(category.key)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSectionClick(category.key)(e as unknown as React.MouseEvent);
                  }
                }}
              >
                <div
                  className="w-full h-[200px] relative flex items-center justify-center overflow-hidden"
                  style={categoryImage ? {} : { background: gradients[catIndex % gradients.length] }}
                >
                  {categoryImage ? (
                    <Image
                      src={categoryImage}
                      alt={category.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <>
                      <svg className="absolute w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <pattern id={`pattern-${catIndex}`} x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                            <circle cx="20" cy="20" r="2" fill="white"/>
                          </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill={`url(#pattern-${catIndex})`}/>
                      </svg>
                      <div className="relative z-10 text-white text-5xl">
                        {iconMap[category.icon]}
                      </div>
                    </>
                  )}
                </div>
                <div className="p-8">
                  <div className="flex items-center gap-3 mb-3">
                    {headingImage ? (
                      <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-gray-100 shadow-sm">
                        <Image
                          src={headingImage}
                          alt={`${category.name} section`}
                          fill
                          className="object-cover"
                          sizes="44px"
                        />
                      </div>
                    ) : (
                      <div className="w-11 h-11 rounded-lg flex items-center justify-center bg-[#eef0ff] text-[#667eea]">
                        {iconMap[category.icon]}
                      </div>
                    )}
                    <h3 className="text-2xl font-semibold text-[#1a1a1a]">{category.name}</h3>
                  </div>
                  <p className="text-[#666] text-base leading-relaxed mb-4">
                    {totalArticlesInSection(category.key) > 0
                      ? `${totalArticlesInSection(category.key)} article${totalArticlesInSection(category.key) !== 1 ? 's' : ''} available`
                      : 'No articles yet'
                    }
                  </p>
                    {totalArticlesInSection(category.key) > 0 && (
                    <div className="space-y-2">
                      {category.pages.slice(0, 3).map((page) => (
                        <Link
                          key={page.slug}
                          href={`/p/${page.slug}`}
                          className="block text-sm text-[#667eea] hover:text-[#764ba2] transition-colors"
                        >
                          {page.title}
                        </Link>
                      ))}
                      {totalArticlesInSection(category.key) > category.pages.slice(0, 3).length && (
                        <span className="feature-tag mt-2">+{totalArticlesInSection(category.key) - category.pages.slice(0, 3).length} more</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && topLevelPages.length === 0 && (
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

      {/* All Content Section */}
      {!isLoading && categories.length > 0 && (
        <section className="max-w-[1400px] mx-auto px-8 py-24">
          <div className="section-header">
            <h2>Browse All Content</h2>
            <p>Explore our complete library of policies, guides, and documentation</p>
          </div>

          <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => {
              const headingImage = getSectionImageSrc(category.imageName, categoryImages[category.name]);
              return (
                <div
                  key={category.key}
                  className="news-card"
                  role={getSectionLandingPath(category.key) ? 'button' : undefined}
                  tabIndex={getSectionLandingPath(category.key) ? 0 : -1}
                  onClick={handleSectionClick(category.key)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSectionClick(category.key)(e as unknown as React.MouseEvent);
                    }
                  }}
                >
                  <div className="p-8">
                    <div className="flex items-center gap-3 mb-4">
                      {headingImage ? (
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shadow-sm">
                          <Image
                            src={headingImage}
                            alt={`${category.name} section`}
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#eef0ff] text-[#667eea]">
                          {iconMap[category.icon]}
                        </div>
                      )}
                      <h3 className="text-xl font-semibold text-[#1a1a1a]">{category.name}</h3>
                    </div>

                    {totalArticlesInSection(category.key) > 0 ? (
                      <ul className="space-y-3">
                        {category.pages.map((page) => {
                          const children = getChildren(page.slug);
                          const isExpanded = expandedCategories.has(page.slug);

                          return (
                            <li key={page.slug}>
                              <div className="flex items-center justify-between">
                                <Link
                                  href={`/p/${page.slug}`}
                                  className="text-[#1a1a1a] hover:text-[#667eea] font-medium transition-colors"
                                >
                                  {page.title}
                                </Link>
                                {children.length > 0 && (
                                  <button
                                    onClick={() => toggleCategory(page.slug)}
                                    className="text-[#667eea] text-sm hover:underline"
                                  >
                                    {isExpanded ? 'Hide' : `+${children.length}`}
                                  </button>
                                )}
                              </div>
                              {page.summary && (
                                <p className="text-sm text-[#666] mt-1 line-clamp-2">{page.summary}</p>
                              )}
                              {isExpanded && children.length > 0 && (
                                <ul className="mt-2 ml-4 space-y-1 animate-fade-in">
                                  {children.map((child) => (
                                    <li key={child.slug}>
                                      <Link
                                        href={`/p/${page.slug}/${child.slug}`}
                                        className="text-sm text-[#667eea] hover:text-[#764ba2]"
                                      >
                                        → {child.title}
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="text-[#999] italic">No articles in this section yet</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

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

      {/* Footer */}
      <footer className="bg-[#1a1a1a] text-white pt-16 pb-8 px-8">
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

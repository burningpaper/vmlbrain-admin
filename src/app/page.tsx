'use client';

import { useEffect, useState } from 'react';
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
  pages: Page[];
};

export default function HomePage() {
  const [topLevelPages, setTopLevelPages] = useState<Page[]>([]);
  const [allPages, setAllPages] = useState<Page[]>([]);
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
      const { data: sectionsData } = await supa
        .from('sections')
        .select('key, name, icon, sort_order')
        .order('sort_order');

      const { data: peopleData } = await supa
        .from('profiles')
        .select('slug, first_name, last_name, job_title, photo_url')
        .eq('status', 'approved')
        .order('last_name')
        .limit(6);

      setTopLevelPages((topData as Page[]) || []);
      setAllPages((allData as Page[]) || []);
      setPeople((peopleData as Person[]) || []);
      setSections((sectionsData as SectionRow[]) || []);
      setIsLoading(false);
    }

    fetchData();
  }, []);

  // Icon components map
  const iconMap: Record<string, React.ReactNode> = {
    building: <RiBuilding2Line className="text-vml-blue" size={28} />,
    users: <RiTeamLine className="text-vml-blue" size={28} />,
    handshake: <RiHandHeartLine className="text-vml-blue" size={28} />,
    clipboard: <RiClipboardLine className="text-vml-blue" size={28} />,
    book: <RiBookOpenLine className="text-vml-blue" size={28} />,
  };

  const sidebarIconMap: Record<string, React.ReactNode> = {
    building: <RiBuilding2Line className="text-vml-blue" size={18} />,
    users: <RiTeamLine className="text-vml-blue" size={18} />,
    handshake: <RiHandHeartLine className="text-vml-blue" size={18} />,
    clipboard: <RiClipboardLine className="text-vml-blue" size={18} />,
    book: <RiBookOpenLine className="text-vml-blue" size={18} />,
  };

  // Group pages by explicit sections from the database
  const categories: Category[] = (sections || [])
    .map((sec) => ({
      key: sec.key,
      name: sec.name,
      icon: (sec.icon || 'book') as string,
      pages: topLevelPages.filter((p) => p.section_key === sec.key),
    }));

  // Get children for a page
  const getChildren = (parentSlug: string) => {
    return allPages.filter((p) => p.parent_slug === parentSlug);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps

  const toggleCategory = (categoryName: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName);
    } else {
      newExpanded.add(categoryName);
    }
    setExpandedCategories(newExpanded);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header with VML Gradient */}
      <header className="vml-gradient-header text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-md hover:bg-white hover:bg-opacity-20 transition-smooth"
                aria-label="Toggle sidebar"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {sidebarOpen ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </svg>
              </button>

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
            </div>

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

      <div className="flex max-w-full mx-auto">
        {/* Sidebar - Quick Access Panel */}
        <aside
          className={`
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            lg:translate-x-0
            fixed lg:sticky top-[73px] left-0 h-[calc(100vh-73px)]
            w-64 bg-gray-50 border-r border-gray-200
            transition-transform duration-300 ease-in-out
            z-40 overflow-y-auto
          `}
        >
          <div className="p-6 space-y-6">
            {/* Main Sections */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Main Sections
              </h3>
              <ul className="space-y-2">
                {categories.map((cat) => (
                  <li key={cat.name}>
                    <button
                      onClick={() => {
                        const element = document.getElementById(
                          `section-${cat.key}`
                        );
                        element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        if (window.innerWidth < 1024) setSidebarOpen(false);
                      }}
                      className="w-full text-left text-sm text-gray-700 hover:text-vml-blue hover:bg-gray-100 px-3 py-2 rounded-md transition-smooth flex items-center gap-2"
                    >
                      {sidebarIconMap[cat.icon]}
                      <span>{cat.name}</span>
                      <span className="ml-auto text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                        {cat.pages.length}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Quick Links
              </h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/people"
                    className="flex items-center gap-2 text-sm text-gray-700 hover:text-vml-blue hover:bg-gray-100 px-3 py-2 rounded-md transition-smooth"
                    onClick={() => {
                      if (window.innerWidth < 1024) setSidebarOpen(false);
                    }}
                  >
                    <RiTeamLine className="text-vml-blue" size={16} />
                    <span>People Directory</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/files"
                    className="flex items-center gap-2 text-sm text-gray-700 hover:text-vml-blue hover:bg-gray-100 px-3 py-2 rounded-md transition-smooth"
                    onClick={() => {
                      if (window.innerWidth < 1024) setSidebarOpen(false);
                    }}
                  >
                    <RiClipboardLine className="text-vml-blue" size={16} />
                    <span>Files</span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Recently Viewed - Placeholder */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Recently Viewed
              </h3>
              <p className="text-xs text-gray-400 italic px-3">
                Coming soon...
              </p>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Banner */}
          <div 
            className="mb-8 rounded-xl p-6 sm:p-8 text-white shadow-lg"
            style={{
              background: 'linear-gradient(to right, #0099FF, #FF1493)'
            }}
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">
              Welcome to the VML Knowledge Base
            </h2>
            <p className="text-white text-opacity-90 text-sm sm:text-base">
              Your central hub for company policies, guides, and documentation
            </p>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-16">
              <div className="flex justify-center space-x-2 mb-4">
                <div className="w-3 h-3 bg-vml-blue rounded-full animate-bounce"></div>
                <div className="w-3 h-3 bg-vml-blue rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-3 h-3 bg-vml-blue rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <p className="text-gray-600 text-sm">Content loading...</p>
            </div>
          )}

          {/* Categories - Unified Flow Layout */}
          {!isLoading && categories.length > 0 && (
            <div>
              {/* All Tiles in One Grid */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {categories.map((category) => (
                  <div key={category.name} className="contents">
                    {category.pages.map((page, index) => {
                      const children = getChildren(page.slug);
                      const isExpanded = expandedCategories.has(page.slug);
                      const isFirstInCategory = index === 0;

                      return (
                        <div
                          key={page.slug}
                          id={isFirstInCategory ? `section-${category.key}` : undefined}
                          className="bg-white rounded-lg border border-gray-200 border-l-4 border-l-gray-200 hover:border-l-vml-blue shadow-sm card-hover overflow-hidden scroll-mt-24"
                        >
                          <div className="p-6">
                            {/* Category Badge at top of first card */}
                            {isFirstInCategory && (
                              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100">
                                {iconMap[category.icon]}
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                  {category.name}
                                </span>
                              </div>
                            )}

                            <Link href={`/p/${page.slug}`}>
                              <h3 className="text-lg font-semibold text-gray-900 hover:text-vml-blue mb-2 transition-smooth">
                                {page.title}
                              </h3>
                            </Link>

                            {page.summary && (
                              <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                                {page.summary}
                              </p>
                            )}

                            {children.length > 0 && (
                              <div className="border-t border-gray-100 pt-4 mt-4">
                                <button
                                  onClick={() => toggleCategory(page.slug)}
                                  className="flex items-center justify-between w-full text-xs font-medium text-gray-500 uppercase hover:text-vml-blue transition-smooth"
                                >
                                  <span>Expand ({children.length})</span>
                                  <svg
                                    className={`w-4 h-4 transition-transform ${
                                      isExpanded ? 'rotate-180' : ''
                                    }`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M19 9l-7 7-7-7"
                                    />
                                  </svg>
                                </button>

                                {isExpanded && (
                                  <ul className="space-y-1 animate-fade-in mt-2">
                                    {children.map((child) => (
                                      <li key={child.slug}>
                                        <Link
                                          href={`/p/${page.slug}/${child.slug}`}
                                          className="text-sm text-vml-blue hover:text-vml-pink hover:underline flex items-center gap-1"
                                        >
                                          <span>→</span>
                                          <span>{child.title}</span>
                                        </Link>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            )}

                            <Link
                              href={`/p/${page.slug}`}
                              className="inline-flex items-center gap-1 mt-4 text-sm font-medium text-vml-blue hover:text-vml-pink transition-smooth"
                            >
                              <span>View page</span>
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* People Section */}
          {people.length > 0 && (
            <section className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <RiTeamLine className="text-vml-blue" size={28} />
                  People
                </h2>
                <Link
                  href="/people"
                  className="text-sm font-medium text-vml-blue hover:text-vml-pink transition-smooth"
                >
                  View all →
                </Link>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {people.map((person) => {
                  const fullName = `${person.first_name} ${person.last_name}`.trim();
                  return (
                    <Link
                      key={person.slug}
                      href={`/people/${person.slug}`}
                      className="group rounded-lg border border-gray-200 bg-white hover:shadow-lg transition-smooth overflow-hidden"
                    >
                      <div className="p-5 flex gap-4 items-center">
                        <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-vml-blue to-vml-pink flex-shrink-0">
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
                          <div className="text-base font-semibold text-gray-900 group-hover:text-vml-blue transition-smooth">
                            {fullName}
                          </div>
                          <div className="text-sm text-gray-600">{person.job_title}</div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Empty State */}
          {!isLoading && topLevelPages.length === 0 && (
            <div className="text-center py-16 bg-gray-50 rounded-lg">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No content available yet
              </h3>
              <p className="text-gray-600 mb-6">
                Get started by creating your first page in the admin panel
              </p>
              <Link
                href="/admin"
                className="inline-block bg-vml-blue hover:bg-vml-pink text-white font-medium px-6 py-3 rounded-lg transition-smooth"
              >
                Go to Admin Panel
              </Link>
            </div>
          )}
        </main>
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

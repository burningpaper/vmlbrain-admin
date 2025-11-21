'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { RiBuilding2Line, RiTeamLine, RiHandHeartLine, RiClipboardLine, RiBookOpenLine, RiArrowRightSLine, RiArrowDownSLine } from 'react-icons/ri';

interface NavItem {
  slug: string;
  title: string;
  parent_slug: string | null;
  section_key?: string | null;
}

interface SectionRow {
  key: string;
  name: string;
  icon: string | null;
  sort_order: number | null;
}

interface SidebarNavProps {
  items: NavItem[];
  sections: SectionRow[];
}

interface Category {
  name: string;
  icon: React.ReactNode;
  pages: NavItem[];
}

export default function SidebarNav({ items, sections }: SidebarNavProps) {
  const pathname = usePathname();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());

  // Categorization based on DB sections (no heuristics)
  const categorizePages = (pages: NavItem[], secs: SectionRow[]): Category[] => {
    const iconMap: Record<string, React.ReactNode> = {
      building: <RiBuilding2Line className="text-[#667eea]" size={18} />,
      users: <RiTeamLine className="text-[#667eea]" size={18} />,
      handshake: <RiHandHeartLine className="text-[#667eea]" size={18} />,
      clipboard: <RiClipboardLine className="text-[#667eea]" size={18} />,
      book: <RiBookOpenLine className="text-[#667eea]" size={18} />,
    };

    const topLevelPages = pages.filter(p => !p.parent_slug || p.parent_slug === '');
    const cats: Category[] = secs.map((sec) => ({
      name: sec.name,
      icon: iconMap[(sec.icon || 'book') as string] || iconMap['book'],
      pages: topLevelPages.filter(p => (p.section_key || null) === sec.key),
    }));

    // Hide empty sections in the narrow right-hand nav to keep it short
    return cats.filter(c => c.pages.length > 0);
  };

  const categories = useMemo(() => categorizePages(items, sections), [items, sections]);

  // Get child pages for a parent slug
  const getChildren = (parentSlug: string): NavItem[] => {
    return items.filter((p) => p.parent_slug === parentSlug);
  };

  // Smart default: expand category containing current page
  useEffect(() => {
    const currentSlug = pathname.split('/').pop();

    // Expand the category that contains the current page (or its parent)
    const categoryWithCurrentPage = categories.find((cat) =>
      cat.pages.some((page) => page.slug === currentSlug || getChildren(page.slug).some(child => child.slug === currentSlug))
    );
    if (categoryWithCurrentPage) {
      setExpandedCategories(new Set([categoryWithCurrentPage.name]));
    }

    // Default expand: the parent of current page, or the page itself if top-level
    const currentItem = items.find(i => i.slug === currentSlug);
    const initParents = new Set<string>();
    if (currentItem?.parent_slug) {
      initParents.add(currentItem.parent_slug);
    } else if (currentItem) {
      initParents.add(currentItem.slug);
    }
    setExpandedParents(initParents);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, items]);

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryName)) {
        next.delete(categoryName);
      } else {
        next.add(categoryName);
      }
      return next;
    });
  };

  const toggleParent = (slug: string) => {
    setExpandedParents((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug); else next.add(slug);
      return next;
    });
  };

  const isPageActive = (slug: string): boolean => {
    return pathname.includes(`/p/${slug}`);
  };

  return (
    <nav className="space-y-1">
      <div className="text-xs font-semibold text-[#999] uppercase tracking-wider px-3 mb-3">
        Contents
      </div>

      {categories.map((category) => {
        const isExpanded = expandedCategories.has(category.name);

        return (
          <div key={category.name} className="mb-4">
            <button
              onClick={() => toggleCategory(category.name)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-[#1a1a1a] hover:bg-gray-100 rounded-lg transition-colors"
            >
              <span className="flex items-center gap-2">
                {category.icon}
                <span>{category.name}</span>
              </span>
              <RiArrowDownSLine
                className={`text-[#999] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                size={16}
              />
            </button>

            {isExpanded && (
              <div className="mt-1 space-y-0.5 animate-fade-in">
                {category.pages.map((page) => {
                  const children = getChildren(page.slug);
                  const isActive = isPageActive(page.slug);
                  const hasChildren = children.length > 0;
                  const parentOpen = expandedParents.has(page.slug);

                  return (
                    <div key={page.slug}>
                      <div className="flex items-center">
                        <Link
                          href={`/p/${page.slug}`}
                          className={`block py-1.5 px-3 ml-6 text-sm rounded-lg transition-colors ${
                            isActive
                              ? 'bg-[#eef0ff] text-[#667eea] font-medium border border-[#dfe2ff]'
                              : 'text-[#4a4a4a] hover:bg-gray-100'
                          }`}
                        >
                          {page.title}
                        </Link>
                        {hasChildren && (
                          <button
                            type="button"
                            onClick={() => toggleParent(page.slug)}
                            aria-label={parentOpen ? 'Collapse subpages' : 'Expand subpages'}
                            className="ml-auto mr-2 p-1 rounded hover:bg-gray-100"
                          >
                            <RiArrowDownSLine
                              className={`text-[#999] transition-transform ${parentOpen ? 'rotate-180' : ''}`}
                              size={16}
                            />
                          </button>
                        )}
                      </div>

                      {hasChildren && parentOpen && (
                        <div className="ml-4 mt-0.5 space-y-0.5">
                          {children.map((child) => {
                            const isChildActive = isPageActive(child.slug);
                            return (
                              <Link
                                key={child.slug}
                                href={`/p/${page.slug}/${child.slug}`}
                                className={`block py-1 px-3 ml-6 text-xs rounded-lg transition-colors flex items-center gap-1 ${
                                  isChildActive
                                    ? 'bg-[#eef0ff] text-[#667eea] font-medium border border-[#dfe2ff]'
                                    : 'text-[#666] hover:bg-gray-100'
                                }`}
                              >
                                <RiArrowRightSLine size={14} />
                                <span>{child.title}</span>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

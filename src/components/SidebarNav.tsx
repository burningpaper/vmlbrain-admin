'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { RiBuilding2Line, RiTeamLine, RiHandHeartLine, RiClipboardLine, RiBookOpenLine, RiArrowRightSLine, RiArrowDownSLine } from 'react-icons/ri';

interface NavItem {
  slug: string;
  title: string;
  parent_slug: string | null;
}

interface SidebarNavProps {
  items: NavItem[];
}

interface Category {
  name: string;
  icon: React.ReactNode;
  pages: NavItem[];
}

export default function SidebarNav({ items }: SidebarNavProps) {
  const pathname = usePathname();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Smart categorization function
  const categorizePages = (pages: NavItem[]): Category[] => {
    const categories: Category[] = [
      { name: 'About VML SA', icon: <RiBuilding2Line className="text-vml-blue" size={18} />, pages: [] },
      { name: 'People & Culture', icon: <RiTeamLine className="text-vml-blue" size={18} />, pages: [] },
      { name: 'Client Operations', icon: <RiHandHeartLine className="text-vml-blue" size={18} />, pages: [] },
      { name: 'Policy & Governance', icon: <RiClipboardLine className="text-vml-blue" size={18} />, pages: [] },
      { name: 'General Knowledge', icon: <RiBookOpenLine className="text-vml-blue" size={18} />, pages: [] },
    ];

    // Get only top-level pages (no parent)
    const topLevelPages = pages.filter(p => !p.parent_slug || p.parent_slug === '');

    topLevelPages.forEach((page) => {
      const lowerTitle = page.title.toLowerCase();
      const lowerSlug = page.slug.toLowerCase();

      if (
        lowerSlug.includes('business-structure') ||
        lowerSlug.includes('exco') ||
        lowerSlug.includes('geography') ||
        lowerTitle.includes('company') ||
        lowerTitle.includes('about') ||
        lowerTitle.includes('vml sa')
      ) {
        categories[0].pages.push(page);
      } else if (
        lowerSlug.includes('joy') ||
        lowerSlug.includes('onboarding') ||
        lowerSlug.includes('people') ||
        lowerSlug.includes('culture') ||
        lowerSlug.includes('hr') ||
        lowerSlug.includes('employee')
      ) {
        categories[1].pages.push(page);
      } else if (
        lowerSlug.includes('client') ||
        lowerSlug.includes('engagement') ||
        lowerSlug.includes('radar') ||
        lowerSlug.includes('project') ||
        lowerSlug.includes('sales')
      ) {
        categories[2].pages.push(page);
      } else if (
        lowerSlug.includes('policy') ||
        lowerSlug.includes('handbook') ||
        lowerSlug.includes('compliance') ||
        lowerSlug.includes('governance') ||
        lowerSlug.includes('legal')
      ) {
        categories[3].pages.push(page);
      } else {
        categories[4].pages.push(page);
      }
    });

    return categories.filter((cat) => cat.pages.length > 0);
  };

  const categories = categorizePages(items);

  // Get child pages for a parent slug
  const getChildren = (parentSlug: string): NavItem[] => {
    return items.filter((p) => p.parent_slug === parentSlug);
  };

  // Smart default: expand category containing current page
  useEffect(() => {
    const currentSlug = pathname.split('/').pop();
    const categoryWithCurrentPage = categories.find((cat) =>
      cat.pages.some((page) => page.slug === currentSlug || getChildren(page.slug).some(child => child.slug === currentSlug))
    );

    if (categoryWithCurrentPage) {
      setExpandedCategories(new Set([categoryWithCurrentPage.name]));
    }
  }, [pathname]);

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

  const isPageActive = (slug: string): boolean => {
    return pathname.includes(`/p/${slug}`);
  };

  return (
    <nav className="space-y-1">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-3">
        Contents
      </div>

      {categories.map((category) => {
        const isExpanded = expandedCategories.has(category.name);

        return (
          <div key={category.name} className="mb-4">
            <button
              onClick={() => toggleCategory(category.name)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-md transition-smooth"
            >
              <span className="flex items-center gap-2">
                {category.icon}
                <span>{category.name}</span>
              </span>
              <RiArrowDownSLine 
                className={`text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                size={16} 
              />
            </button>

            {isExpanded && (
              <div className="mt-1 space-y-0.5 animate-fade-in">
                {category.pages.map((page) => {
                  const children = getChildren(page.slug);
                  const isActive = isPageActive(page.slug);

                  return (
                    <div key={page.slug}>
                      <Link
                        href={`/p/${page.slug}`}
                        className={`block py-1.5 px-3 ml-6 text-sm rounded transition-smooth ${
                          isActive
                            ? 'bg-vml-blue bg-opacity-10 text-vml-blue font-medium'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {page.title}
                      </Link>

                      {children.length > 0 && (
                        <div className="ml-4 mt-0.5 space-y-0.5">
                          {children.map((child) => {
                            const isChildActive = isPageActive(child.slug);
                            return (
                              <Link
                                key={child.slug}
                                href={`/p/${page.slug}/${child.slug}`}
                                className={`block py-1 px-3 ml-6 text-xs rounded transition-smooth flex items-center gap-1 ${
                                  isChildActive
                                    ? 'bg-vml-blue bg-opacity-10 text-vml-blue font-medium'
                                    : 'text-gray-600 hover:bg-gray-100'
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

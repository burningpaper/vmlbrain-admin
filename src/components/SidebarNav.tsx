'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

interface NavItem {
  slug: string;
  title: string;
  parent_slug: string | null;
  children?: NavItem[];
}

interface SidebarNavProps {
  items: NavItem[];
}

export default function SidebarNav({ items }: SidebarNavProps) {
  const pathname = usePathname();
  const rootRef = useRef<HTMLElement | null>(null);

  // Find nearest scrollable ancestor (e.g., the right sidebar container with overflow-y-auto)
  function findScrollableAncestor(el: HTMLElement | null): HTMLElement | null {
    let p = el?.parentElement || null;
    while (p) {
      const style = window.getComputedStyle(p);
      const oy = style.overflowY;
      if ((oy === 'auto' || oy === 'scroll') && p.scrollHeight > p.clientHeight) {
        return p;
      }
      p = p.parentElement;
    }
    return null;
  }

  // Persist and restore sidebar scroll across route changes
  useEffect(() => {
    const key = 'sidebar-scroll-pos';
    let scroller: HTMLElement | null = null;
    let onScroll: ((this: HTMLElement, ev: Event) => any) | null = null;

    const restore = () => {
      scroller = findScrollableAncestor(rootRef.current);
      if (!scroller) return;
      const saved = sessionStorage.getItem(key);
      if (saved) {
        const pos = parseInt(saved, 10);
        if (!Number.isNaN(pos)) scroller.scrollTop = pos;
      }
      onScroll = () => {
        if (scroller) sessionStorage.setItem(key, String(scroller.scrollTop));
      };
      scroller.addEventListener('scroll', onScroll, { passive: true } as AddEventListenerOptions);
    };

    // Defer until after paint so layout/height is correct
    const id = requestAnimationFrame(restore);

    return () => {
      cancelAnimationFrame(id);
      if (scroller && onScroll) {
        scroller.removeEventListener('scroll', onScroll as any);
      }
    };
  }, [pathname]);

  // Build tree structure
  const buildTree = (items: NavItem[]): NavItem[] => {
    const tree: NavItem[] = [];
    const map = new Map<string, NavItem>();

    items.forEach(item => {
      map.set(item.slug, { ...item, children: [] });
    });

    items.forEach(item => {
      const node = map.get(item.slug)!;
      if (item.parent_slug && map.has(item.parent_slug)) {
        map.get(item.parent_slug)!.children!.push(node);
      } else {
        tree.push(node);
      }
    });

    return tree;
  };

  const tree = buildTree(items);

  const TreeNode = ({ node, level = 0, parentPath = '' }: { node: NavItem; level?: number; parentPath?: string }) => {
    const nodePath = parentPath ? `${parentPath}/${node.slug}` : node.slug;
    const fullPath = `/p/${nodePath}`;
    const isActive = pathname === fullPath;
    const hasChildren = node.children && node.children.length > 0;

    return (
      <li className="list-none">
        <Link
          href={fullPath}
          className={`block py-1.5 px-3 text-sm rounded transition-colors ${
            isActive
              ? 'bg-blue-100 text-blue-700 font-medium'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
          style={{ paddingLeft: `${level * 16 + 12}px` }}
        >
          {level > 0 && '└ '}{node.title}
        </Link>
        {hasChildren && (
          <ul className="mt-1">
            {node.children!.map((child) => (
              <TreeNode
                key={child.slug}
                node={child}
                level={level + 1}
                parentPath={nodePath}
              />
            ))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <nav ref={rootRef} className="space-y-1">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-3">
        Contents
      </div>
      <ul>
        {tree.map((node) => (
          <TreeNode key={node.slug} node={node} />
        ))}
      </ul>
    </nav>
  );
}

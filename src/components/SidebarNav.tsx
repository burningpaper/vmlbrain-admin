'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  slug: string;
  title: string;
  parent_slug: string | null;
  children?: NavItem[];
}

interface SidebarNavProps {
  items: NavItem[];
  currentSlug: string;
}

export default function SidebarNav({ items, currentSlug }: SidebarNavProps) {
  const pathname = usePathname();

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
    <nav className="space-y-1">
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

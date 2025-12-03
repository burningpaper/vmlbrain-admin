'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { RiBuilding2Line, RiTeamLine, RiHandHeartLine, RiClipboardLine, RiBookOpenLine } from 'react-icons/ri';

import { Category, Page } from '@/types';

interface FeatureCardProps {
    category: Category;
    index: number;
    landingPath: string | null;
    totalArticles: number;
    sectionPages: (Page & { href: string })[];
}

const iconMap: Record<string, React.ReactNode> = {
    building: <RiBuilding2Line className="text-[#667eea]" size={28} />,
    users: <RiTeamLine className="text-[#667eea]" size={28} />,
    handshake: <RiHandHeartLine className="text-[#667eea]" size={28} />,
    clipboard: <RiClipboardLine className="text-[#667eea]" size={28} />,
    book: <RiBookOpenLine className="text-[#667eea]" size={28} />,
};

const gradients = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
];

const categoryImages: Record<string, string> = {
    'How Do I...': '/homepage_howdoi.jpg',
};

export default function FeatureCard({
    category,
    index,
    landingPath,
    totalArticles,
    sectionPages,
}: FeatureCardProps) {
    const router = useRouter();

    const handleSectionClick = (event: React.MouseEvent) => {
        if (!landingPath) return;
        // Avoid interfering with inner links
        const target = event.target as HTMLElement;
        if (target.closest('a')) return;
        router.push(landingPath);
    };

    const getSectionImageSrc = (imageName?: string | null, fallback?: string) => {
        if (imageName) return `/${imageName}`;
        if (fallback) return fallback;
        return null;
    };

    const categoryImage = getSectionImageSrc(category.imageName, categoryImages[category.name]);
    const headingImage = getSectionImageSrc(category.imageName, categoryImages[category.name]);

    return (
        <div
            className="feature-card cursor-pointer transition-transform hover:-translate-y-1 hover:shadow-lg bg-white rounded-xl overflow-hidden border border-gray-100"
            role={landingPath ? 'button' : undefined}
            tabIndex={landingPath ? 0 : -1}
            onClick={handleSectionClick}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSectionClick(e as unknown as React.MouseEvent);
                }
            }}
        >
            <div
                className="w-full h-[200px] relative flex items-center justify-center overflow-hidden"
                style={categoryImage ? {} : { background: gradients[index % gradients.length] }}
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
                                <pattern id={`pattern-${index}`} x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                                    <circle cx="20" cy="20" r="2" fill="white" />
                                </pattern>
                            </defs>
                            <rect width="100%" height="100%" fill={`url(#pattern-${index})`} />
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
                    {totalArticles > 0
                        ? `${totalArticles} article${totalArticles !== 1 ? 's' : ''} available`
                        : 'No articles yet'}
                </p>
                {totalArticles > 0 && (
                    <div className="space-y-2">
                        {sectionPages.slice(0, 3).map((page) => (
                            <Link
                                key={page.slug}
                                href={page.href}
                                className="block text-sm text-[#667eea] hover:text-[#764ba2] transition-colors"
                            >
                                {page.title}
                            </Link>
                        ))}
                        {totalArticles > sectionPages.slice(0, 3).length && (
                            <span className="feature-tag mt-2">
                                +{totalArticles - sectionPages.slice(0, 3).length} more
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

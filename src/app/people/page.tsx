import { supa } from '@/lib/supabase';
import Link from 'next/link';
import Image from 'next/image';

export const revalidate = 0;
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

type ProfileMeta = {
  slug: string;
  first_name: string;
  last_name: string;
  job_title: string;
  photo_url: string | null;
};

export default async function PeopleListingPage() {
  const { data } = await supa
    .from('profiles')
    .select('slug, first_name, last_name, job_title, photo_url, status')
    .eq('status', 'approved')
    .order('last_name');

  const profiles = (data as (ProfileMeta & { status?: string })[] | null) || [];

  return (
    <div className="min-h-screen bg-white">
      {/* Header with VML Gradient */}
      <header className="vml-gradient-header text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3 hover:opacity-90 transition-smooth">
              <Image
                src="/WHITE%20Icon%20Snowflake.png"
                alt="VML"
                width={40}
                height={40}
                className="object-contain"
              />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">People</h1>
                <p className="text-xs sm:text-sm text-white text-opacity-90 hidden sm:block">
                  Profiles of our team
                </p>
              </div>
            </Link>
            <nav className="flex items-center gap-4">
              <Link
                href="/"
                className="text-sm font-medium hover:bg-white hover:bg-opacity-20 px-3 py-2 rounded-md transition-smooth"
              >
                Knowledge
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

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {profiles.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-lg">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No profiles available yet
            </h3>
            <p className="text-gray-600 mb-6">
              Get started by adding profiles in the admin panel
            </p>
            <Link
              href="/admin"
              className="inline-block bg-vml-blue hover:bg-vml-pink text-white font-medium px-6 py-3 rounded-lg transition-smooth"
            >
              Go to Admin Panel
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {profiles.map((p) => {
              const fullName = `${p.first_name} ${p.last_name}`.trim();
              return (
                <Link
                  key={p.slug}
                  href={`/people/${p.slug}`}
                  className="group rounded-lg border border-gray-200 bg-white hover:shadow-lg transition-smooth overflow-hidden"
                >
                  <div className="p-5 flex gap-4 items-center">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-vml-blue to-vml-pink flex-shrink-0">
                      {p.photo_url ? (
                        <Image
                          src={p.photo_url}
                          alt={fullName}
                          width={64}
                          height={64}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-xl font-semibold">
                          {p.first_name.charAt(0)}
                          {p.last_name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-base font-semibold text-gray-900 group-hover:text-vml-blue transition-smooth">
                        {fullName}
                      </div>
                      <div className="text-sm text-gray-600">{p.job_title}</div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-gray-50 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-600">
              © {new Date().getFullYear()} VML. All rights reserved.
            </p>
            <p className="text-sm text-gray-600">
              Need help? Contact your HR department
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

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
      {/* Header */}
      <header className="bg-gray-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3">
              <Image src="/vml%20logo.jpg" alt="VML" width={24} height={24} className="rounded-sm" />
              <div>
                <h1 className="text-xl font-semibold">People</h1>
                <p className="text-sm text-gray-300">Profiles of our team</p>
              </div>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/" className="text-sm text-gray-300 hover:text-white transition-colors">
                Knowledge
              </Link>
              <Link href="/admin" className="text-sm text-gray-300 hover:text-white transition-colors">
                Admin
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {profiles.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No profiles available yet.</p>
            <Link href="/admin" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
              Go to Admin to add a profile
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
                  className="group rounded-lg border bg-white hover:shadow-md transition overflow-hidden"
                >
                  <div className="p-5 flex gap-4 items-center">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                      {p.photo_url ? (
                        <Image src={p.photo_url} alt={fullName} width={64} height={64} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xl font-semibold">
                          {p.first_name.charAt(0)}
                          {p.last_name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-base font-semibold text-gray-900 group-hover:text-blue-700">
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
    </div>
  );
}

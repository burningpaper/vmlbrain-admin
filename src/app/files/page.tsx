import FilesPageClient from '@/components/FilesPageClient';

export default function FilesPage({
  searchParams,
}: {
  searchParams: { folder?: string; files?: string };
}) {
  const folder = searchParams?.folder || '';
  const filesCsv = searchParams?.files || '';
  const initialFileIds = filesCsv ? filesCsv.split(',').map((s) => s.trim()).filter(Boolean) : [];

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <FilesPageClient initialFolderId={folder} initialFileIds={initialFileIds} />
      </div>
    </main>
  );
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ReportDetailPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Detail Laporan</h1>
      <p className="text-gray-500">ID: {id}</p>
    </main>
  );
}

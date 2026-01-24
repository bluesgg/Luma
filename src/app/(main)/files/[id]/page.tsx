interface FileReaderPageProps {
  params: Promise<{ id: string }>;
}

export default async function FileReaderPage({ params }: FileReaderPageProps) {
  const { id } = await params;

  return (
    <div className="flex h-screen flex-col">
      <h1 className="p-4 text-xl font-semibold">PDF Reader: {id}</h1>
    </div>
  );
}

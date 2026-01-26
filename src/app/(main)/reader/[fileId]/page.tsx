interface ReaderPageProps {
  params: Promise<{ fileId: string }>
}

export default async function ReaderPage({ params }: ReaderPageProps) {
  const { fileId } = await params

  return (
    <div className="h-screen flex flex-col">
      <header className="border-b p-4">
        <h1 className="text-xl font-bold">PDF Reader</h1>
      </header>
      <main className="flex-1 flex">
        <div className="flex-1">
          {/* TODO: PDF viewer */}
          <p className="p-4 text-muted-foreground">File ID: {fileId}</p>
        </div>
        <aside className="w-80 border-l p-4">
          {/* TODO: AI explanation panel */}
        </aside>
      </main>
    </div>
  )
}

'use client'

interface ExplanationPanelProps {
  fileId: string
  currentPage: number
  explanation?: string | null
  isLoading?: boolean
}

export function ExplanationPanel({
  fileId,
  currentPage,
  explanation,
  isLoading,
}: ExplanationPanelProps) {
  return (
    <div className="h-full flex flex-col">
      <h2 className="font-semibold mb-4">Page Explanation</h2>
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <p className="text-muted-foreground">Generating explanation...</p>
        ) : explanation ? (
          <div className="prose prose-sm">{explanation}</div>
        ) : (
          <p className="text-muted-foreground">
            Click &quot;Explain&quot; to generate an AI explanation for this page.
          </p>
        )}
      </div>
      <button className="mt-4 w-full py-2 border rounded hover:bg-muted">
        Explain Page {currentPage}
      </button>
    </div>
  )
}

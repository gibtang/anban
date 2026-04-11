export function CardSkeleton() {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 animate-pulse">
      <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-full mb-1"></div>
      <div className="h-4 bg-gray-200 rounded w-2/3 mb-3"></div>
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <div className="h-5 bg-gray-200 rounded w-12"></div>
          <div className="h-5 bg-gray-200 rounded w-12"></div>
        </div>
        <div className="h-6 w-6 bg-gray-200 rounded-full"></div>
      </div>
    </div>
  );
}

export function ColumnSkeleton({ cardCount = 3 }: { cardCount?: number }) {
  return (
    <div className="flex-shrink-0 w-80 bg-gray-50 rounded-lg p-4 animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
      <div className="space-y-3">
        {Array.from({ length: cardCount }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function KanbanBoardSkeleton({ columnCount = 3 }: { columnCount?: number }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {Array.from({ length: columnCount }).map((_, i) => (
        <ColumnSkeleton key={i} />
      ))}
    </div>
  );
}

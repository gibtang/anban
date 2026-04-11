export function BoardSkeleton() {
  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="h-6 w-6 bg-gray-200 rounded flex-shrink-0"></div>
      </div>
      <div className="mt-4 flex items-center">
        <div className="h-4 w-4 bg-gray-200 rounded mr-1"></div>
        <div className="h-4 bg-gray-200 rounded w-24"></div>
      </div>
    </div>
  );
}

export function BoardListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <BoardSkeleton key={i} />
      ))}
    </div>
  );
}

export function AgentSkeleton() {
  return (
    <li className="px-4 py-4 sm:px-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-3 mb-2">
            <div className="h-5 bg-gray-200 rounded w-24"></div>
            <div className="h-5 bg-gray-200 rounded w-20"></div>
            <div className="h-5 bg-gray-200 rounded w-16"></div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="h-4 bg-gray-200 rounded w-20"></div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </div>
        </div>
        <div className="flex items-center space-x-2 ml-4">
          <div className="h-8 bg-gray-200 rounded w-24"></div>
          <div className="h-8 bg-gray-200 rounded w-16"></div>
        </div>
      </div>
    </li>
  );
}

export function AgentListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="bg-white shadow overflow-hidden rounded-md">
      <ul className="divide-y divide-gray-200">
        {Array.from({ length: count }).map((_, i) => (
          <AgentSkeleton key={i} />
        ))}
      </ul>
    </div>
  );
}

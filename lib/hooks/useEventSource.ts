import { useEffect, useState } from 'react';

interface BoardEvent {
  type: string;
  boardId: string;
  [key: string]: any;
}

export function useEventSource(boardId: string) {
  const [event, setEvent] = useState<BoardEvent | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const eventSource = new EventSource(`/api/events?boardId=${boardId}`);

    eventSource.onopen = () => setConnected(true);
    eventSource.onerror = () => setConnected(false);

    eventSource.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type !== 'connected') {
        setEvent(data);
      }
    };

    return () => eventSource.close();
  }, [boardId]);

  return { event, connected };
}
import { useEffect, useState } from 'react';

interface BoardEvent {
  type: string;
  boardId: string;
  [key: string]: any;
}

export type ConnectionState = 'connecting' | 'connected' | 'disconnected';

export function useEventSource(boardId: string) {
  const [event, setEvent] = useState<BoardEvent | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');

  useEffect(() => {
    const eventSource = new EventSource(`/api/events?boardId=${boardId}`);

    eventSource.onopen = () => setConnectionState('connected');
    eventSource.onerror = () => setConnectionState('disconnected');

    eventSource.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type !== 'connected') {
        setEvent(data);
      }
    };

    return () => eventSource.close();
  }, [boardId]);

  return { event, connectionState };
}

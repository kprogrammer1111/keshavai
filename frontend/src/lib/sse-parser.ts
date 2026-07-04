export type SseEvent = {
  content?: string;
  done?: boolean;
  error?: string;
  typing?: boolean;
};

/**
 * Incrementally parse Server-Sent Events from a byte stream.
 * Handles partial lines split across network chunks.
 */
export function createSseParser(onEvent: (event: SseEvent) => void) {
  let buffer = '';

  return {
    feed(chunk: string) {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;

        const payload = trimmed.slice(5).trimStart();
        if (!payload) continue;

        try {
          onEvent(JSON.parse(payload) as SseEvent);
        } catch {
          // skip malformed JSON
        }
      }
    },
    flush() {
      const trimmed = buffer.trim();
      buffer = '';
      if (!trimmed.startsWith('data:')) return;

      const payload = trimmed.slice(5).trimStart();
      if (!payload) return;

      try {
        onEvent(JSON.parse(payload) as SseEvent);
      } catch {
        // skip malformed JSON
      }
    },
  };
}

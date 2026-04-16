import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../stores/gameStore';
import type { AnimationEventPayload } from '@skyjo/shared';

type AnimationHandler = (event: AnimationEventPayload) => Promise<void>;

/**
 * Processes animation events sequentially from the queue.
 * Each animation must resolve before the next one starts.
 */
export function useAnimationQueue(handler: AnimationHandler) {
  const processing = useRef(false);
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  const processQueue = useCallback(async () => {
    if (processing.current) return;
    processing.current = true;

    while (true) {
      const event = useGameStore.getState().shiftAnimation();
      if (!event) break;

      try {
        await handlerRef.current(event);
      } catch (e) {
        console.warn('Animation handler error:', e);
      }
    }

    processing.current = false;
  }, []);

  // Trigger processing whenever the queue changes
  const queueLength = useGameStore((s) => s.animationQueue.length);
  useEffect(() => {
    if (queueLength > 0) {
      processQueue();
    }
  }, [queueLength, processQueue]);
}

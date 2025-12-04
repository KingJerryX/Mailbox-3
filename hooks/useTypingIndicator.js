import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getSupabaseBrowserClient } from '../lib/supabaseClient';

export default function useTypingIndicator(chatId, currentUserId) {
  const [partnerTyping, setPartnerTyping] = useState(false);
  const channelRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const partnerTimeoutRef = useRef(null);
  const lastSentStateRef = useRef(null);

  const canUseRealtime = useMemo(() => {
    return typeof window !== 'undefined' && Boolean(chatId) && Boolean(currentUserId);
  }, [chatId, currentUserId]);

  const sendTypingEvent = useCallback(
    (isTyping, force = false) => {
      if (!channelRef.current || !currentUserId || !chatId) {
        return;
      }

      if (!force && lastSentStateRef.current === isTyping) {
        return;
      }

      channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          userId: currentUserId,
          isTyping
        }
      });

      lastSentStateRef.current = isTyping;
    },
    [chatId, currentUserId]
  );

  const handleTyping = useCallback(() => {
    if (!channelRef.current) {
      return;
    }

    sendTypingEvent(true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      sendTypingEvent(false, true);
    }, 2000);
  }, [sendTypingEvent]);

  useEffect(() => {
    if (!canUseRealtime) {
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return;
    }

    const channel = supabase.channel(`typing-room-${chatId}`, {
      config: { broadcast: { self: true } }
    });

    channelRef.current = channel;
    channel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (!payload) return;
        const { userId, isTyping } = payload;
        if (!userId || userId === currentUserId) {
          return;
        }

        setPartnerTyping(isTyping);

        if (partnerTimeoutRef.current) {
          clearTimeout(partnerTimeoutRef.current);
        }

        if (isTyping) {
          partnerTimeoutRef.current = setTimeout(() => {
            setPartnerTyping(false);
          }, 2500);
        }
      })
      .subscribe();

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (partnerTimeoutRef.current) {
        clearTimeout(partnerTimeoutRef.current);
      }
      sendTypingEvent(false, true);
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
      channelRef.current = null;
      lastSentStateRef.current = null;
      setPartnerTyping(false);
    };
  }, [canUseRealtime, chatId, currentUserId, sendTypingEvent]);

  return {
    partnerTyping,
    handleTyping
  };
}


import { useRef } from 'react';
import type { ScrollViewInstance } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

export function useScrollToTopOnFocus() {
  const ref = useRef<ScrollViewInstance>(null);
  useFocusEffect(
    useCallback(() => {
      ref.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );
  return ref;
}

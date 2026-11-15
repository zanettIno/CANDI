/**
 * ScrollView que não deixa o teclado cobrir o campo em foco.
 *
 * - KeyboardAvoidingView (padding) encolhe a área rolável para caber acima do teclado.
 *   No Android edge-to-edge (SDK 58) a janela não é redimensionada, por isso usamos
 *   'padding' nas duas plataformas. Se a janela for redimensionada, o padding calculado é 0.
 * - Quando o teclado abre (ou o usuário toca em outro campo com o teclado aberto),
 *   rolamos até o campo focado ficar visível acima do teclado.
 *
 * Uso: troque <ScrollView> por <KeyboardAwareScrollView> (aceita as mesmas props e ref).
 */
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import {
  Keyboard, KeyboardAvoidingView, Platform, ScrollView, ScrollViewProps, TextInput,
  NativeScrollEvent, NativeSyntheticEvent, StyleProp, ViewStyle, ScrollViewInstance,
} from 'react-native';

type Props = ScrollViewProps & {
  /** Espaço extra (px) entre o campo e o topo do teclado */
  extraOffset?: number;
  /** Estilo do KeyboardAvoidingView externo (padrão: flex 1) */
  containerStyle?: StyleProp<ViewStyle>;
};

const KeyboardAwareScrollView = forwardRef<ScrollViewInstance, Props>(function KeyboardAwareScrollView(
  { children, extraOffset = 32, containerStyle, onScroll, onTouchEnd, ...props },
  ref,
) {
  const scrollRef = useRef<ScrollViewInstance>(null);
  const scrollY = useRef(0);
  useImperativeHandle(ref, () => scrollRef.current as ScrollViewInstance);

  const ensureFocusedVisible = useCallback((keyboardTop?: number) => {
    // Espera o KeyboardAvoidingView aplicar o padding antes de medir/rolar
    setTimeout(() => {
      const input = TextInput.State.currentlyFocusedInput() as any;
      const top = keyboardTop ?? Keyboard.metrics()?.screenY;
      if (!input?.measureInWindow || !scrollRef.current || !top) return;
      input.measureInWindow((_x: number, y: number, _w: number, h: number) => {
        const overlap = y + h + extraOffset - top;
        if (overlap > 0) {
          scrollRef.current?.scrollTo({ y: scrollY.current + overlap, animated: true });
        }
      });
    }, 150);
  }, [extraOffset]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = Keyboard.addListener('keyboardDidShow', e => ensureFocusedVisible(e.endCoordinates.screenY));
    return () => sub.remove();
  }, [ensureFocusedVisible]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.current = e.nativeEvent.contentOffset.y;
    onScroll?.(e);
  };

  return (
    <KeyboardAvoidingView
      style={containerStyle ?? { flex: 1 }}
      behavior={Platform.OS === 'web' ? undefined : 'padding'}
    >
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        {...props}
        onScroll={handleScroll}
        onTouchEnd={e => {
          // Tocou em outro campo com o teclado já aberto: keyboardDidShow não dispara de novo
          if (Platform.OS !== 'web' && Keyboard.isVisible()) ensureFocusedVisible();
          onTouchEnd?.(e);
        }}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
});

export default KeyboardAwareScrollView;

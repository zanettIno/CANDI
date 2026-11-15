import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * true enquanto o teclado está aberto.
 * Usado para tirar o espaço da barra de navegação do Android (safe-area inferior)
 * quando o teclado já ocupa essa área, evitando um "vão" entre o teclado e o input.
 */
export function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const s1 = Keyboard.addListener(showEvt, () => setVisible(true));
    const s2 = Keyboard.addListener(hideEvt, () => setVisible(false));
    return () => { s1.remove(); s2.remove(); };
  }, []);

  return visible;
}

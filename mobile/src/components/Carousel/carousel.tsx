import * as React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Image, useWindowDimensions, Linking } from 'react-native';
import { Carousel } from 'react-native-reanimated-carousel';
import { AppTheme } from '../../theme';


export type CarouselItem = {
  title: string;
  image?: string | number; // URL remota ou require() local
  url?: string;            // se informado, abre o link ao tocar no slide
  fit?: 'cover' | 'contain'; // 'contain' mostra a imagem inteira (ex.: logos), com fundo branco
  focusY?: number;         // só p/ 'cover' com imagem local: 0 = topo, 0.5 = centro (padrão), 1 = base
};

type Props = {
  data: CarouselItem[];
  onItemPress?: (item: CarouselItem) => void;
};

// Para imagens locais com focusY, desenha a imagem na largura do slide e desloca na vertical
// (o RN não tem object-position). Sem focusY, usa o recorte central normal.
const imageStyle = (item: CarouselItem, w: number, h: number) => {
  if (item.fit === 'contain') return [styles.image, { backgroundColor: '#fff' }];
  if (item.focusY === undefined || typeof item.image !== 'number') return styles.image;
  const src = Image.resolveAssetSource(item.image);
  if (!src?.width || !src?.height) return styles.image;
  const imgH = (w * src.height) / src.width;
  if (imgH <= h) return styles.image;
  return { width: w, height: imgH, transform: [{ translateY: -(imgH - h) * item.focusY }] };
};

const CarouselComponent: React.FC<Props> = ({ data, onItemPress }) => {
  // Recalcula ao girar a tela / redimensionar (antes era fixo no carregamento do módulo)
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const itemWidth = screenWidth * 0.8;
  const itemHeight = itemWidth * 0.6;

  const renderItem = ({ item }: { item: CarouselItem }) => (
    <TouchableOpacity
      activeOpacity={item.url ? 0.8 : 1}
      onPress={() => {
        if (item.url) Linking.openURL(item.url).catch(() => {});
        onItemPress?.(item);
      }}
    >
      <View style={[styles.itemContainer, { width: itemWidth, height: itemHeight }]}>
        {item.image ? (
          <Image
            source={typeof item.image === 'string' ? { uri: item.image } : item.image}
            style={imageStyle(item, itemWidth, itemHeight)}
            resizeMode={item.fit ?? 'cover'}
          />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.title}>{item.title}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <Carousel
      loop
      style={{ width: screenWidth, height: screenHeight * 0.25 }}
      autoplay={false}
      data={data}
      animation={{ type: 'timing', duration: 500 }}
      layout={{
        type: 'parallax',
        scale: 0.9,
        adjacentScale: 0.8,
      }}
      renderItem={renderItem}
    />
  );
};

const styles = StyleSheet.create({
  itemContainer: {
    borderRadius: AppTheme.roundness,
    overflow: 'hidden',
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    backgroundColor: AppTheme.colors.placeholderBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: AppTheme.fonts.titleLarge.fontSize,
    fontFamily: AppTheme.fonts.titleLarge.fontFamily,
    fontWeight: AppTheme.fonts.titleLarge.fontWeight,
    color: AppTheme.colors.placeholderText,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
});

export default CarouselComponent;

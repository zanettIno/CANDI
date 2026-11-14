import { Dimensions } from 'react-native';

// Ajustes para celulares estreitos (320–359px de largura, ex.: iPhone SE e
// Androids compactos). Em telas maiores os valores originais são mantidos.
// O app é fixo em retrato, então a largura lida na inicialização não muda.
export const isSmallScreen = Dimensions.get('window').width < 360;

// Campos de formulário (login, cadastro, recuperação de senha...)
export const fieldMarginX = isSmallScreen ? 4 : 16;
export const fieldFontSize = isSmallScreen ? 17 : 20;

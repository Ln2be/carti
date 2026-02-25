import { colors } from '../../theme/colors';
import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';

// We extend TextProps so Typography accepts everything a normal Text component does
interface TypographyProps extends TextProps {
  variant?: 'h1' | 'h2' | 'body' | 'caption' | 'label';
  color?: string;
  style?: TextStyle | TextStyle[];
  children: React.ReactNode;
}

export const Typography = ({ 
  variant = 'body', 
  color, 
  style, 
  children, 
  ...rest // This collects numberOfLines, ellipsizeMode, etc.
}: TypographyProps) => {
  
  const getVariantStyle = (): TextStyle => {
    switch (variant) {
      case 'h1': return { fontSize: 28, fontWeight: '900', letterSpacing: 0.5 };
      case 'h2': return { fontSize: 20, fontWeight: 'bold' };
      case 'label': return { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 };
      case 'caption': return { fontSize: 10, fontWeight: '600' };
      default: return { fontSize: 16, fontWeight: '400' };
    }
  };

  return (
    <Text 
      {...rest} // Spreads all standard text props safely
      style={[
        { color: color || colors.text.primary, fontFamily: 'System' }, 
        getVariantStyle(), 
        style as TextStyle
      ]}
    >
      {children}
    </Text>
  );
};
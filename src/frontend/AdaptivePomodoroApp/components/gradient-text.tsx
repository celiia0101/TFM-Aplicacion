import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, Text, TextProps } from 'react-native';
import { DesignColors } from '@/constants/design';

// @react-native-masked-view/masked-view no renderiza bien en web: el
// elemento "máscara" (un <Text> negro) se ve directamente en vez de usarse
// solo como máscara de opacidad, dejando el texto en negro sólido. En web
// usamos el mismo truco CSS que el mockup original (background-clip: text).
export function GradientText({ style, children, ...rest }: TextProps) {
  if (Platform.OS === 'web') {
    return (
      <Text
        style={[
          style,
          {
            backgroundImage: `linear-gradient(135deg, ${DesignColors.primary}, ${DesignColors.secondary})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            color: 'transparent',
          } as any,
        ]}
        {...rest}
      >
        {children}
      </Text>
    );
  }

  return (
    <MaskedView maskElement={<Text style={style} {...rest}>{children}</Text>}>
      <LinearGradient
        colors={[DesignColors.primary, DesignColors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={[style, { opacity: 0 }]} {...rest}>
          {children}
        </Text>
      </LinearGradient>
    </MaskedView>
  );
}

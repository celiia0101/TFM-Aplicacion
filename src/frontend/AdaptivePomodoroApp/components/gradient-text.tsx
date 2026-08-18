import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, TextProps } from 'react-native';
import { DesignColors } from '@/constants/design';

export function GradientText({ style, children, ...rest }: TextProps) {
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

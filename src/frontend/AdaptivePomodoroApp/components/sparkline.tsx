import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

const WIDTH = 240;
const HEIGHT = 56;
const PADDING = 6;

function buildLinePath(values: number[]): { path: string; last: { x: number; y: number } } {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const rango = max - min || 1;
  const stepX = values.length > 1 ? (WIDTH - PADDING * 2) / (values.length - 1) : 0;

  const points = values.map((v, i) => ({
    x: PADDING + i * stepX,
    y: HEIGHT - PADDING - ((v - min) / rango) * (HEIGHT - PADDING * 2),
  }));

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  return { path, last: points[points.length - 1] };
}

export function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) {
    return <View style={{ width: WIDTH, height: HEIGHT }} />;
  }

  const { path, last } = buildLinePath(values);

  return (
    <Svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
      <Path d={path} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={last.x} cy={last.y} r={4} fill={color} />
    </Svg>
  );
}

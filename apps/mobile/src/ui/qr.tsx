import { View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import QRCodeCore from 'qrcode/lib/core/qrcode';

/** §6.4: error correction M and a quiet zone of 4 modules, black on white only. */
const QUIET = 4;

/** One SVG path for all dark modules, as on the web (apps/web/src/lib/qr.ts). */
function qrPath(text: string): { d: string; dim: number } {
  const qr = QRCodeCore.create(text, { errorCorrectionLevel: 'M' });
  const size = qr.modules.size;
  const data = qr.modules.data;
  let d = '';
  for (let y = 0; y < size; y++) {
    let x = 0;
    while (x < size) {
      if (!data[y * size + x]) {
        x++;
        continue;
      }
      let w = 1;
      while (x + w < size && data[y * size + x + w]) w++;
      d += `M${x + QUIET} ${y + QUIET}h${w}v1h-${w}z`;
      x += w;
    }
  }
  return { d, dim: size + QUIET * 2 };
}

/** A black-on-white QR of `value`, never themed (§17.2). */
export function QrCode({
  value,
  size = 220,
  label,
}: {
  value: string;
  size?: number;
  label: string;
}) {
  const { d, dim } = qrPath(value);
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      style={{ alignSelf: 'center', backgroundColor: '#FFFFFF' }}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${dim} ${dim}`}>
        <Rect width={dim} height={dim} fill="#FFFFFF" />
        <Path d={d} fill="#000000" />
      </Svg>
    </View>
  );
}

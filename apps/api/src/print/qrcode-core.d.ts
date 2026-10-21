declare module 'qrcode/lib/core/qrcode.js' {
  interface BitMatrix {
    size: number;
    data: Uint8Array;
  }
  const QRCodeCore: {
    create(
      text: string,
      options?: { errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H' },
    ): { modules: BitMatrix; version: number };
  };
  export default QRCodeCore;
}

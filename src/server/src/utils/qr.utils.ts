import { randomBytes } from 'crypto';

// Export trực tiếp hàm (không cần class)
export function generateQrCode(): string {
  const timestamp = Date.now();
  const random = randomBytes(4).toString('hex');
  return `WS-${timestamp}-${random}`;
}

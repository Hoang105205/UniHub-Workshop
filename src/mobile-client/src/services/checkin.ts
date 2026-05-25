import NetInfo from '@react-native-community/netinfo';

import {
  deletePendingByQrCode,
  getDeviceId,
  hasUnsyncedQrCode,
  initDb,
  insertPendingCheckin,
  PendingCheckinInsert,
} from './sqlite';
import { ApiOptions, postCheckIn } from './api';

const QR_REGEX = /^WS-\d{13}-[a-f0-9]{8}$/;
export interface CheckInPayload {
  qr_code: string;
  staff_id: string;
  device_id: string;
  scanned_at: number;
}

export interface CheckInApiResponse {
  status: 'ok' | 'conflict' | 'error';
  message?: string;
}

export type CheckInResult =
  | {
      ok: true;
      mode: 'online' | 'offline';
      savedLocally: boolean;
      message: string;
      localId?: number;
    }
  | {
      ok: false;
      reason: 'invalid_format' | 'duplicate_offline' | 'db_error' | 'api_error';
      message: string;
    };

export type CheckInOptions = ApiOptions;

export async function handleCheckIn(
  qrCode: string,
  staffId: string,
  options?: CheckInOptions
): Promise<CheckInResult> {
  const trimmed = qrCode.trim();
  if (!QR_REGEX.test(trimmed)) {
    return {
      ok: false,
      reason: 'invalid_format',
      message: 'Invalid QR code format.',
    };
  }

  await initDb();

  const deviceId = await getDeviceId();
  const payload: CheckInPayload = {
    qr_code: trimmed,
    staff_id: staffId,
    device_id: deviceId,
    scanned_at: Math.floor(Date.now() / 1000),
  };

  const netState = await NetInfo.fetch();
  const isOnline = Boolean(netState.isConnected) && (netState.isInternetReachable ?? true);

  if (isOnline) {
    try {
      const response = await postCheckIn(payload, options);
      if (response?.status && response.status !== 'ok') {
        return {
          ok: false,
          reason: 'api_error',
          message: response.message ?? 'Check-in failed.',
        };
      }
      await deletePendingByQrCode(trimmed);
      return {
        ok: true,
        mode: 'online',
        savedLocally: false,
        message: 'Check-in successful.',
      };
    } catch (error) {
      // Offline-to-online transition: if the online request fails, persist locally
      // so the sync service can replay it once connectivity stabilizes.
      try {
        const localId = await insertPendingCheckin(payload as PendingCheckinInsert);
        return {
          ok: true,
          mode: 'offline',
          savedLocally: true,
          message: 'Saved locally (fallback).',
          localId,
        };
      } catch (dbError) {
        return {
          ok: false,
          reason: 'db_error',
          message: 'Failed to save check-in locally.',
        };
      }
    }
  }

  const isDuplicate = await hasUnsyncedQrCode(trimmed);
  if (isDuplicate) {
    return {
      ok: false,
      reason: 'duplicate_offline',
      message: 'Already scanned while offline.',
    };
  }

  try {
    const localId = await insertPendingCheckin(payload as PendingCheckinInsert);
    return {
      ok: true,
      mode: 'offline',
      savedLocally: true,
      message: 'Saved locally.',
      localId,
    };
  } catch (dbError) {
    return {
      ok: false,
      reason: 'db_error',
      message: 'Failed to save check-in locally.',
    };
  }
}

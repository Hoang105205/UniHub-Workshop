export const MOCK_GATEWAY_QUEUE = 'payment_queue';
export const MOCK_GATEWAY_JOB = 'payment_job';

export const MOCK_GATEWAY_CONFIG_KEY = 'mock_gateway:config';
export const MOCK_GATEWAY_CIRCUIT_STATE_KEY = 'circuit:mock_gateway:state';
export const MOCK_GATEWAY_CIRCUIT_FAIL_COUNT_KEY =
  'circuit:mock_gateway:fail_count';
export const MOCK_GATEWAY_CIRCUIT_OPENED_AT_KEY =
  'circuit:mock_gateway:opened_at';
export const MOCK_GATEWAY_CIRCUIT_PROBE_LOCK_KEY =
  'circuit:mock_gateway:probe_lock';

export const MOCK_GATEWAY_DEFAULT_FAILURE_RATE = 0;
export const MOCK_GATEWAY_DEFAULT_LATENCY = 200;
export const MOCK_GATEWAY_CIRCUIT_COOLDOWN_MS = 30_000;
export const MOCK_GATEWAY_CIRCUIT_FAIL_THRESHOLD = 5;

export type MockGatewayConfigRecord = {
  failureRate: number;
  latency: number;
  updatedAt: string;
};

export type MockGatewayState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

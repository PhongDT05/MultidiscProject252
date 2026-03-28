export interface MqttTelemetryMessage {
  topic: string;
  payload: string;
  receivedAt: string;
}

interface SubscribeTelemetryHandlers {
  onMessage: (message: MqttTelemetryMessage) => void;
  onConnect?: () => void;
  onError?: (error: string) => void;
}

const isEnabled =
  import.meta.env.VITE_ENABLE_MQTT?.toString().toLowerCase() === 'true';

const brokerUrl = import.meta.env.VITE_MQTT_BROKER_URL?.toString() ?? '';

const subscribeTopics = [
  'esp32SLG4/presence',
  'esp32SLG4/mode',
  'esp32SLG4/temperate',
  'esp32SLG4/humidity',
  'esp32SLG4/light',
  'esp32SLG4/air',
  'esp32SLG4/counter',
  'esp32SLG4/alertst',
  'esp32SLG4/alertsh',
  'esp32SLG4/alertsl',
  'esp32SLG4/alertsa',
  'esp32SLG4/commands',
  'esp32SLG4/status/+',
] as const;

interface MqttClientOptions {
  clientId?: string;
  username?: string;
  password?: string;
  reconnectPeriod?: number;
  keepalive?: number;
  connectTimeout?: number;
  clean?: boolean;
}

const buildClientOptions = (): MqttClientOptions => ({
  clientId:
    import.meta.env.VITE_MQTT_CLIENT_ID?.toString() ??
    `smartlab-web-${Math.random().toString(16).slice(2, 10)}`,
  username: import.meta.env.VITE_MQTT_USERNAME?.toString(),
  password: import.meta.env.VITE_MQTT_PASSWORD?.toString(),
  reconnectPeriod: 3000,
  keepalive: 30,
  connectTimeout: 10000,
  clean: true,
});

export function mqttTelemetryEnabled() {
  return isEnabled;
}

export function subscribeMqttTelemetry(handlers: SubscribeTelemetryHandlers): () => void {
  if (!isEnabled) {
    return () => undefined;
  }

  if (!brokerUrl) {
    handlers.onError?.('MQTT is enabled but VITE_MQTT_BROKER_URL is missing.');
    return () => undefined;
  }

  let client: {
    on: (event: string, cb: (...args: unknown[]) => void) => void;
    subscribe: (
      topics: string[],
      cb: (error?: { message?: string } | null) => void,
    ) => void;
    end: (force?: boolean) => void;
  } | null = null;
  let disposed = false;

  void import('mqtt')
    .then(({ connect }) => {
      if (disposed) return;

      const nextClient = connect(brokerUrl, buildClientOptions());
      client = nextClient as unknown as typeof client;

      nextClient.on('connect', () => {
        nextClient.subscribe([...subscribeTopics], (error?: { message?: string } | null) => {
          if (error) {
            handlers.onError?.(`MQTT subscribe failed: ${error.message ?? 'unknown error'}`);
          }
        });
        handlers.onConnect?.();
      });

      nextClient.on('message', (topic: unknown, payloadBuffer: unknown) => {
        handlers.onMessage({
          topic: typeof topic === 'string' ? topic : '',
          payload:
            payloadBuffer instanceof Uint8Array
              ? new TextDecoder().decode(payloadBuffer).trim()
              : String(payloadBuffer ?? '').trim(),
          receivedAt: new Date().toISOString(),
        });
      });

      nextClient.on('error', (error: unknown) => {
        const message =
          error && typeof error === 'object' && 'message' in error
            ? String((error as { message?: unknown }).message ?? 'unknown error')
            : 'unknown error';
        handlers.onError?.(`MQTT error: ${message}`);
      });
    })
    .catch((error: unknown) => {
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String((error as { message?: unknown }).message ?? 'unknown error')
          : 'unknown error';
      handlers.onError?.(`Failed to load MQTT client: ${message}`);
    });

  return () => {
    disposed = true;
    try {
      client?.end(true);
    } catch {
      // no-op: avoid noisy shutdown exceptions during route changes/unmount
    }
  };
}

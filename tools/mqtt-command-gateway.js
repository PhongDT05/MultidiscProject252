import mqtt from 'mqtt';

const brokerUrl = process.env.GATEWAY_MQTT_BROKER_URL || process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
const subscribeTopic = process.env.GATEWAY_MQTT_SUBSCRIBE_TOPIC || 'esp32SLG4/commands';
const ackTopic = process.env.GATEWAY_MQTT_ACK_TOPIC || 'esp32SLG4/ack';

const client = mqtt.connect(brokerUrl, {
  clientId:
    process.env.GATEWAY_MQTT_CLIENT_ID ||
    `smartlab-gateway-${Math.random().toString(16).slice(2, 10)}`,
  username: process.env.GATEWAY_MQTT_USERNAME,
  password: process.env.GATEWAY_MQTT_PASSWORD,
  reconnectPeriod: 3000,
  connectTimeout: 10000,
  clean: true,
});

const validBooleanValue = '(on|off)';
const validNumberValue = '-?\\d+(?:\\.\\d+)?';
const commandPatterns = [
  new RegExp(`^mode=(auto|manual)$`, 'i'),
  new RegExp(`^exhaust=${validBooleanValue}$`, 'i'),
  new RegExp(`^cooling=${validBooleanValue}$`, 'i'),
  new RegExp(`^alarm=${validBooleanValue}$`, 'i'),
  /^light=(on|off|weak|strong)$/i,
  new RegExp(`^interval=${validNumberValue}$`, 'i'),
  new RegExp(`^temp_(min|max)=${validNumberValue}$`, 'i'),
  new RegExp(`^hum_(min|max)=${validNumberValue}$`, 'i'),
  new RegExp(`^light_(min|max)=${validNumberValue}$`, 'i'),
  new RegExp(`^air_(min|max)=${validNumberValue}$`, 'i'),
  /^show$/i,
  /^reset$/i,
];

const normalizeCommandText = (value) => value.trim().toLowerCase();

const isSupportedCommand = (command) =>
  commandPatterns.some((pattern) => pattern.test(command));

const parseCommandEnvelope = (rawPayload) => {
  const payloadText = rawPayload.trim();
  if (!payloadText) return null;

  try {
    const parsed = JSON.parse(payloadText);
    if (parsed && typeof parsed === 'object' && typeof parsed.command === 'string') {
      return {
        id: String(parsed.id || `cmd-${Date.now()}`),
        command: parsed.command.trim(),
        issuedAt: String(parsed.issuedAt || new Date().toISOString()),
        source: String(parsed.source || 'unknown'),
      };
    }
  } catch {
    // Accept plain string payloads for compatibility.
  }

  return {
    id: `cmd-${Date.now()}`,
    command: payloadText,
    issuedAt: new Date().toISOString(),
    source: 'unknown',
  };
};

const executeDeviceCommand = async (command) => {
  const normalized = normalizeCommandText(command);
  if (!isSupportedCommand(normalized)) {
    throw new Error(`Unsupported command format: ${command}`);
  }

  // Replace this with your real device bridge implementation:
  // - serial (UART/RS485)
  // - Modbus TCP/RTU
  // - proprietary SDK over TCP
  // - GPIO controller service
  console.log(`[gateway] Execute command on local devices: ${normalized}`);
  return { ok: true, message: 'Command forwarded to local device bridge.' };
};

const publishAck = (envelope, result, errorMessage) => {
  const ack = {
    id: envelope?.id || `ack-${Date.now()}`,
    command: envelope?.command || '',
    source: 'smartlab-gateway',
    receivedAt: new Date().toISOString(),
    ok: Boolean(result?.ok) && !errorMessage,
    detail: errorMessage || result?.message || null,
  };

  client.publish(ackTopic, JSON.stringify(ack), { qos: 1, retain: false }, (error) => {
    if (error) {
      console.error('[gateway] Failed to publish ack:', error.message);
      return;
    }
    console.log(`[gateway] Ack published to ${ackTopic}:`, ack);
  });
};

client.on('connect', () => {
  console.log(`[gateway] Connected to MQTT broker: ${brokerUrl}`);
  client.subscribe(subscribeTopic, { qos: 1 }, (error) => {
    if (error) {
      console.error('[gateway] Subscribe failed:', error.message);
      return;
    }
    console.log(`[gateway] Subscribed to topic: ${subscribeTopic}`);
  });
});

client.on('message', async (_topic, payloadBuffer) => {
  const payloadText = payloadBuffer.toString('utf8');
  const envelope = parseCommandEnvelope(payloadText);

  if (!envelope || !envelope.command) {
    console.warn('[gateway] Ignored empty/invalid command payload:', payloadText);
    return;
  }

  try {
    const result = await executeDeviceCommand(envelope.command);
    publishAck(envelope, result, null);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown command execution error';
    console.error('[gateway] Command execution failed:', message);
    publishAck(envelope, null, message);
  }
});

client.on('reconnect', () => {
  console.log('[gateway] Reconnecting...');
});

client.on('error', (error) => {
  console.error('[gateway] MQTT error:', error.message);
});

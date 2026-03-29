/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_BACKEND_API?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_ENABLE_MQTT?: string;
  readonly VITE_MQTT_BROKER_URL?: string;
  readonly VITE_MQTT_CLIENT_ID?: string;
  readonly VITE_MQTT_USERNAME?: string;
  readonly VITE_MQTT_PASSWORD?: string;
  readonly VITE_MQTT_LAB_ID?: string;
  readonly VITE_MQTT_TEMP_EPSILON?: string;
  readonly VITE_MQTT_HUMIDITY_EPSILON?: string;
  readonly VITE_MQTT_LIGHT_EPSILON?: string;
  readonly VITE_MQTT_AIR_EPSILON?: string;
  readonly VITE_ENABLE_SIMULATOR?: string;
  readonly VITE_AUDIT_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

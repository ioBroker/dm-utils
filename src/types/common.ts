export type ApiVersion = "v1";

export type DeviceStatus =
    | "connected"
    | "disconnected"
    | {
          /**
           * This can either be the name of a font awesome icon (e.g. "fa-signal") or the URL to an icon.
           */
          icon?: string;
          // eslint-disable-next-line @typescript-eslint/ban-types
          battery?: number | boolean| "charging" | string; // in percent (0-100), or string 'charging',
                                                                // or string '10V',
                                                                // or string '10mV',
                                                                // or string '100' in mV
                                                                // or boolean true (means OK) or false (Battery warning)
          connection: "connected" | "disconnected",
          rssi?: number; // in dBm
          warning?: ioBroker.StringOrTranslated | boolean; // warning text or just boolean true (means warning)
      };

export type DeviceRefresh = "device" | "instance" | false | true;

export type RefreshResponse = {
    refresh: DeviceRefresh;
};

export type ErrorResponse = {
    error: {
        code: number;
        message: string;
    };
};

export type RetVal<T> = T | Promise<T>;

export type JsonFormSchema = Record<string, any>; // TODO: make this better typed

export type JsonFormData = Record<string, any>;

export interface DeviceDetails {
    id: string;
    schema: JsonFormSchema;
    data?: JsonFormData;
}

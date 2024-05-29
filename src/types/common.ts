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
          battery?: number | boolean | "charging" | string; // in percent (0-100), or string 'charging',
                                                                // or string '10V',
                                                                // or string '10mV',
                                                                // or string '100' in mV
                                                                // or boolean true (means OK) or false (Battery warning)
          connection?: "connected" | "disconnected",
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

// copied from json-config
export type ConfigItemType = 'tabs' | 'panel' | 'text' | 'number' | 'color' | 'checkbox' | 'slider' | 'ip' | 'user' | 'room' | 'func' | 'select' |
    'autocomplete' | 'image' | 'objectId' | 'password' | 'instance' | 'chips' | 'alive' | 'pattern' | 'sendto' | 'setState' |
    'staticText' | 'staticLink' | 'staticImage' | 'table' | 'accordion' | 'jsonEditor' | 'language' | 'certificate' |
    'certificates' | 'certCollection' | 'custom' | 'datePicker' | 'timePicker' | 'divider' | 'header' | 'cron' |
    'fileSelector' | 'file' | 'imageSendTo' | 'selectSendTo' | 'autocompleteSendTo' | 'textSendTo' | 'coordinates' | 'interface' | 'license' |
    'checkLicense' | 'uuid' | 'port' | 'deviceManager';

// copied from json-config
export interface ConfigItemConfirmData {
    condition: string;
    text?: ioBroker.StringOrTranslated;
    title?: ioBroker.StringOrTranslated;
    ok?: ioBroker.StringOrTranslated;
    cancel?: ioBroker.StringOrTranslated;
    type?: 'info' | 'warning' | 'error' | 'none';
    alsoDependsOn?: string[];
}

type CustomCSSProperties = Record<string, any>;

// copied from json-config
export interface ConfigItem {
    type: ConfigItemType;
    sm?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
    md?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
    lg?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
    xs?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
    newLine?: boolean;
    label?: ioBroker.StringOrTranslated;
    /** @deprecated use label */
    text?: ioBroker.StringOrTranslated;
    hidden?: string | boolean;
    hideOnlyControl?: boolean;
    disabled?: string | boolean;
    help?: ioBroker.StringOrTranslated;
    helpLink?: string;
    style?: CustomCSSProperties;
    darkStyle?: CustomCSSProperties;
    validator?: string;
    validatorErrorText?: string;
    validatorNoSaveOnError?: boolean;
    tooltip?: ioBroker.StringOrTranslated;
    default?: boolean | number | string;
    defaultFunc?: string;
    defaultSendTo?: string;
    data?: string | number | boolean;
    jsonData?: string;
    button?: ioBroker.StringOrTranslated;
    buttonTooltip?: ioBroker.StringOrTranslated;
    buttonTooltipNoTranslation?: boolean;
    placeholder?: ioBroker.StringOrTranslated;
    noTranslation?: boolean;
    onChange?: {
        alsoDependsOn: string[];
        calculateFunc: string;
        ignoreOwnChanges?: boolean;
    };
    doNotSave?: boolean;
    noMultiEdit?: boolean;
    confirm?: ConfigItemConfirmData;
    icon?: 'auth' | 'send' | 'web' | 'warning' | 'error' | 'info' | 'search' | 'book' | 'help' | 'upload' | string;
    width?: string | number;

    // generated from alsoDependsOn
    // eslint-disable-next-line no-use-before-define
    confirmDependsOn?: ConfigItemIndexed[];
    // eslint-disable-next-line no-use-before-define
    onChangeDependsOn?: ConfigItemIndexed[];
    // eslint-disable-next-line no-use-before-define
    hiddenDependsOn?: ConfigItemIndexed[];
    // eslint-disable-next-line no-use-before-define
    labelDependsOn?: ConfigItemIndexed[];
    // eslint-disable-next-line no-use-before-define
    helpDependsOn?: ConfigItemIndexed[];
}

// copied from json-config
interface ConfigItemIndexed extends ConfigItem {
    attr?: string;
}

// copied from json-config
export interface ConfigItemPanel extends ConfigItem {
    type: 'panel' | never;
    label?: ioBroker.StringOrTranslated;
    items: Record<string, ConfigItem>;
    collapsable?: boolean;
    color?: 'primary' | 'secondary';
    innerStyle?: CustomCSSProperties;
    i18n?: boolean | string | Record<string, Record<ioBroker.Languages, string>>;
}

export type JsonFormSchema = ConfigItemPanel;

export type JsonFormData = Record<string, any>;

export interface DeviceDetails {
    id: string;
    schema: JsonFormSchema;
    data?: JsonFormData;
}

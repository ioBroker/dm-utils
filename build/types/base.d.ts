import type { ActionContext, ConfigConnectionType, DeviceDetails, ErrorResponse, MessageContext, ValueOrObject, ValueOrState, ValueOrStateOrObject } from '..';
import type { ApiVersion, DeviceId, DeviceStatus, RetVal } from './common';
type ActionType = 'api' | 'adapter';
export type Color = 'primary' | 'secondary' | (string & {});
export type ControlState = string | number | boolean | null;
/**
 * Where an action button is rendered on the device card.
 * - `footer` (default): in the button row at the bottom of the card
 * - `status`: in the status line at the top of the card, next to connection/battery
 */
export type ActionPlacement = 'footer' | 'status';
export interface ActionBase<T extends ActionType> {
    /** Unique (for this adapter) action ID. It could be the name from ACTIONS too, but in this case some predefined appearance will be applied */
    id: string;
    /**
     * This can either be base64 or the URL to an icon.
     */
    icon?: 'edit' | 'rename' | 'delete' | 'refresh' | 'newDevice' | 'new' | 'add' | 'discover' | 'search' | 'unpairDevice' | 'pairDevice' | 'identify' | 'play' | 'stop' | 'pause' | 'forward' | 'next' | 'rewind' | 'previous' | 'lamp' | 'light' | 'backlight' | 'dimmer' | 'socket' | 'settings' | 'users' | 'group' | 'user' | 'update' | 'qrcode' | 'info' | 'lines' | 'web' | 'battery' | 'batteryLow' | 'batteryAlert' | 'batteryCharging' | (string & {});
    description?: ioBroker.StringOrTranslated;
    disabled?: T extends 'api' ? boolean : never;
    color?: Color;
    backgroundColor?: Color;
    /** If true, the user will be asked for confirmation before executing the action */
    confirmation?: boolean | ioBroker.StringOrTranslated;
    /** If defined, before the action is triggered, the non-empty text or number or checkbox will be asked */
    inputBefore?: {
        /** This label will be shown for the text input */
        label: ioBroker.StringOrTranslated;
        /** This type of input will be shown. Default is type */
        type?: 'text' | 'number' | 'checkbox' | 'select' | 'slider' | 'color';
        /** If a type is "select", the options must be defined */
        options?: {
            label: ioBroker.StringOrTranslated;
            value: string;
        }[];
        /** Default value for the input */
        defaultValue?: string | number | boolean;
        /** If true, the input could be empty */
        allowEmptyValue?: boolean;
        /** Minimum value for the input (number or slider) */
        min?: number;
        /** Maximum value for the input (number or slider) */
        max?: number;
        /** Step value for the input (number or slider) */
        step?: number;
    };
    /** Timeout in ms for waiting an answer from backend */
    timeout?: number;
    /** Sx Style for button */
    style?: Record<string, unknown>;
    /** If defined, the action is rendered as a text button with this label instead of an icon button. No icon is required in this case */
    title?: ioBroker.StringOrTranslated;
    /** Type of button if the title is used */
    variant?: 'text' | 'outlined' | 'contained';
    /** Where the button is rendered. Default `footer` */
    placement?: ActionPlacement;
}
/**
 * Color of a status indicator.
 *
 * Besides `primary`, `secondary` and an explicit CSS color, the semantic tokens `ok`, `warning`,
 * `error`, `info` and `inactive` are supported. They are resolved against the current theme, so the
 * indicators look the same as the built-in ones (connection, battery, warning, update) in both the
 * light and the dark theme.
 */
export type IndicatorColor = 'ok' | 'warning' | 'error' | 'info' | 'inactive' | Color;
/**
 * One entry of the `levels` list of a status indicator.
 *
 * The first matching entry wins and its properties override the ones of the indicator itself.
 * A level matches if
 * - `value` is defined and strictly equals the current value, or
 * - `min` and/or `max` are defined and the numeric value lies within (inclusive), or
 * - neither `value`, `min` nor `max` is defined (catch-all, use it as the last entry)
 */
export interface StatusIndicatorLevel {
    /** Exact value this level applies to */
    value?: string | number | boolean;
    /** Lower bound (inclusive) for numeric values */
    min?: number;
    /** Upper bound (inclusive) for numeric values */
    max?: number;
    icon?: string;
    color?: IndicatorColor;
    text?: ioBroker.StringOrTranslated;
    tooltip?: ioBroker.StringOrTranslated;
}
/**
 * A custom indicator in the status line of a device card or in the toolbar of the instance.
 *
 * All visual properties may either be a literal value or a reference to a state/object, so the
 * indicator follows the value live without any interaction of the backend.
 */
export interface StatusIndicator {
    /** Unique ID of the indicator within the device or the instance */
    id: string;
    /**
     * Live value of the indicator. It controls the visibility (see `hideIfEmpty`), the selection of
     * `iconOn`/`colorOn`, the matching `levels` entry and — with `showValue` — the shown text.
     * If not defined, the indicator is a static icon and is always visible.
     */
    value?: ValueOrStateOrObject<string | number | boolean>;
    /** Icon: a reserved name, a `fa-*` name, a `data:image/...` string or a URL */
    icon?: ValueOrState<string>;
    /** Icon used instead of `icon` while the value is truthy */
    iconOn?: ValueOrState<string>;
    color?: ValueOrState<IndicatorColor>;
    /** Color used instead of `color` while the value is truthy */
    colorOn?: ValueOrState<IndicatorColor>;
    /** Text below the icon. Overrides `showValue` */
    text?: ValueOrStateOrObject<ioBroker.StringOrTranslated>;
    /** Show the current value as text below the icon */
    showValue?: boolean;
    /** Unit appended to the text */
    unit?: string;
    tooltip?: ioBroker.StringOrTranslated;
    /** Value ranges mapped to icon/color/text. The first match wins and overrides `icon`, `color` and `text` */
    levels?: StatusIndicatorLevel[];
    /**
     * ID of an action of the same device (`DeviceInfo.actions`) or instance (`InstanceDetails.actions`).
     * If given, the indicator becomes clickable and triggers that action with all its features
     * (`confirmation`, `inputBefore`, `url`, progress dialog, refresh handling).
     * The referenced action is not rendered a second time as a normal button.
     */
    actionId?: string;
    /**
     * Hide the indicator while the value is `undefined`, `null`, `''` or `false`. Default `true`.
     * The numeric value `0` counts as a value and stays visible.
     */
    hideIfEmpty?: boolean;
    /** Sort order within the indicator line. Default 100 */
    order?: number;
    /**
     * If true, the user can show or hide this indicator in the toolbar. The choice is stored in the
     * browser per instance. Indicators with the same `id` are configured together.
     */
    configurable?: boolean;
    /** Visibility of a configurable indicator as long as the user did not decide otherwise. Default `true` */
    defaultVisible?: boolean;
    /** Name of the indicator in the visibility settings. Falls back to `tooltip` and then to `id` */
    label?: ioBroker.StringOrTranslated;
}
export interface ChannelInfo {
    name: ioBroker.StringOrTranslated;
    description?: ioBroker.StringOrTranslated;
    /** base64 or url or name */
    icon?: string;
    /** color of name */
    color?: Color;
    /** Background color of card (you can use primary, secondary or color rgb value or hex) */
    order?: number;
    /** Sx Style for header */
    style?: Record<string, unknown>;
}
export interface ControlBaseGeneric {
    id: string;
    type: 'button' | 'switch' | 'slider' | 'select' | 'icon' | 'color' | 'text' | 'number' | 'info' | 'divider' | 'header' | 'group';
    icon?: string;
    label?: ioBroker.StringOrTranslated;
    description?: ioBroker.StringOrTranslated;
    color?: Color;
    /** Sx Style for button */
    style?: Record<string, unknown>;
    channel?: ChannelInfo;
    group?: string;
}
export interface ControlBaseButton extends ControlBaseGeneric {
    type: 'button';
    icon?: string;
    label?: ioBroker.StringOrTranslated;
    variant?: 'text' | 'outlined' | 'contained';
    color?: Color;
}
export interface ControlBaseSwitch extends ControlBaseGeneric {
    type: 'switch';
    state?: ioBroker.State;
    stateId?: string;
    icon?: string;
    iconOn?: string;
    label?: ioBroker.StringOrTranslated;
    labelOn?: ioBroker.StringOrTranslated;
    color?: Color;
    colorOn?: Color;
}
export interface ControlBaseSlider extends ControlBaseGeneric {
    id: string;
    type: 'slider';
    state?: ioBroker.State;
    stateId?: string;
    icon?: string;
    iconOn?: string;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    label?: ioBroker.StringOrTranslated;
    labelOn?: ioBroker.StringOrTranslated;
    color?: Color;
    colorOn?: Color;
    controlDelay?: number;
}
export interface ControlBaseSelect extends ControlBaseGeneric {
    id: string;
    type: 'select';
    state?: ioBroker.State;
    stateId?: string;
    icon?: string;
    label?: ioBroker.StringOrTranslated;
    color?: Color;
    options?: {
        label: ioBroker.StringOrTranslated;
        value: ControlState;
        icon?: string;
        color?: Color;
    }[];
    noTranslation?: boolean;
}
export interface ControlBaseIcon extends ControlBaseGeneric {
    type: 'icon';
    state?: ioBroker.State;
    stateId?: string;
    icon?: string;
    iconOn?: string;
    label?: ioBroker.StringOrTranslated;
    labelOn?: ioBroker.StringOrTranslated;
    variant?: 'text' | 'outlined' | 'contained';
    color?: Color;
    colorOn?: Color;
}
export interface ControlBaseText extends ControlBaseGeneric {
    type: 'color' | 'text';
    state?: ioBroker.State;
    stateId?: string;
    icon?: string;
    label?: ioBroker.StringOrTranslated;
    color?: Color;
    controlDelay?: number;
}
export interface ControlBaseNumber extends ControlBaseGeneric {
    type: 'number';
    state?: ioBroker.State;
    stateId?: string;
    icon?: string;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    label?: ioBroker.StringOrTranslated;
    color?: Color;
}
export interface ControlBaseInfo extends ControlBaseGeneric {
    id: string;
    type: 'info';
    state?: ioBroker.State;
    stateId?: string;
    icon?: string;
    iconOn?: string;
    unit?: string;
    label?: ioBroker.StringOrTranslated;
    labelOn?: ioBroker.StringOrTranslated;
    description?: ioBroker.StringOrTranslated;
    color?: Color;
    colorOn?: Color;
    noTranslation?: boolean;
    showSemicolon?: boolean;
    textFalse?: ioBroker.StringOrTranslated;
    textTrue?: ioBroker.StringOrTranslated;
}
export interface ControlBaseHeader extends ControlBaseGeneric {
    type: 'header';
    icon?: string;
    label: ioBroker.StringOrTranslated;
    description?: ioBroker.StringOrTranslated;
    color?: Color;
}
export interface ControlBaseDivider extends ControlBaseGeneric {
    type: 'divider';
    color?: Color;
}
export interface ControlBaseGroup extends ControlBaseGeneric {
    id: string;
    type: 'group';
    icon?: string;
    label?: ioBroker.StringOrTranslated;
    description?: ioBroker.StringOrTranslated;
    color?: Color;
}
export interface ControlBase extends ControlBaseGeneric {
    state?: ioBroker.State;
    stateId?: string;
    icon?: string;
    iconOn?: string;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    label?: ioBroker.StringOrTranslated;
    labelOn?: ioBroker.StringOrTranslated;
    variant?: 'text' | 'outlined' | 'contained';
    color?: Color;
    colorOn?: Color;
    noTranslation?: boolean;
    controlDelay?: number;
    options?: {
        label: ioBroker.StringOrTranslated;
        value: ControlState;
        icon?: string;
        color?: Color;
    }[];
    showSemicolon?: boolean;
    textFalse?: ioBroker.StringOrTranslated;
    textTrue?: ioBroker.StringOrTranslated;
}
export interface DeviceControl<TType extends ActionType = 'api', TId extends DeviceId = DeviceId> extends ControlBase {
    handler?: TType extends 'api' ? never : (deviceId: TId, actionId: string, state: ControlState, context: MessageContext<TId>) => RetVal<ErrorResponse | ioBroker.State>;
    getStateHandler?: TType extends 'api' ? never : (deviceId: TId, actionId: string, context: MessageContext<TId>) => RetVal<ErrorResponse | ioBroker.State>;
}
export type InstanceRefreshResponse = {
    refresh: boolean;
};
export type WithHandlerOrUrl<TType extends ActionType, THandler> = {
    handler?: TType extends 'api' ? never : THandler;
} | {
    url: ioBroker.StringOrTranslated;
};
export type InstanceAction<T extends ActionType = 'api'> = ActionBase<T> & WithHandlerOrUrl<T, (context: ActionContext, options?: Record<string, any>) => RetVal<InstanceRefreshResponse>>;
export type DeviceUpdate<T extends ActionType = 'api', TId extends DeviceId = DeviceId> = {
    update: DeviceInfo<T, TId>;
};
export type DeviceDelete<TId extends DeviceId = DeviceId> = {
    delete: TId;
};
export type DeviceRefresh = 'all' | 'devices' | 'instance' | 'none';
export type DeviceRefreshResponse<T extends ActionType = 'api', TId extends DeviceId = DeviceId> = {
    refresh: DeviceRefresh;
} | DeviceUpdate<T, TId> | DeviceDelete<TId>;
export type DeviceAction<T extends ActionType = 'api', TId extends DeviceId = DeviceId> = ActionBase<T> & WithHandlerOrUrl<T, (deviceId: TId, context: ActionContext, options?: Record<string, any>) => RetVal<DeviceRefreshResponse<'adapter', TId>>>;
export interface InstanceDetails<T extends ActionType = 'api'> {
    /** API Version: 1 - till 2025 (including), v3 - from 2026 */
    apiVersion: ApiVersion;
    actions?: InstanceAction<T>[];
    /** ID of state used for communication with GUI */
    communicationStateId?: string;
    /** Human-readable label next to the identifier */
    identifierLabel?: ioBroker.StringOrTranslated;
    /** Force the compact cards representation */
    smallCards?: boolean;
    /** Custom indicators, shown in the toolbar next to the instance actions */
    indicators?: StatusIndicator[];
}
export interface DeviceInfo<T extends ActionType = 'api', TId extends DeviceId = DeviceId> {
    /** ID of the device. Must be unique only in one adapter. Other adapters could have the same IDs */
    id: TId;
    /** Human-readable identifier of the device */
    identifier?: ValueOrObject<string>;
    /** Name of the device. It will be shown in the card header */
    name: ValueOrObject<ioBroker.StringOrTranslated>;
    /** base64 or url icon for device card */
    icon?: ValueOrState<string>;
    manufacturer?: ValueOrStateOrObject<ioBroker.StringOrTranslated>;
    model?: ValueOrStateOrObject<ioBroker.StringOrTranslated>;
    /** Color or 'primary', 'secondary' for the text in the card header */
    color?: ValueOrState<Color>;
    /** Background color of card header (you can use primary, secondary or color rgb value or hex) */
    backgroundColor?: ValueOrState<Color>;
    status?: DeviceStatus | DeviceStatus[];
    /** Custom indicators, shown in the status line of the card below the built-in status icons */
    indicators?: StatusIndicator[];
    /** Firmware/software update information for the device. If `available` is true, the GUI shows an update indicator and the device can be filtered by "update available" */
    update?: {
        /** true if an update is available for the device. Can be a literal value or read live from a state */
        available: ValueOrState<boolean>;
        /** Currently installed version */
        version?: ValueOrStateOrObject<string>;
        /** Version that is offered for installation */
        newVersion?: ValueOrStateOrObject<string>;
    };
    /** Connection type, how the device is connected */
    connectionType?: ValueOrStateOrObject<ConfigConnectionType>;
    /** If this flag is true or false, the according indication will be shown. Additionally, if ACTIONS.ENABLE_DISABLE is implemented, this action will be sent to the backend by clicking on this indication */
    enabled?: ValueOrState<boolean>;
    /** List of actions on the card */
    actions?: DeviceAction<T, TId>[];
    /** List of controls on the card. The difference of controls and actions is that the controls can show status (e.g. on/off) and can work directly with states */
    controls?: DeviceControl<T, TId>[];
    /** If true, the button `more` will be shown on the card and called `dm:deviceDetails` action to get the details  */
    hasDetails?: ValueOrStateOrObject<boolean>;
    /** Following optional information will be shown on the card directly. Do not try to show a table or other big objects on a card. It is suggested to use "state" components */
    customInfo?: DeviceDetails<TId>;
    /** Device type for grouping */
    group?: {
        key: string;
        name?: ioBroker.StringOrTranslated;
        icon?: string;
    };
}
export interface BackendToGuiCommandDeviceInfoUpdate<TId extends DeviceId = DeviceId> {
    /** Used for updating and for adding a new device */
    command: 'infoUpdate';
    /** Device ID */
    deviceId: TId;
    /** Backend can directly send new information about a device to avoid extra request from GUI */
    info?: DeviceInfo;
}
export interface BackendToGuiCommandDeviceStatusUpdate<TId extends DeviceId = DeviceId> {
    /** Status of a device was updated */
    command: 'statusUpdate';
    /** Device ID */
    deviceId: TId;
    /** Backend can directly send new status to avoid extra request from GUI */
    status?: DeviceStatus;
}
export interface BackendToGuiCommandDeviceDelete<TId extends DeviceId = DeviceId> {
    /** Device was deleted */
    command: 'delete';
    deviceId: TId;
}
export interface BackendToGuiCommandAllUpdate {
    /** Read ALL information about all devices anew */
    command: 'all';
}
export type BackendToGuiCommand<TId extends DeviceId = DeviceId> = BackendToGuiCommandDeviceInfoUpdate<TId> | BackendToGuiCommandDeviceStatusUpdate<TId> | BackendToGuiCommandDeviceDelete<TId> | BackendToGuiCommandAllUpdate;
export {};

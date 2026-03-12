import type {
    ActionContext,
    ConfigConnectionType,
    ErrorResponse,
    MessageContext,
    ValueOrObject,
    ValueOrState,
    ValueOrStateOrObject,
} from '..';
import type { ApiVersion, DeviceId, DeviceStatus, RetVal } from './common';
import { PatternControl } from '@iobroker/type-detector';

type ActionType = 'api' | 'adapter';
export type Color = 'primary' | 'secondary' | (string & {}); // color (you can use primary, secondary or color rgb value or hex)

export type ControlState = string | number | boolean | null;

/** Reserved action names */
export const ACTIONS = {
    /** This action will be called when the user clicks on the connection icon */
    STATUS: 'status',
    /** This action will be called when the user clicks on the enabled / disabled icon. The enabled/disabled icon will be shown only if the node status has the "enabled" flag set to false or true */
    ENABLE_DISABLE: 'enable/disable',
};

export interface ActionBase<T extends ActionType> {
    /** Unique (for this adapter) action ID. It could be the name from ACTIONS too, but in this case some predefined appearance will be applied */
    id: string;
    /**
     * This can either be base64 or the URL to an icon.
     */
    icon?:
        | 'edit'
        | 'rename'
        | 'delete'
        | 'refresh'
        | 'newDevice'
        | 'new'
        | 'add'
        | 'discover'
        | 'search'
        | 'unpairDevice'
        | 'pairDevice'
        | 'identify'
        | 'play'
        | 'stop'
        | 'pause'
        | 'forward'
        | 'next'
        | 'rewind'
        | 'previous'
        | 'lamp'
        | 'light'
        | 'backlight'
        | 'dimmer'
        | 'socket'
        | 'settings'
        | 'users'
        | 'group'
        | 'user'
        | 'info'
        | (string & {}); // base64 or url
    description?: ioBroker.StringOrTranslated;
    disabled?: T extends 'api' ? boolean : never;
    color?: Color;
    backgroundColor?: Color; // background color of button (you can use primary, secondary or color rgb value or hex)
    /** If true, the user will be asked for confirmation before executing the action */
    confirmation?: boolean | ioBroker.StringOrTranslated; // if type StringOrTranslated, this text will be shown in the confirmation dialog
    /** If defined, before the action is triggered, the non-empty text or number or checkbox will be asked */
    inputBefore?: {
        /** This label will be shown for the text input */
        label: ioBroker.StringOrTranslated;
        /** This type of input will be shown. Default is type */
        type?: 'text' | 'number' | 'checkbox' | 'select' | 'slider' | 'color';
        /** If a type is "select", the options must be defined */
        options?: { label: ioBroker.StringOrTranslated; value: string }[];
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
}

export interface ChannelInfo {
    name: ioBroker.StringOrTranslated;
    description?: ioBroker.StringOrTranslated;
    icon?: string; // base64 or url
    color?: Color; // color of name
    backgroundColor?: Color; // background color of card (you can use primary, secondary or color rgb value or hex)
    order?: number;
}

export interface ControlBase {
    id: string; // unique id of control for one device. Controls must be unique for one device
    type: 'button' | 'switch' | 'slider' | 'select' | 'icon' | 'color' | 'text' | 'number' | 'info';
    state?: ioBroker.State; // actual state for all types except button
    stateId?: string; // state id for all types except button. GUI will subscribe to this state, and if the state is changed, GUI will request update of control

    icon?: string; // base64 or url - icon could be by all types except select
    iconOn?: string; // base64 or url - by type button, switch, slider, icon
    min?: number; // only for slider and number
    max?: number; // only for slider and number
    step?: number; // only for slider and number
    unit?: string; // only for slider and number
    label?: ioBroker.StringOrTranslated;
    labelOn?: ioBroker.StringOrTranslated;
    description?: ioBroker.StringOrTranslated;
    color?: Color;
    colorOn?: Color;
    controlDelay?: number; // delay in ms between sending commands to the device. Only for slider or color control
    options?: { label: ioBroker.StringOrTranslated; value: ControlState; icon?: string; color?: Color }[]; // only for select
    channel?: ChannelInfo;
}

export interface DeviceControl<TType extends ActionType = 'api', TId extends DeviceId = DeviceId> extends ControlBase {
    handler?: TType extends 'api'
        ? never
        : (
              deviceId: TId,
              actionId: string,
              state: ControlState,
              context: MessageContext<TId>,
          ) => RetVal<ErrorResponse | ioBroker.State>;
    getStateHandler?: TType extends 'api'
        ? never
        : (deviceId: TId, actionId: string, context: MessageContext<TId>) => RetVal<ErrorResponse | ioBroker.State>;
}

export type InstanceRefreshResponse = {
    refresh: boolean;
};

export type WithHandlerOrUrl<TType extends ActionType, THandler> =
    | { handler?: TType extends 'api' ? never : THandler }
    | { url: ioBroker.StringOrTranslated };

export type InstanceAction<T extends ActionType = 'api'> = ActionBase<T> &
    WithHandlerOrUrl<T, (context: ActionContext, options?: Record<string, any>) => RetVal<InstanceRefreshResponse>> & {
        title: ioBroker.StringOrTranslated;
    };

export type DeviceUpdate<T extends ActionType = 'api', TId extends DeviceId = DeviceId> = {
    update: DeviceInfo<T, TId>;
};

export type DeviceDelete<TId extends DeviceId = DeviceId> = {
    delete: TId;
};

export type DeviceRefresh = 'all' | 'devices' | 'instance' | 'none';

export type DeviceRefreshResponse<T extends ActionType = 'api', TId extends DeviceId = DeviceId> =
    | {
          refresh: DeviceRefresh;
      }
    | DeviceUpdate<T, TId>
    | DeviceDelete<TId>;

export type DeviceAction<T extends ActionType = 'api', TId extends DeviceId = DeviceId> = ActionBase<T> &
    WithHandlerOrUrl<
        T,
        (
            deviceId: TId,
            context: ActionContext,
            options?: Record<string, any>,
        ) => RetVal<DeviceRefreshResponse<'adapter', TId>>
    >;

export interface InstanceDetails<T extends ActionType = 'api'> {
    /** API Version: 1 - till 2025 (including), 2 - from 2026 */
    apiVersion: ApiVersion;
    actions?: InstanceAction<T>[];
    /** ID of state used for communication with GUI */
    communicationStateId?: string;
    /** Human-readable label next to the identifier */
    identifierLabel?: ioBroker.StringOrTranslated;
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
    /** Device type for grouping */
    group?: {
        // key could be a string, divided by / to define the subgroup
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

export type BackendToGuiCommand<TId extends DeviceId = DeviceId> =
    | BackendToGuiCommandDeviceInfoUpdate<TId>
    | BackendToGuiCommandDeviceStatusUpdate<TId>
    | BackendToGuiCommandDeviceDelete<TId>
    | BackendToGuiCommandAllUpdate;

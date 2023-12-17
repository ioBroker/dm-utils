import { ActionContext, ErrorResponse, MessageContext } from "..";
import { ApiVersion, DeviceRefresh, DeviceStatus, RetVal } from "./common";

type ActionType = "api" | "adapter";
// eslint-disable-next-line @typescript-eslint/ban-types
export type Color = "primary" | "secondary" | string & {}; // color (you can use primary, secondary or color rgb value or hex)

export type ControlState = string | number | boolean | null;

export interface ActionBase<T extends ActionType> {
    id: string;
    /**
     * This can either be base64 or the URL to an icon.
     */
    icon: string; // base64 or url
    description?: ioBroker.StringOrTranslated;
    disabled?: T extends "api" ? boolean : never;
    color?: Color;
    backgroundColor?: Color; // background color of button (you can use primary, secondary or color rgb value or hex)
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
    type: "button" | "switch" | "slider" | "select" | "icon" | "color" | "text" | "number" | "info";
    state?: ioBroker.State; // actual state for all types except button
    stateId?: string; // state id for all types except button. GUI will subscribe to this state, and if state changed, GUI will request update of control

    icon?: string; // base64 or url - icon could be by all types except select
    iconOn?: string; // base64 or url - by type button, switch, slider, icon
    min?: number; // only for slider
    max?: number; // only for slider
    unit?: string; // only for slider
    label?: ioBroker.StringOrTranslated;
    labelOn?: ioBroker.StringOrTranslated;
    description?: ioBroker.StringOrTranslated;
    color?: Color;
    colorOn?: Color;
    controlDelay?: number; // delay in ms between sending commands to the device. Only for slider or color control
    options?: { label: ioBroker.StringOrTranslated, value: ControlState, icon?: string, color?: Color }[]; // only for select
    channel?: ChannelInfo;
}

export interface DeviceControl<T extends ActionType = "api"> extends ControlBase {
    handler?: T extends "api" ? never : (deviceId: string, actionId: string, state: ControlState, context: MessageContext) => RetVal<ErrorResponse | ioBroker.State>;
    getStateHandler?: T extends "api" ? never : (deviceId: string, actionId: string, context: MessageContext) => RetVal<ErrorResponse | ioBroker.State>;
}

export interface InstanceAction<T extends ActionType = "api"> extends ActionBase<T> {
    handler?: T extends "api" ? never : (context: ActionContext) => RetVal<{ refresh: boolean }>;
    title: ioBroker.StringOrTranslated;
}

export interface DeviceAction<T extends ActionType = "api"> extends ActionBase<T> {
    handler?: T extends "api"
        ? never
        : (deviceId: string, context: ActionContext) => RetVal<{ refresh: DeviceRefresh }>;
}

export interface InstanceDetails<T extends ActionType = "api"> {
    apiVersion: ApiVersion;
    actions?: InstanceAction<T>[];
}

export interface DeviceInfo<T extends ActionType = "api"> {
    id: string;
    icon?: string; // base64 or url
    manufacturer?: ioBroker.StringOrTranslated;
    model?: ioBroker.StringOrTranslated;
    color?: Color; // color of name
    backgroundColor?: Color; // background color of card (you can use primary, secondary or color rgb value or hex)
    name: ioBroker.StringOrTranslated;
    status?: DeviceStatus | DeviceStatus[];
    actions?: DeviceAction<T>[];
    controls?: DeviceControl<T>[];
    hasDetails?: boolean;
}

import type { AdapterInstance } from '@iobroker/adapter-core';
import type { ActionContext } from './ActionContext';
import type { ProgressDialog } from './ProgressDialog';
import { type ActionButton, type DeviceDetails, type DeviceId, type DeviceInfo, type DeviceStatus, type ErrorResponse, type InstanceDetails, type JsonFormData, type JsonFormSchema, type RetVal } from './types';
import type { BackendToGuiCommand, DeviceRefreshResponse, InstanceRefreshResponse } from './types/base';
import type { ProgressOptions } from './types/common';
export type DeviceLoadContext<TId extends DeviceId> = {
    addDevice(device: DeviceInfo<TId>): void;
    setTotalDevices(count: number): void;
};
export declare abstract class DeviceManagement<TAdapter extends AdapterInstance = AdapterInstance, TId extends DeviceId = string> {
    protected readonly adapter: TAdapter;
    private instanceInfo?;
    private devices?;
    private readonly communicationStateId;
    private readonly deviceLoadContexts;
    private readonly messageContexts;
    constructor(adapter: TAdapter, communicationStateId?: string | boolean);
    private ensureCommunicationState;
    protected sendCommandToGui(command: BackendToGuiCommand<TId>): Promise<void>;
    protected get log(): ioBroker.Log;
    protected getInstanceInfo(): RetVal<InstanceDetails>;
    protected abstract loadDevices(context: DeviceLoadContext<TId>): RetVal<void>;
    protected getDeviceInfo(_deviceId: TId): RetVal<DeviceInfo<TId>>;
    protected getDeviceStatus(_deviceId: TId): RetVal<DeviceStatus | DeviceStatus[]>;
    protected getDeviceDetails(id: TId): RetVal<DeviceDetails<TId> | null | {
        error: string;
    }>;
    private handleInstanceAction;
    private handleDeviceAction;
    private handleDeviceControl;
    private handleDeviceControlState;
    private onMessage;
    private handleMessage;
    private sendReply;
}
export declare class MessageContext<TId extends DeviceId> implements ActionContext {
    private readonly adapter;
    private hasOpenProgressDialog;
    private lastMessage?;
    private progressHandler?;
    constructor(msg: ioBroker.Message, adapter: AdapterInstance);
    showMessage(text: ioBroker.StringOrTranslated): Promise<void>;
    showConfirmation(text: ioBroker.StringOrTranslated): Promise<boolean>;
    showForm(schema: JsonFormSchema, options?: {
        data?: JsonFormData;
        title?: ioBroker.StringOrTranslated;
        buttons?: (ActionButton | 'apply' | 'cancel' | 'close')[];
    }): Promise<JsonFormData | undefined>;
    openProgress(title: ioBroker.StringOrTranslated, options?: ProgressOptions): Promise<ProgressDialog>;
    sendFinalResult(result: ErrorResponse | DeviceRefreshResponse<'api', TId> | InstanceRefreshResponse): void;
    sendControlResult(deviceId: TId, controlId: string, result: ErrorResponse | ioBroker.State): void;
    handleProgress(message: ioBroker.Message): void;
    private checkPreconditions;
    private send;
}

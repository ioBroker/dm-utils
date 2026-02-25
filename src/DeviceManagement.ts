import type { AdapterInstance } from '@iobroker/adapter-core';
import type { ActionContext } from './ActionContext';
import type { ProgressDialog } from './ProgressDialog';
import {
    ErrorCodes,
    type ActionBase,
    type ActionButton,
    type DeviceDetails,
    type DeviceId,
    type DeviceInfo,
    type DeviceStatus,
    type ErrorResponse,
    type InstanceDetails,
    type JsonFormData,
    type JsonFormSchema,
    type RetVal,
} from './types';
import type * as api from './types/api';
import type {
    BackendToGuiCommand,
    ControlState,
    DeviceControl,
    DeviceRefreshResponse,
    InstanceRefreshResponse,
} from './types/base';
import type { ProgressOptions, ProgressUpdate } from './types/common';

export type DeviceLoadContext<TId extends DeviceId> = {
    addDevice(device: DeviceInfo<TId>): void;
    setTotalDevices(count: number): void;
};

// Based on https://tkdodo.eu/blog/omit-for-discriminated-unions-in-type-script
type DistributiveOmit<T, K extends keyof T> = T extends any ? Omit<T, K> : never;

export abstract class DeviceManagement<
    TAdapter extends AdapterInstance = AdapterInstance,
    TId extends DeviceId = string,
> {
    private instanceInfo?: InstanceDetails;
    private devices?: Map<string, DeviceInfo<TId>>;
    private readonly communicationStateId: string;

    private readonly deviceLoadContexts = new Map<number, DeviceLoadContextImpl<TId>>();
    private readonly messageContexts = new Map<number, MessageContext<TId>>();

    constructor(
        protected readonly adapter: TAdapter,
        communicationStateId?: string | boolean,
    ) {
        adapter.on('message', this.onMessage.bind(this));
        if (communicationStateId === true) {
            // use standard ID `info.deviceManager`
            this.communicationStateId = 'info.deviceManager';
        } else if (communicationStateId) {
            this.communicationStateId = communicationStateId;
        }
        if (this.communicationStateId) {
            this.ensureCommunicationState().catch(e => this.log().error(`Cannot initialize communication state: ${e}`));
        }
    }

    private async ensureCommunicationState(): Promise<void> {
        let stateObj = await this.adapter.getObjectAsync(this.communicationStateId);
        if (!stateObj) {
            stateObj = {
                _id: this.communicationStateId,
                type: 'state',
                common: {
                    expert: true,
                    name: 'Communication with GUI for device manager',
                    type: 'string',
                    role: 'state',
                    def: '',
                    read: true,
                    write: false,
                },
                native: {},
            };
            await this.adapter.setObjectAsync(this.communicationStateId, stateObj);
        }
    }

    protected async sendCommandToGui(command: BackendToGuiCommand<TId>): Promise<void> {
        if (this.communicationStateId) {
            await this.adapter.setState(this.communicationStateId, JSON.stringify(command), true);
        } else {
            throw new Error('Communication state not found');
        }
    }

    protected get log(): ioBroker.Log {
        return this.adapter.log;
    }

    protected getInstanceInfo(): RetVal<InstanceDetails> {
        // Overload this method if your adapter does not use BackendToGui communication and States/Objects in DeviceInfo
        return { apiVersion: 'v3', communicationStateId: this.communicationStateId || undefined };
    }

    protected abstract loadDevices(context: DeviceLoadContext<TId>): RetVal<void>;

    protected getDeviceInfo(_deviceId: TId): RetVal<DeviceInfo<TId>> {
        throw new Error('Do not send "infoUpdate" or "delete" command without implementing getDeviceInfo method!');
    }

    protected getDeviceStatus(_deviceId: TId): RetVal<DeviceStatus | DeviceStatus[]> {
        throw new Error('Do not send "statusUpdate" command without implementing getDeviceStatus method!');
    }

    protected getDeviceDetails(id: TId): RetVal<DeviceDetails<TId> | null | { error: string }> {
        return { id, schema: {} as JsonFormSchema };
    }

    private handleInstanceAction(
        actionId: string,
        context?: ActionContext,
        options?: { value?: number | string | boolean; [key: string]: any },
    ): RetVal<ErrorResponse> | RetVal<InstanceRefreshResponse> {
        if (!this.instanceInfo) {
            this.log.warn(`Instance action ${actionId} was called before getInstanceInfo()`);
            return {
                error: {
                    code: ErrorCodes.E_INSTANCE_ACTION_NOT_INITIALIZED,
                    message: `Instance action ${actionId} was called before getInstanceInfo()`,
                },
            };
        }
        const action = this.instanceInfo.actions?.find(a => a.id === actionId);
        if (!action) {
            this.log.warn(`Instance action ${actionId} is unknown`);
            return {
                error: {
                    code: ErrorCodes.E_INSTANCE_ACTION_UNKNOWN,
                    message: `Instance action ${actionId} is unknown`,
                },
            };
        }
        if (!('handler' in action) || !action.handler) {
            this.log.warn(`Instance action ${actionId} is disabled because it has no handler`);
            return {
                error: {
                    code: ErrorCodes.E_INSTANCE_ACTION_NO_HANDLER,
                    message: `Instance action ${actionId} is disabled because it has no handler`,
                },
            };
        }
        return action.handler(context, options);
    }

    private handleDeviceAction(
        deviceId: TId,
        actionId: string,
        context?: ActionContext,
        options?: { value?: number | string | boolean; [key: string]: any },
    ): RetVal<ErrorResponse> | RetVal<DeviceRefreshResponse<'adapter', TId>> {
        if (!this.devices) {
            this.log.warn(`Device action ${actionId} was called before loadDevices()`);
            return {
                error: {
                    code: ErrorCodes.E_DEVICE_ACTION_NOT_INITIALIZED,
                    message: `Device action ${actionId} was called before loadDevices()`,
                },
            };
        }
        const jsonId = JSON.stringify(deviceId);
        const device = this.devices.get(jsonId);
        if (!device) {
            this.log.warn(`Device action ${actionId} was called on unknown device: ${jsonId}`);
            return {
                error: {
                    code: ErrorCodes.E_DEVICE_ACTION_DEVICE_UNKNOWN,
                    message: `Device action ${actionId} was called on unknown device: ${jsonId}`,
                },
            };
        }

        const action = device.actions?.find(a => a.id === actionId);
        if (!action) {
            this.log.warn(`Device action ${actionId} doesn't exist on device ${jsonId}`);
            return {
                error: {
                    code: ErrorCodes.E_DEVICE_ACTION_UNKNOWN,
                    message: `Device action ${actionId} doesn't exist on device ${jsonId}`,
                },
            };
        }
        if (!('handler' in action) || !action.handler) {
            this.log.warn(`Device action ${actionId} on ${jsonId} is disabled because it has no handler`);
            return {
                error: {
                    code: ErrorCodes.E_DEVICE_ACTION_NO_HANDLER,
                    message: `Device action ${actionId} on ${jsonId} is disabled because it has no handler`,
                },
            };
        }

        return action.handler(deviceId, context, options);
    }

    private handleDeviceControl(
        deviceId: TId,
        controlId: string,
        newState: ControlState,
        context?: MessageContext<TId>,
    ): RetVal<ErrorResponse | ioBroker.State> {
        if (!this.devices) {
            this.log.warn(`Device control ${controlId} was called before loadDevices()`);
            return {
                error: {
                    code: ErrorCodes.E_DEVICE_CONTROL_NOT_INITIALIZED,
                    message: `Device control ${controlId} was called before loadDevices()`,
                },
            };
        }
        const jsonId = JSON.stringify(deviceId);
        const device = this.devices.get(jsonId);
        if (!device) {
            this.log.warn(`Device control ${controlId} was called on unknown device: ${jsonId}`);
            return {
                error: {
                    code: ErrorCodes.E_DEVICE_CONTROL_DEVICE_UNKNOWN,
                    message: `Device control ${controlId} was called on unknown device: ${jsonId}`,
                },
            };
        }

        const control = device.controls?.find(a => a.id === controlId);
        if (!control) {
            this.log.warn(`Device control ${controlId} doesn't exist on device ${jsonId}`);
            return {
                error: {
                    code: ErrorCodes.E_DEVICE_CONTROL_UNKNOWN,
                    message: `Device control ${controlId} doesn't exist on device ${jsonId}`,
                },
            };
        }
        if (!control.handler) {
            this.log.warn(`Device control ${controlId} on ${jsonId} is disabled because it has no handler`);
            return {
                error: {
                    code: ErrorCodes.E_DEVICE_CONTROL_NO_HANDLER,
                    message: `Device control ${controlId} on ${jsonId} is disabled because it has no handler`,
                },
            };
        }

        return control.handler(deviceId, controlId, newState, context);
    }

    // request state of control
    private handleDeviceControlState(
        deviceId: TId,
        controlId: string,
        context?: MessageContext<TId>,
    ): RetVal<ErrorResponse | ioBroker.State> {
        if (!this.devices) {
            this.log.warn(`Device get state ${controlId} was called before loadDevices()`);
            return {
                error: {
                    code: ErrorCodes.E_DEVICE_GET_STATE_NOT_INITIALIZED,
                    message: `Device control ${controlId} was called before loadDevices()`,
                },
            };
        }
        const jsonId = JSON.stringify(deviceId);
        const device = this.devices.get(jsonId);
        if (!device) {
            this.log.warn(`Device get state ${controlId} was called on unknown device: ${jsonId}`);
            return {
                error: {
                    code: ErrorCodes.E_DEVICE_GET_STATE_DEVICE_UNKNOWN,
                    message: `Device control ${controlId} was called on unknown device: ${jsonId}`,
                },
            };
        }

        const control = device.controls?.find(a => a.id === controlId);
        if (!control) {
            this.log.warn(`Device get state ${controlId} doesn't exist on device ${jsonId}`);
            return {
                error: {
                    code: ErrorCodes.E_DEVICE_GET_STATE_UNKNOWN,
                    message: `Device control ${controlId} doesn't exist on device ${jsonId}`,
                },
            };
        }
        if (!control.getStateHandler) {
            this.log.warn(`Device get state ${controlId} on ${jsonId} is disabled because it has no handler`);
            return {
                error: {
                    code: ErrorCodes.E_DEVICE_GET_STATE_NO_HANDLER,
                    message: `Device get state ${controlId} on ${jsonId} is disabled because it has no handler`,
                },
            };
        }

        return control.getStateHandler(deviceId, controlId, context);
    }

    private onMessage(obj: ioBroker.Message): void {
        if (!obj.command.startsWith('dm:')) {
            return;
        }
        void this.handleMessage(obj).catch(this.log.error);
    }

    private async handleMessage(msg: ioBroker.Message): Promise<void> {
        this.log.debug(`DeviceManagement received: ${JSON.stringify(msg)}`);
        switch (msg.command) {
            case 'dm:instanceInfo': {
                this.instanceInfo = await this.getInstanceInfo();
                this.sendReply<api.InstanceDetails>(
                    { ...this.instanceInfo, actions: convertActions(this.instanceInfo.actions) },
                    msg,
                );
                return;
            }
            case 'dm:loadDevices': {
                const context = new DeviceLoadContextImpl<TId>(msg, this.adapter);
                this.deviceLoadContexts.set(msg._id, context);
                await this.loadDevices(context);
                if (context.complete()) {
                    this.deviceLoadContexts.delete(msg._id);
                }

                this.devices = context.devices.reduce((map, value) => {
                    const jsonId = JSON.stringify(value.id);
                    if (map.has(jsonId)) {
                        throw new Error(`Device ID ${jsonId} is not unique`);
                    }
                    map.set(jsonId, value);
                    return map;
                }, new Map<string, DeviceInfo<TId>>());
                return;
            }
            case 'dm:deviceInfo': {
                const deviceInfo = await this.getDeviceInfo(msg.message as TId);
                this.sendReply<api.DeviceInfo>(
                    {
                        ...deviceInfo,
                        actions: convertActions(deviceInfo.actions),
                        controls: convertControls(deviceInfo.controls),
                    },
                    msg,
                );
                return;
            }
            case 'dm:deviceStatus': {
                const deviceStatus = await this.getDeviceStatus(msg.message as TId);
                this.sendReply<DeviceStatus | DeviceStatus[]>(deviceStatus, msg);
                return;
            }
            case 'dm:deviceDetails': {
                const details = await this.getDeviceDetails(msg.message as TId);
                this.sendReply<DeviceDetails | { error: string }>(details, msg);
                return;
            }
            case 'dm:instanceAction': {
                const action = msg.message as { actionId: string; value: number | string | boolean };
                const context = new MessageContext(msg, this.adapter);
                this.messageContexts.set(msg._id, context);
                const result = await this.handleInstanceAction(action.actionId, context, { value: action.value });
                this.messageContexts.delete(msg._id);
                context.sendFinalResult(result);
                return;
            }
            case 'dm:deviceAction': {
                const action = msg.message as { actionId: string; deviceId: TId; value: number | string | boolean };
                const context = new MessageContext(msg, this.adapter);
                this.messageContexts.set(msg._id, context);
                const result = await this.handleDeviceAction(action.deviceId, action.actionId, context, {
                    value: action.value,
                });
                this.messageContexts.delete(msg._id);
                if ('update' in result) {
                    // special handling for update responses (we need to update our cache and convert actions/controls before sending to GUI)
                    const update = result.update;
                    this.devices?.set(JSON.stringify(update.id), update);
                    context.sendFinalResult({
                        update: {
                            ...update,
                            actions: convertActions(update.actions),
                            controls: convertControls(update.controls),
                        },
                    });
                } else {
                    context.sendFinalResult(result);
                }
                return;
            }
            case 'dm:deviceControl': {
                const control = msg.message as { deviceId: TId; controlId: string; state: ControlState };
                const context = new MessageContext(msg, this.adapter);
                this.messageContexts.set(msg._id, context);
                const result = await this.handleDeviceControl(
                    control.deviceId,
                    control.controlId,
                    control.state,
                    context,
                );
                this.messageContexts.delete(msg._id);
                context.sendControlResult(control.deviceId, control.controlId, result);
                return;
            }

            case 'dm:deviceControlState': {
                const control = msg.message as { deviceId: TId; controlId: string };
                const context = new MessageContext(msg, this.adapter);
                this.messageContexts.set(msg._id, context);
                const result = await this.handleDeviceControlState(control.deviceId, control.controlId, context);
                this.messageContexts.delete(msg._id);
                context.sendControlResult(control.deviceId, control.controlId, result);
                return;
            }
            case 'dm:deviceLoadProgress': {
                const { origin } = msg.message as { origin: number };
                const context = this.deviceLoadContexts.get(origin);
                if (!context) {
                    this.log.warn(`Unknown message origin: ${origin}`);
                    this.sendReply({ error: 'Unknown load progress origin' }, msg);
                    return;
                }

                if (context.handleProgress(msg)) {
                    this.deviceLoadContexts.delete(origin);
                }
                return;
            }
            case 'dm:actionProgress': {
                const { origin } = msg.message as { origin: number };
                const context = this.messageContexts.get(origin);
                if (!context) {
                    this.log.warn(`Unknown message origin: ${origin}`);
                    this.sendReply({ error: 'Unknown action origin' }, msg);
                    return;
                }

                context.handleProgress(msg);
                return;
            }
        }
    }

    private sendReply<T>(reply: T, msg: ioBroker.Message): void {
        this.adapter.sendTo(msg.from, msg.command, reply, msg.callback);
    }
}

class DeviceLoadContextImpl<TId extends DeviceId> implements DeviceLoadContext<TId> {
    private readonly minBatchSize = 8;
    public readonly devices: DeviceInfo<TId>[] = [];
    private readonly id: number;
    private sendNext: api.DeviceInfo[] = [];
    private totalDevices?: number;
    private completed = false;
    private respondTo?: ioBroker.Message;

    constructor(
        msg: ioBroker.Message,
        private readonly adapter: AdapterInstance,
    ) {
        this.respondTo = msg;
        this.id = msg._id;
    }

    addDevice(device: DeviceInfo<TId>): void {
        this.devices.push(device);
        this.sendNext.push({
            ...device,
            actions: convertActions(device.actions),
            controls: convertControls(device.controls),
        });
        this.flush();
    }

    setTotalDevices(count: number): void {
        this.totalDevices = count;
        this.flush();
    }

    complete(): boolean {
        this.completed = true;
        return this.flush();
    }

    handleProgress(message: ioBroker.Message): boolean {
        this.respondTo = message;
        return this.flush();
    }

    private flush(): boolean {
        if (this.sendNext.length <= this.minBatchSize && !this.completed) {
            return false;
        }

        if (!this.respondTo) {
            return false;
        }

        const reply: api.DeviceLoadIncrement = {
            add: this.sendNext,
            total: this.totalDevices,
            next: this.completed ? undefined : { origin: this.id },
        };
        this.sendNext = [];

        const msg = this.respondTo;
        this.respondTo = undefined;
        this.adapter.sendTo(msg.from, msg.command, reply, msg.callback);
        return this.completed;
    }
}

export class MessageContext<TId extends DeviceId> implements ActionContext {
    private hasOpenProgressDialog = false;
    private lastMessage?: ioBroker.Message;
    private progressHandler?: (message: Record<string, any>) => void;

    constructor(
        msg: ioBroker.Message,
        private readonly adapter: AdapterInstance,
    ) {
        this.lastMessage = msg;
    }

    showMessage(text: ioBroker.StringOrTranslated): Promise<void> {
        this.checkPreconditions();
        const promise = new Promise<void>(resolve => {
            this.progressHandler = () => resolve();
        });
        this.send({ type: 'message', message: text });
        return promise;
    }

    showConfirmation(text: ioBroker.StringOrTranslated): Promise<boolean> {
        this.checkPreconditions();
        const promise = new Promise<boolean>(resolve => {
            this.progressHandler = msg => resolve(!!msg.confirm);
        });
        this.send({ type: 'confirm', confirm: text });
        return promise;
    }

    showForm(
        schema: JsonFormSchema,
        options?: {
            data?: JsonFormData;
            title?: ioBroker.StringOrTranslated;
            buttons?: (ActionButton | 'apply' | 'cancel' | 'close')[];
        },
    ): Promise<JsonFormData | undefined> {
        this.checkPreconditions();
        const promise = new Promise<JsonFormData | undefined>(resolve => {
            this.progressHandler = msg => resolve(msg.data);
        });
        this.send({
            type: 'form',
            form: { schema, ...options },
        });
        return promise;
    }

    openProgress(title: ioBroker.StringOrTranslated, options?: ProgressOptions): Promise<ProgressDialog> {
        this.checkPreconditions();
        this.hasOpenProgressDialog = true;
        const dialog: ProgressDialog = {
            update: (update: ProgressUpdate) => {
                const promise = new Promise<void>(resolve => {
                    this.progressHandler = () => resolve();
                });
                this.send({ type: 'progress', progress: update }, true);
                return promise;
            },

            close: () => {
                const promise = new Promise<void>(resolve => {
                    this.progressHandler = () => {
                        this.hasOpenProgressDialog = false;
                        resolve();
                    };
                });
                this.send({ type: 'progress', progress: { open: false } });
                return promise;
            },
        };

        const promise = new Promise<ProgressDialog>(resolve => {
            this.progressHandler = () => resolve(dialog);
        });
        this.send({ type: 'progress', progress: { title, ...options, open: true } }, true);
        return promise;
    }

    sendFinalResult(result: ErrorResponse | DeviceRefreshResponse<'api', TId> | InstanceRefreshResponse): void {
        this.send({ type: 'result', result });
    }

    sendControlResult(deviceId: TId, controlId: string, result: ErrorResponse | ioBroker.State): void {
        if (typeof result === 'object' && 'error' in result) {
            this.send({
                type: 'result',
                result: {
                    error: result.error,
                    deviceId,
                    controlId,
                },
            });
        } else {
            this.send({
                type: 'result',
                result: {
                    state: result,
                    deviceId,
                    controlId,
                },
            });
        }
    }

    handleProgress(message: ioBroker.Message): void {
        const currentHandler = this.progressHandler;
        if (currentHandler && typeof message.message !== 'string') {
            this.lastMessage = message;
            this.progressHandler = undefined;
            currentHandler(message.message);
        }
    }

    private checkPreconditions(): void {
        if (this.hasOpenProgressDialog) {
            throw new Error(
                "Can't show another dialog while a progress dialog is open. Please call 'close()' on the dialog before opening another dialog.",
            );
        }
    }

    private send(
        message: DistributiveOmit<api.DmActionResponse | api.DmControlResponse, 'origin'>,
        doNotClose?: boolean,
    ): void {
        if (!this.lastMessage) {
            throw new Error("No outstanding message, can't send a new one");
        }
        this.adapter.sendTo(
            this.lastMessage.from,
            this.lastMessage.command,
            {
                ...message,
                origin: this.lastMessage.message.origin || this.lastMessage._id,
            },
            this.lastMessage.callback,
        );
        if (!doNotClose) {
            // "progress" is exception. It will be closed with "close" flag
            this.lastMessage = undefined;
        }
    }
}

function convertActions<T extends ActionBase, U extends api.ActionBase>(actions?: T[]): undefined | U[] {
    if (!actions) {
        return undefined;
    }

    // detect duplicate IDs
    const ids = new Set<string>();

    actions.forEach(a => {
        if (ids.has(a.id)) {
            throw new Error(`Action ID ${a.id} is used twice, this would lead to unexpected behavior`);
        }
        ids.add(a.id);
    });

    // remove handler function to send it as JSON
    return actions.map((a: any) => ({ ...a, handler: undefined, disabled: !a.handler && !a.url }));
}

function convertControls<T extends DeviceControl<'adapter'>, U extends DeviceControl<'api'>>(
    controls?: T[],
): undefined | U[] {
    if (!controls) {
        return undefined;
    }

    // detect duplicate IDs
    const ids = new Set<string>();

    controls.forEach(a => {
        if (ids.has(a.id)) {
            throw new Error(`Control ID ${a.id} is used twice, this would lead to unexpected behavior`);
        }
        ids.add(a.id);
    });

    // remove handler function to send it as JSON
    return controls.map((a: any) => ({ ...a, handler: undefined, getStateHandler: undefined }));
}

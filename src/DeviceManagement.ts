import type { AdapterInstance } from '@iobroker/adapter-core';
import type { ActionContext } from './ActionContext';
import type { ProgressDialog } from './ProgressDialog';
import {
    type ActionBase,
    type DeviceDetails,
    type DeviceInfo,
    type ErrorResponse,
    type InstanceDetails,
    type JsonFormData,
    type JsonFormSchema,
    type RefreshResponse,
    type RetVal,
    type ActionButton,
    ErrorCodes,
} from './types';
import type * as api from './types/api';
import { BackendToGuiCommand, ControlState, DeviceControl } from './types/base';

export abstract class DeviceManagement<T extends AdapterInstance = AdapterInstance> {
    private instanceInfo?: InstanceDetails;
    private devices?: Map<string, DeviceInfo>;
    private readonly communicationStateId: string;

    private readonly contexts = new Map<number, MessageContext>();

    constructor(
        protected readonly adapter: T,
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

    protected async sendCommandToGui(command: BackendToGuiCommand): Promise<void> {
        if (this.communicationStateId) {
            this.adapter.setStateAsync(this.communicationStateId, JSON.stringify(command), true);
        } else {
            throw new Error('Communication state not found');
        }
    }

    protected get log(): ioBroker.Log {
        return this.adapter.log;
    }

    protected getInstanceInfo(): RetVal<InstanceDetails> {
        // Overload this method if your adapter does not use BackendToGui communication and States/Objects in DeviceInfo
        return { apiVersion: 'v2', communicationStateId: this.communicationStateId || undefined };
    }

    protected abstract listDevices(): RetVal<DeviceInfo[]>;

    protected getDeviceDetails(id: string): RetVal<DeviceDetails | null | { error: string }> {
        return { id, schema: {} as JsonFormSchema };
    }

    protected handleInstanceAction(
        actionId: string,
        context?: ActionContext,
        options?: { value?: number | string | boolean; [key: string]: any },
    ): RetVal<ErrorResponse> | RetVal<RefreshResponse> {
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
        if (!action.handler) {
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

    protected handleDeviceAction(
        deviceId: string,
        actionId: string,
        context?: ActionContext,
        options?: { value?: number | string | boolean; [key: string]: any },
    ): RetVal<ErrorResponse> | RetVal<RefreshResponse> {
        if (!this.devices) {
            this.log.warn(`Device action ${actionId} was called before listDevices()`);
            return {
                error: {
                    code: ErrorCodes.E_DEVICE_ACTION_NOT_INITIALIZED,
                    message: `Device action ${actionId} was called before listDevices()`,
                },
            };
        }
        const device = this.devices.get(deviceId);
        if (!device) {
            this.log.warn(`Device action ${actionId} was called on unknown device: ${deviceId}`);
            return {
                error: {
                    code: ErrorCodes.E_DEVICE_ACTION_DEVICE_UNKNOWN,
                    message: `Device action ${actionId} was called on unknown device: ${deviceId}`,
                },
            };
        }

        const action = device.actions?.find(a => a.id === actionId);
        if (!action) {
            this.log.warn(`Device action ${actionId} doesn't exist on device ${deviceId}`);
            return {
                error: {
                    code: ErrorCodes.E_DEVICE_ACTION_UNKNOWN,
                    message: `Device action ${actionId} doesn't exist on device ${deviceId}`,
                },
            };
        }
        if (!action.handler) {
            this.log.warn(`Device action ${actionId} on ${deviceId} is disabled because it has no handler`);
            return {
                error: {
                    code: ErrorCodes.E_DEVICE_ACTION_NO_HANDLER,
                    message: `Device action ${actionId} on ${deviceId} is disabled because it has no handler`,
                },
            };
        }

        return action.handler(deviceId, context, options);
    }

    protected handleDeviceControl(
        deviceId: string,
        controlId: string,
        newState: ControlState,
        context?: MessageContext,
    ): RetVal<ErrorResponse | ioBroker.State> {
        if (!this.devices) {
            this.log.warn(`Device control ${controlId} was called before listDevices()`);
            return {
                error: {
                    code: ErrorCodes.E_DEVICE_CONTROL_NOT_INITIALIZED,
                    message: `Device control ${controlId} was called before listDevices()`,
                },
            };
        }
        const device = this.devices.get(deviceId);
        if (!device) {
            this.log.warn(`Device control ${controlId} was called on unknown device: ${deviceId}`);
            return {
                error: {
                    code: ErrorCodes.E_DEVICE_CONTROL_DEVICE_UNKNOWN,
                    message: `Device control ${controlId} was called on unknown device: ${deviceId}`,
                },
            };
        }

        const control = device.controls?.find(a => a.id === controlId);
        if (!control) {
            this.log.warn(`Device control ${controlId} doesn't exist on device ${deviceId}`);
            return {
                error: {
                    code: ErrorCodes.E_DEVICE_CONTROL_UNKNOWN,
                    message: `Device control ${controlId} doesn't exist on device ${deviceId}`,
                },
            };
        }
        if (!control.handler) {
            this.log.warn(`Device control ${controlId} on ${deviceId} is disabled because it has no handler`);
            return {
                error: {
                    code: ErrorCodes.E_DEVICE_CONTROL_NO_HANDLER,
                    message: `Device control ${controlId} on ${deviceId} is disabled because it has no handler`,
                },
            };
        }

        return control.handler(deviceId, controlId, newState, context);
    }

    // request state of control
    protected handleDeviceControlState(
        deviceId: string,
        controlId: string,
        context?: MessageContext,
    ): RetVal<ErrorResponse | ioBroker.State> {
        if (!this.devices) {
            this.log.warn(`Device get state ${controlId} was called before listDevices()`);
            return {
                error: {
                    code: ErrorCodes.E_DEVICE_GET_STATE_NOT_INITIALIZED,
                    message: `Device control ${controlId} was called before listDevices()`,
                },
            };
        }
        const device = this.devices.get(deviceId);
        if (!device) {
            this.log.warn(`Device get state ${controlId} was called on unknown device: ${deviceId}`);
            return {
                error: {
                    code: ErrorCodes.E_DEVICE_GET_STATE_DEVICE_UNKNOWN,
                    message: `Device control ${controlId} was called on unknown device: ${deviceId}`,
                },
            };
        }

        const control = device.controls?.find(a => a.id === controlId);
        if (!control) {
            this.log.warn(`Device get state ${controlId} doesn't exist on device ${deviceId}`);
            return {
                error: {
                    code: ErrorCodes.E_DEVICE_GET_STATE_UNKNOWN,
                    message: `Device control ${controlId} doesn't exist on device ${deviceId}`,
                },
            };
        }
        if (!control.getStateHandler) {
            this.log.warn(`Device get state ${controlId} on ${deviceId} is disabled because it has no handler`);
            return {
                error: {
                    code: ErrorCodes.E_DEVICE_GET_STATE_NO_HANDLER,
                    message: `Device get state ${controlId} on ${deviceId} is disabled because it has no handler`,
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
                    { ...this.instanceInfo, actions: this.convertActions(this.instanceInfo.actions) },
                    msg,
                );
                return;
            }
            case 'dm:listDevices': {
                const deviceList = await this.listDevices();

                this.devices = deviceList.reduce((map, value) => {
                    if (map.has(value.id)) {
                        throw new Error(`Device ID ${value.id} is not unique`);
                    }
                    map.set(value.id, value);
                    return map;
                }, new Map<string, DeviceInfo>());

                const apiDeviceList: api.DeviceInfo[] = deviceList.map(d => ({
                    ...d,
                    actions: this.convertActions(d.actions),
                    controls: this.convertControls(d.controls),
                }));

                this.sendReply<api.DeviceInfo[]>(apiDeviceList, msg);
                this.adapter.sendTo(msg.from, msg.command, this.devices, msg.callback);
                return;
            }
            case 'dm:deviceDetails': {
                const details = await this.getDeviceDetails(msg.message as string);
                this.adapter.sendTo(msg.from, msg.command, details, msg.callback);
                return;
            }
            case 'dm:instanceAction': {
                const action = msg.message as { actionId: string; value: number | string | boolean };
                const context = new MessageContext(msg, this.adapter);
                this.contexts.set(msg._id, context);
                const result = await this.handleInstanceAction(action.actionId, context, { value: action.value });
                this.contexts.delete(msg._id);
                context.sendFinalResult(result);
                return;
            }
            case 'dm:deviceAction': {
                const action = msg.message as { actionId: string; deviceId: string; value: number | string | boolean };
                const context = new MessageContext(msg, this.adapter);
                this.contexts.set(msg._id, context);
                const result = await this.handleDeviceAction(action.deviceId, action.actionId, context, {
                    value: action.value,
                });
                this.contexts.delete(msg._id);
                context.sendFinalResult(result);
                return;
            }
            case 'dm:deviceControl': {
                const control = msg.message as { deviceId: string; controlId: string; state: ControlState };
                const context = new MessageContext(msg, this.adapter);
                this.contexts.set(msg._id, context);
                const result = await this.handleDeviceControl(
                    control.deviceId,
                    control.controlId,
                    control.state,
                    context,
                );
                this.contexts.delete(msg._id);
                context.sendControlResult(control.deviceId, control.controlId, result);
                return;
            }

            case 'dm:deviceControlState': {
                const control = msg.message as { deviceId: string; controlId: string };
                const context = new MessageContext(msg, this.adapter);
                this.contexts.set(msg._id, context);
                const result = await this.handleDeviceControlState(control.deviceId, control.controlId, context);
                this.contexts.delete(msg._id);
                context.sendControlResult(control.deviceId, control.controlId, result);
                return;
            }
            case 'dm:actionProgress': {
                const { origin } = msg.message as { origin: number };
                const context = this.contexts.get(origin);
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

    private convertActions<T extends ActionBase, U extends api.ActionBase>(actions?: T[]): undefined | U[] {
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
        return actions.map((a: any) => ({ ...a, handler: undefined, disabled: !a.handler }));
    }

    private convertControls<T extends DeviceControl<'adapter'>, U extends DeviceControl<'api'>>(
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

    private sendReply<T>(reply: T, msg: ioBroker.Message): void {
        this.adapter.sendTo(msg.from, msg.command, reply, msg.callback);
    }
}

export class MessageContext implements ActionContext {
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
        this.send('message', {
            message: text,
        });
        return promise;
    }

    showConfirmation(text: ioBroker.StringOrTranslated): Promise<boolean> {
        this.checkPreconditions();
        const promise = new Promise<boolean>(resolve => {
            this.progressHandler = msg => resolve(!!msg.confirm);
        });
        this.send('confirm', {
            confirm: text,
        });
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
        this.send('form', {
            form: { schema, ...options },
        });
        return promise;
    }

    openProgress(
        title: string,
        options?: { indeterminate?: boolean; value?: number; label?: string },
    ): Promise<ProgressDialog> {
        this.checkPreconditions();
        this.hasOpenProgressDialog = true;
        const dialog: ProgressDialog = {
            update: (update: { title?: string; indeterminate?: boolean; value?: number; label?: string }) => {
                const promise = new Promise<void>(resolve => {
                    this.progressHandler = () => resolve();
                });
                this.send(
                    'progress',
                    {
                        progress: { title, ...options, ...update, open: true },
                    },
                    true,
                );
                return promise;
            },

            close: () => {
                const promise = new Promise<void>(resolve => {
                    this.progressHandler = () => {
                        this.hasOpenProgressDialog = false;
                        resolve();
                    };
                });
                this.send('progress', {
                    progress: { open: false },
                });
                return promise;
            },
        };

        const promise = new Promise<ProgressDialog>(resolve => {
            this.progressHandler = () => resolve(dialog);
        });
        this.send(
            'progress',
            {
                progress: { title, ...options, open: true },
            },
            true,
        );
        return promise;
    }

    sendFinalResult(result: ErrorResponse | RefreshResponse): void {
        this.send('result', {
            result,
        });
    }

    sendControlResult(deviceId: string, controlId: string, result: ErrorResponse | ioBroker.State): void {
        if (typeof result === 'object' && 'error' in result) {
            this.send('result', {
                result: {
                    error: result.error,
                    deviceId,
                    controlId,
                },
            });
        } else {
            this.send('result', {
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

    private send(type: string, message: any, doNotClose?: boolean): void {
        if (!this.lastMessage) {
            throw new Error("No outstanding message, can't send a new one");
        }
        this.adapter.sendTo(
            this.lastMessage.from,
            this.lastMessage.command,
            {
                ...message,
                type,
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

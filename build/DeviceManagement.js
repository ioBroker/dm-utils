"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageContext = exports.DeviceManagement = void 0;
const types_1 = require("./types");
class DeviceManagement {
    constructor(adapter, communicationStateId) {
        this.adapter = adapter;
        this.deviceLoadContexts = new Map();
        this.messageContexts = new Map();
        adapter.on('message', this.onMessage.bind(this));
        if (communicationStateId === true) {
            // use standard ID `info.deviceManager`
            this.communicationStateId = 'info.deviceManager';
        }
        else if (communicationStateId) {
            this.communicationStateId = communicationStateId;
        }
        if (this.communicationStateId) {
            this.ensureCommunicationState().catch(e => this.log().error(`Cannot initialize communication state: ${e}`));
        }
    }
    async ensureCommunicationState() {
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
    async sendCommandToGui(command) {
        if (this.communicationStateId) {
            await this.adapter.setState(this.communicationStateId, JSON.stringify(command), true);
        }
        else {
            throw new Error('Communication state not found');
        }
    }
    get log() {
        return this.adapter.log;
    }
    getInstanceInfo() {
        // Overload this method if your adapter does not use BackendToGui communication and States/Objects in DeviceInfo
        return { apiVersion: 'v3', communicationStateId: this.communicationStateId || undefined };
    }
    getDeviceInfo(_deviceId) {
        throw new Error('Do not send "infoUpdate" or "delete" command without implementing getDeviceInfo method!');
    }
    getDeviceStatus(_deviceId) {
        throw new Error('Do not send "statusUpdate" command without implementing getDeviceStatus method!');
    }
    getDeviceDetails(id) {
        return { id, schema: {} };
    }
    handleInstanceAction(actionId, context, options) {
        var _a;
        if (!this.instanceInfo) {
            this.log.warn(`Instance action ${actionId} was called before getInstanceInfo()`);
            return {
                error: {
                    code: types_1.ErrorCodes.E_INSTANCE_ACTION_NOT_INITIALIZED,
                    message: `Instance action ${actionId} was called before getInstanceInfo()`,
                },
            };
        }
        const action = (_a = this.instanceInfo.actions) === null || _a === void 0 ? void 0 : _a.find(a => a.id === actionId);
        if (!action) {
            this.log.warn(`Instance action ${actionId} is unknown`);
            return {
                error: {
                    code: types_1.ErrorCodes.E_INSTANCE_ACTION_UNKNOWN,
                    message: `Instance action ${actionId} is unknown`,
                },
            };
        }
        if (!('handler' in action) || !action.handler) {
            this.log.warn(`Instance action ${actionId} is disabled because it has no handler`);
            return {
                error: {
                    code: types_1.ErrorCodes.E_INSTANCE_ACTION_NO_HANDLER,
                    message: `Instance action ${actionId} is disabled because it has no handler`,
                },
            };
        }
        return action.handler(context, options);
    }
    handleDeviceAction(deviceId, actionId, context, options) {
        var _a;
        if (!this.devices) {
            this.log.warn(`Device action ${actionId} was called before loadDevices()`);
            return {
                error: {
                    code: types_1.ErrorCodes.E_DEVICE_ACTION_NOT_INITIALIZED,
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
                    code: types_1.ErrorCodes.E_DEVICE_ACTION_DEVICE_UNKNOWN,
                    message: `Device action ${actionId} was called on unknown device: ${jsonId}`,
                },
            };
        }
        const action = (_a = device.actions) === null || _a === void 0 ? void 0 : _a.find(a => a.id === actionId);
        if (!action) {
            this.log.warn(`Device action ${actionId} doesn't exist on device ${jsonId}`);
            return {
                error: {
                    code: types_1.ErrorCodes.E_DEVICE_ACTION_UNKNOWN,
                    message: `Device action ${actionId} doesn't exist on device ${jsonId}`,
                },
            };
        }
        if (!('handler' in action) || !action.handler) {
            this.log.warn(`Device action ${actionId} on ${jsonId} is disabled because it has no handler`);
            return {
                error: {
                    code: types_1.ErrorCodes.E_DEVICE_ACTION_NO_HANDLER,
                    message: `Device action ${actionId} on ${jsonId} is disabled because it has no handler`,
                },
            };
        }
        return action.handler(deviceId, context, options);
    }
    handleDeviceControl(deviceId, controlId, newState, context) {
        var _a;
        if (!this.devices) {
            this.log.warn(`Device control ${controlId} was called before loadDevices()`);
            return {
                error: {
                    code: types_1.ErrorCodes.E_DEVICE_CONTROL_NOT_INITIALIZED,
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
                    code: types_1.ErrorCodes.E_DEVICE_CONTROL_DEVICE_UNKNOWN,
                    message: `Device control ${controlId} was called on unknown device: ${jsonId}`,
                },
            };
        }
        const control = (_a = device.controls) === null || _a === void 0 ? void 0 : _a.find(a => a.id === controlId);
        if (!control) {
            this.log.warn(`Device control ${controlId} doesn't exist on device ${jsonId}`);
            return {
                error: {
                    code: types_1.ErrorCodes.E_DEVICE_CONTROL_UNKNOWN,
                    message: `Device control ${controlId} doesn't exist on device ${jsonId}`,
                },
            };
        }
        if (!control.handler) {
            this.log.warn(`Device control ${controlId} on ${jsonId} is disabled because it has no handler`);
            return {
                error: {
                    code: types_1.ErrorCodes.E_DEVICE_CONTROL_NO_HANDLER,
                    message: `Device control ${controlId} on ${jsonId} is disabled because it has no handler`,
                },
            };
        }
        return control.handler(deviceId, controlId, newState, context);
    }
    // request state of control
    handleDeviceControlState(deviceId, controlId, context) {
        var _a;
        if (!this.devices) {
            this.log.warn(`Device get state ${controlId} was called before loadDevices()`);
            return {
                error: {
                    code: types_1.ErrorCodes.E_DEVICE_GET_STATE_NOT_INITIALIZED,
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
                    code: types_1.ErrorCodes.E_DEVICE_GET_STATE_DEVICE_UNKNOWN,
                    message: `Device control ${controlId} was called on unknown device: ${jsonId}`,
                },
            };
        }
        const control = (_a = device.controls) === null || _a === void 0 ? void 0 : _a.find(a => a.id === controlId);
        if (!control) {
            this.log.warn(`Device get state ${controlId} doesn't exist on device ${jsonId}`);
            return {
                error: {
                    code: types_1.ErrorCodes.E_DEVICE_GET_STATE_UNKNOWN,
                    message: `Device control ${controlId} doesn't exist on device ${jsonId}`,
                },
            };
        }
        if (!control.getStateHandler) {
            this.log.warn(`Device get state ${controlId} on ${jsonId} is disabled because it has no handler`);
            return {
                error: {
                    code: types_1.ErrorCodes.E_DEVICE_GET_STATE_NO_HANDLER,
                    message: `Device get state ${controlId} on ${jsonId} is disabled because it has no handler`,
                },
            };
        }
        return control.getStateHandler(deviceId, controlId, context);
    }
    onMessage(obj) {
        if (!obj.command.startsWith('dm:')) {
            return;
        }
        void this.handleMessage(obj).catch(this.log.error);
    }
    async handleMessage(msg) {
        var _a;
        this.log.debug(`DeviceManagement received: ${JSON.stringify(msg)}`);
        switch (msg.command) {
            case 'dm:instanceInfo': {
                this.instanceInfo = await this.getInstanceInfo();
                this.sendReply(Object.assign(Object.assign({}, this.instanceInfo), { actions: convertActions(this.instanceInfo.actions) }), msg);
                return;
            }
            case 'dm:loadDevices': {
                const context = new DeviceLoadContextImpl(msg, this.adapter);
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
                }, new Map());
                return;
            }
            case 'dm:deviceInfo': {
                const deviceInfo = await this.getDeviceInfo(msg.message);
                this.sendReply(Object.assign(Object.assign({}, deviceInfo), { actions: convertActions(deviceInfo.actions), controls: convertControls(deviceInfo.controls) }), msg);
                return;
            }
            case 'dm:deviceStatus': {
                const deviceStatus = await this.getDeviceStatus(msg.message);
                this.sendReply(deviceStatus, msg);
                return;
            }
            case 'dm:deviceDetails': {
                const details = await this.getDeviceDetails(msg.message);
                this.sendReply(details, msg);
                return;
            }
            case 'dm:instanceAction': {
                const action = msg.message;
                const context = new MessageContext(msg, this.adapter);
                this.messageContexts.set(msg._id, context);
                const result = await this.handleInstanceAction(action.actionId, context, { value: action.value });
                this.messageContexts.delete(msg._id);
                context.sendFinalResult(result);
                return;
            }
            case 'dm:deviceAction': {
                const action = msg.message;
                const context = new MessageContext(msg, this.adapter);
                this.messageContexts.set(msg._id, context);
                const result = await this.handleDeviceAction(action.deviceId, action.actionId, context, {
                    value: action.value,
                });
                this.messageContexts.delete(msg._id);
                if ('update' in result) {
                    // special handling for update responses (we need to update our cache and convert actions/controls before sending to GUI)
                    const update = result.update;
                    (_a = this.devices) === null || _a === void 0 ? void 0 : _a.set(JSON.stringify(update.id), update);
                    context.sendFinalResult({
                        update: Object.assign(Object.assign({}, update), { actions: convertActions(update.actions), controls: convertControls(update.controls) }),
                    });
                }
                else {
                    context.sendFinalResult(result);
                }
                return;
            }
            case 'dm:deviceControl': {
                const control = msg.message;
                const context = new MessageContext(msg, this.adapter);
                this.messageContexts.set(msg._id, context);
                const result = await this.handleDeviceControl(control.deviceId, control.controlId, control.state, context);
                this.messageContexts.delete(msg._id);
                context.sendControlResult(control.deviceId, control.controlId, result);
                return;
            }
            case 'dm:deviceControlState': {
                const control = msg.message;
                const context = new MessageContext(msg, this.adapter);
                this.messageContexts.set(msg._id, context);
                const result = await this.handleDeviceControlState(control.deviceId, control.controlId, context);
                this.messageContexts.delete(msg._id);
                context.sendControlResult(control.deviceId, control.controlId, result);
                return;
            }
            case 'dm:deviceLoadProgress': {
                const { origin } = msg.message;
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
                const { origin } = msg.message;
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
    sendReply(reply, msg) {
        this.adapter.sendTo(msg.from, msg.command, reply, msg.callback);
    }
}
exports.DeviceManagement = DeviceManagement;
class DeviceLoadContextImpl {
    constructor(msg, adapter) {
        this.adapter = adapter;
        this.minBatchSize = 8;
        this.devices = [];
        this.sendNext = [];
        this.completed = false;
        this.respondTo = msg;
        this.id = msg._id;
    }
    addDevice(device) {
        this.devices.push(device);
        this.sendNext.push(Object.assign(Object.assign({}, device), { actions: convertActions(device.actions), controls: convertControls(device.controls) }));
        this.flush();
    }
    setTotalDevices(count) {
        this.totalDevices = count;
        this.flush();
    }
    complete() {
        this.completed = true;
        return this.flush();
    }
    handleProgress(message) {
        this.respondTo = message;
        return this.flush();
    }
    flush() {
        if (this.sendNext.length <= this.minBatchSize && !this.completed) {
            return false;
        }
        if (!this.respondTo) {
            return false;
        }
        const reply = {
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
class MessageContext {
    constructor(msg, adapter) {
        this.adapter = adapter;
        this.hasOpenProgressDialog = false;
        this.lastMessage = msg;
    }
    showMessage(text) {
        this.checkPreconditions();
        const promise = new Promise(resolve => {
            this.progressHandler = () => resolve();
        });
        this.send({ type: 'message', message: text });
        return promise;
    }
    showConfirmation(text) {
        this.checkPreconditions();
        const promise = new Promise(resolve => {
            this.progressHandler = msg => resolve(!!msg.confirm);
        });
        this.send({ type: 'confirm', confirm: text });
        return promise;
    }
    showForm(schema, options) {
        this.checkPreconditions();
        const promise = new Promise(resolve => {
            this.progressHandler = msg => resolve(msg.data);
        });
        this.send({
            type: 'form',
            form: Object.assign({ schema }, options),
        });
        return promise;
    }
    openProgress(title, options) {
        this.checkPreconditions();
        this.hasOpenProgressDialog = true;
        const dialog = {
            update: (update) => {
                const promise = new Promise(resolve => {
                    this.progressHandler = () => resolve();
                });
                this.send({ type: 'progress', progress: update }, true);
                return promise;
            },
            close: () => {
                const promise = new Promise(resolve => {
                    this.progressHandler = () => {
                        this.hasOpenProgressDialog = false;
                        resolve();
                    };
                });
                this.send({ type: 'progress', progress: { open: false } });
                return promise;
            },
        };
        const promise = new Promise(resolve => {
            this.progressHandler = () => resolve(dialog);
        });
        this.send({ type: 'progress', progress: Object.assign(Object.assign({ title }, options), { open: true }) }, true);
        return promise;
    }
    sendFinalResult(result) {
        this.send({ type: 'result', result });
    }
    sendControlResult(deviceId, controlId, result) {
        if (typeof result === 'object' && 'error' in result) {
            this.send({
                type: 'result',
                result: {
                    error: result.error,
                    deviceId,
                    controlId,
                },
            });
        }
        else {
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
    handleProgress(message) {
        const currentHandler = this.progressHandler;
        if (currentHandler && typeof message.message !== 'string') {
            this.lastMessage = message;
            this.progressHandler = undefined;
            currentHandler(message.message);
        }
    }
    checkPreconditions() {
        if (this.hasOpenProgressDialog) {
            throw new Error("Can't show another dialog while a progress dialog is open. Please call 'close()' on the dialog before opening another dialog.");
        }
    }
    send(message, doNotClose) {
        if (!this.lastMessage) {
            throw new Error("No outstanding message, can't send a new one");
        }
        this.adapter.sendTo(this.lastMessage.from, this.lastMessage.command, Object.assign(Object.assign({}, message), { origin: this.lastMessage.message.origin || this.lastMessage._id }), this.lastMessage.callback);
        if (!doNotClose) {
            // "progress" is exception. It will be closed with "close" flag
            this.lastMessage = undefined;
        }
    }
}
exports.MessageContext = MessageContext;
function convertActions(actions) {
    if (!actions) {
        return undefined;
    }
    // detect duplicate IDs
    const ids = new Set();
    actions.forEach(a => {
        if (ids.has(a.id)) {
            throw new Error(`Action ID ${a.id} is used twice, this would lead to unexpected behavior`);
        }
        ids.add(a.id);
    });
    // remove a handler function to send it as JSON
    return actions.map((a) => (Object.assign(Object.assign({}, a), { handler: undefined, disabled: !a.handler && !a.url })));
}
function convertControls(controls) {
    if (!controls) {
        return undefined;
    }
    // detect duplicate IDs
    const ids = new Set();
    controls.forEach(a => {
        if (ids.has(a.id)) {
            throw new Error(`Control ID ${a.id} is used twice, this would lead to unexpected behavior`);
        }
        ids.add(a.id);
    });
    // remove handler function to send it as JSON
    return controls.map((a) => (Object.assign(Object.assign({}, a), { handler: undefined, getStateHandler: undefined })));
}

/// <reference types="iobroker" />
import { AdapterInstance } from "@iobroker/adapter-core";
import { ActionContext } from "./ActionContext";
import { DeviceDetails, DeviceInfo, DeviceRefresh, InstanceDetails, RetVal } from "./types";
export declare abstract class DeviceManagement<T extends AdapterInstance = AdapterInstance> {
    protected readonly adapter: T;
    private instanceInfo?;
    private devices?;
    private readonly contexts;
    constructor(adapter: T);
    protected get log(): ioBroker.Logger;
    protected getInstanceInfo(): RetVal<InstanceDetails>;
    protected abstract listDevices(): RetVal<DeviceInfo[]>;
    protected getDeviceDetails(id: string): RetVal<DeviceDetails>;
    protected handleInstanceAction(_actionId: string, _context: ActionContext): RetVal<{
        refresh: boolean;
    }>;
    protected handleDeviceAction(_deviceId: string, _actionId: string, _context: ActionContext): RetVal<{
        refresh: DeviceRefresh;
    }>;
    private onMessage;
    private handleMessage;
}

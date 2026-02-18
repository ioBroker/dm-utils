import type * as base from './base';

export type ActionBase = base.ActionBase<'api'>;
export type InstanceAction = base.InstanceAction<'api'>;
export type DeviceAction = base.DeviceAction<'api'>;
export type InstanceDetails = base.InstanceDetails<'api'>;
export type DeviceInfo = base.DeviceInfo<'api'>;
export type DeviceControl = base.DeviceControl<'api'>;
export type DeviceRefreshResponse = base.DeviceRefreshResponse<'api'>;
export type InstanceRefreshResponse = base.InstanceRefreshResponse;

export type DeviceLoadIncrement = {
    add: DeviceInfo[];
    total?: number;
    next?: { origin: number };
};

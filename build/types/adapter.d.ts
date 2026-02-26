import type * as base from './base';
import type { DeviceId } from './common';
export type ActionBase = base.ActionBase<'adapter'>;
export type InstanceAction = base.InstanceAction<'adapter'>;
export type DeviceAction<TId extends DeviceId> = base.DeviceAction<'adapter', TId>;
export type InstanceDetails = base.InstanceDetails<'adapter'>;
export type DeviceInfo<TId extends DeviceId> = base.DeviceInfo<'adapter', TId>;
export type DeviceControl<TId extends DeviceId> = base.DeviceControl<'adapter', TId>;

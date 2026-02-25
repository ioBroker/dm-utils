import type * as base from './base';
import type { ActionButton, DeviceId, ErrorResponse, JsonFormSchema, ProgressUpdate } from './common';

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

export type DmResponseBase = {
    origin: number;
};

export type DmControlResponse = DmResponseBase & {
    type: 'result';
    result: {
        deviceId: DeviceId;
        controlId: string;
    } & (
        | ErrorResponse
        | {
              state: ioBroker.State;
          }
    );
};

export type DmActionResultResponse = DmResponseBase & {
    type: 'result';
    result: ErrorResponse | DeviceRefreshResponse | InstanceRefreshResponse;
};

export type DmActionMessageResponse = DmResponseBase & {
    type: 'message';
    message: ioBroker.StringOrTranslated;
};

export type DmActionConfirmResponse = DmResponseBase & {
    type: 'confirm';
    confirm: ioBroker.StringOrTranslated;
};

export interface CommunicationForm {
    title?: ioBroker.StringOrTranslated | null | undefined;
    label?: ioBroker.StringOrTranslated | null | undefined; // same as title
    noTranslation?: boolean; // Do not translate title/label
    schema: JsonFormSchema;
    data?: Record<string, any>;
    buttons?: (ActionButton | 'apply' | 'cancel' | 'close')[];
    maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    /** Minimal width of the dialog */
    minWidth?: number;
    /** Always allow the apply button. Even when nothing was changed */
    ignoreApplyDisabled?: boolean;
}

export type DmActionFormResponse = DmResponseBase & {
    type: 'form';
    form: CommunicationForm;
};

export type DmActionProgressResponse = DmResponseBase & {
    type: 'progress';
    progress: ProgressUpdate & { open?: boolean };
};

export type DmActionResponse =
    | DmActionResultResponse
    | DmActionMessageResponse
    | DmActionConfirmResponse
    | DmActionFormResponse
    | DmActionProgressResponse;

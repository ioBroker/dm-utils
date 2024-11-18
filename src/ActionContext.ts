import type { ActionButton, JsonFormData, JsonFormSchema } from '.';
import type { ProgressDialog } from './ProgressDialog';

export interface ActionContext {
    showMessage(text: ioBroker.StringOrTranslated): Promise<void>;
    showConfirmation(text: ioBroker.StringOrTranslated): Promise<boolean>;
    showForm(
        schema: JsonFormSchema,
        options?: {
            data?: JsonFormData;
            title?: ioBroker.StringOrTranslated;
            buttons?: (ActionButton | 'apply' | 'cancel')[];
        },
    ): Promise<JsonFormData | undefined>;
    openProgress(
        title: string,
        options?: { indeterminate?: boolean; value?: number; label?: ioBroker.StringOrTranslated },
    ): Promise<ProgressDialog>;
}

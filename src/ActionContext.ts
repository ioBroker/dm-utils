import type { BackEndCommandJsonFormOptions, JsonFormData, JsonFormSchema } from '.';
import type { ProgressDialog } from './ProgressDialog';

export interface ActionContext {
    showMessage(text: ioBroker.StringOrTranslated): Promise<void>;
    showConfirmation(text: ioBroker.StringOrTranslated): Promise<boolean>;
    showForm(schema: JsonFormSchema, options?: BackEndCommandJsonFormOptions): Promise<JsonFormData | undefined>;
    openProgress(
        title: string,
        options?: { indeterminate?: boolean; value?: number; label?: ioBroker.StringOrTranslated },
    ): Promise<ProgressDialog>;
}

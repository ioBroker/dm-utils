import type { ProgressUpdate } from './types/common';
export interface ProgressDialog {
    update(update: ProgressUpdate): Promise<void>;
    close(): Promise<void>;
}

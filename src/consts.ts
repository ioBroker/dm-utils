/** Reserved action names */
export const ACTIONS = {
    /** This action will be called when the user clicks on the connection icon */
    STATUS: 'status',
    /** This action will be called when the user clicks on the enabled / disabled icon. The enabled/disabled icon will be shown only if the node status has the "enabled" flag set to false or true */
    ENABLE_DISABLE: 'enable/disable',
    /** This action will be called when the user clicks on the update indicator. The update indicator is shown only if `DeviceInfo.update.available` is true */
    UPDATE: 'update',
};

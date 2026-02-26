"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACTIONS = void 0;
/** Reserved action names */
exports.ACTIONS = {
    /** This action will be called when user clicks on connection icon */
    STATUS: 'status',
    /** This action will be called when the user clicks on enabled/disabled icon. The enabled/disabled icon will be shown only if the node status has "enabled" flag set to false or true */
    ENABLE_DISABLE: 'enable/disable',
};

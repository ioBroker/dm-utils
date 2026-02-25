# dm-utils

Utility classes for ioBroker adapters to support [ioBroker.device-manager](https://github.com/ioBroker/ioBroker.device-manager).

## How to use

Add in your `io-package.json` the property `deviceManager: true` to `common.supportedMessages`.
Note: If you don't have a `common.supportedMessages` property yet, you have to add it.
Also, if you have a `common.messagebox` property for the adapter specific messages, you can remove it and add `common.supportedMessages.custom: true`. (see
https://github.com/ioBroker/ioBroker.js-controller/blob/274f9e8f84dbdaaba9830a6cc00ddf083e989090/schemas/io-package.json#L754C104-L754C178)

In your ioBroker adapter, add a subclass of `DeviceManagement` and override the methods you need (see next chapters):

Example:

- Create a subclass:

```ts
class MyAdapterDeviceManagement extends DeviceManagement<MyAdapter> {
    // contents see in the next chapters
}
```

- Instantiate the subclass in your adapter class constructor:

```ts
class MyAdapter extends utils.Adapter {
    private readonly deviceManagement: MyAdapterDeviceManagement;

    public constructor(options: Partial<utils.AdapterOptions> = {}) {
        super({
            ...options,
            name: 'my-adapter',
        });
        this.deviceManagement = new DmTestDeviceManagement(this);

        // ... more code here
    }
}
```

## Core concepts

### Structure

In the UI, there are three levels of information:

- In the top level, a list of all adapter instances is shown (only containing adapter instances that support device management).
- Inside the adapter instance (when expanded), a list of devices is shown.
- Devices may contain additional details, which are shown when the row of the device is expanded.

### Actions

The device manager tab allows the user to interact with the adapter instance in two ways:

- Actions per instance are shown above the list and should contain actions like "Search devices" or "Pair new device".
- Actions per device are shown in the device list inside an instance and should contain actions like "Edit settings" or "Remove".

When the user clicks on an action (i.e., a button in the UI),
the `DeviceManagement` implementation's `handleXxxAction()` is called, and the adapter can perform arbitrary actions
(see below for details).

### Controls

The device manager tab allows the user to control devices too. If devices are controllable, the device manager tab shows a control elements in the device card.

When the user clicks on a control (i.e., a button in the UI),
the `DeviceManagement` implementation's `handleXxxAction()` is called, and the adapter can perform arbitrary actions
(see below for details).

### Communication

The communication between the `ioBroker.device-manager` tab and the adapter happens through `sendTo`.

**IMPORTANT:** make sure your adapter doesn't handle `sendTo` messages starting with `dm:`, otherwise the communication will not work.

- Use for Example this on the top of your onMessage Methode:

```js
if (obj.command?.startsWith('dm:')) {
    // Handled by Device Manager class itself, so ignored here
    return;
}
```

### Access adapter methods

You can access all adapter methods like `getState()` or `getStateAsync()` via `this.adapter`.  
Example: `this.getState()` -> `this.adapter.getState()`

### Error Codes

| Code | Description                                                                                                                  |
| ---- | ---------------------------------------------------------------------------------------------------------------------------- |
| 101  | Instance action ${actionId} was called before getInstanceInfo() was called. This could happen if the instance has restarted. |
| 102  | Instance action ${actionId} is unknown.                                                                                      |
| 103  | Instance action ${actionId} is disabled because it has no handler.                                                           |
| 201  | Device action ${actionId} was called before loadDevices() was called. This could happen if the instance has restarted.       |
| 202  | Device action ${actionId} was called on unknown device: ${deviceId}.                                                         |
| 203  | Device action ${actionId} doesn't exist on device ${deviceId}.                                                               |
| 204  | Device action ${actionId} on ${deviceId} is disabled because it has no handler.                                              |

## Examples

To get an idea of how to use `dm-utils`, please have a look at:

- [the folder "examples"](examples/dm-test.ts) or
- [ioBroker.dm-test](https://github.com/UncleSamSwiss/ioBroker.dm-test)

## `DeviceManagement` methods to override

All methods can either return an object of the defined value or a `Promise` resolving to the object.

This allows you to implement the method synchronously or asynchronously, depending on your implementation.

### `loadDevices(context: DeviceLoadContext)`

This method must always be overridden (as it is abstract in the base class).

You must fill the `context` with information about all devices of this adapter's instance.

You may call `context.setTotalDevices(count: number)` as soon as possible to let the GUI know how many devices in total will be loaded. This allows the GUI to show the loading progress.

This method is called when the user expands an instance in the list.

In most cases, you will get all states of your instance and fill the `context` with the relevant information.

Every item is an object of type `DeviceInfo` which has the following properties:

- `id` (JSON object): a unique identifier of the device (it must be unique for your adapter instance only)
- `identifier` (optional): a human-readable identifier of the device
- `name` (string or translations): the human-readable name of this device
- `status` (optional): the current status of the device, which has to be an object containing:
    - `connection` (string): alowed values are: `"connected"` / `"disconnected"`
    - `rssi` (number): rssi value of the connection
    - `battery` (boolean / number): if boolean: false: Battery empty. If number: battery level of the device (shows also a battery symbol at card)
    - `warning` (boolean / string): if boolean: true indicates a warning. If string: shows also the warning with mouseover
- `actions` (array, optional): an array of actions that can be performed on the device; each object contains:
    - `id` (string): unique identifier to recognize an action (never shown to the user)
    - `icon` (string): an icon shown on the button (see below for details)
    - `description` (string, optional): a text that will be shown as a tooltip on the button
    - `handler` (function, optional): function that will be called when the user clicks on the button; if not given, the button will be disabled in the UI
- `hasDetails` (boolean, optional): if set to `true`, the row of the device can be expanded and details are shown below

Possible strings for device icons are here: [TYPE ICONS](https://github.com/ioBroker/adapter-react-v5/blob/main/src/Components/DeviceType/DeviceTypeIcon.tsx#L68)
<br/>
Possible strings for action icons are here: [ACTION NAMES](https://github.com/ioBroker/dm-gui-components/blob/main/src/Utils.tsx#L128)
<br/>
Possible strings for configuration icons are here: [CONFIGURATION TYPES](https://github.com/ioBroker/dm-utils/blob/b3e54ecfaedd6a239beec59c5deb8117d1d59d7f/src/types/common.ts#L110)
<br/>

### `getInstanceInfo()`

This method allows the device manager tab to gather some general information about the instance. It is called when the user opens the tab.

If you override this method, the returned object must contain:

- `apiVersion` (string): the supported API version; must be `"v1"` or `"v2"` (if "backend to GUI communication" is used or IDs instead of values)
- `actions` (array, optional): an array of actions that can be performed on the instance; each object contains:
    - `id` (string): unique identifier to recognize an action (never shown to the user)
    - `icon` (string): an icon shown on the button (see below for details)
    - `title` (string): the title shown next to the icon on the button
    - `description` (string, optional): a text that will be shown as a tooltip on the button
    - `handler` (function, optional): function that will be called when the user clicks on the button; if not given, the button will be disabled in the UI
- `communicationStateId` (string, optional): the ID of the state that is used by backend for communication with front-end
- `identifierLabel` (string or translations, optional): the human-readable label next to the identifier

### `getDeviceDetails(id: DeviceId)`

This method is called if a device's `hasDetails` is set to `true` and the user clicks on the expander.

The returned object must contain:

- `id` (JSON object): the `id` given as parameter to the method call
- `schema` (Custom JSON form schema): the schema of the Custom JSON form to show below the device information
- `data` (object, optional): the data used to populate the Custom JSON form

For more details about the schema, see [here](https://github.com/ioBroker/ioBroker.admin/blob/master/src-rx/src/components/JsonConfigComponent/SCHEMA.md).

Please keep in mind that there is no "Save" button, so in most cases, the form shouldn't contain editable fields, but you may use `sendTo<xxx>` objects to send data to the adapter.

## `DeviceManagement` handlers

### InstanceInfo action handlers

These functions are called when the user clicks on an action (i.e., button) for an adapter instance.

The parameters of this function are:

- `context` (object): object containing helper methods that can be used when executing the action
- `options` (object): object containing the action `value` (if given)

The returned object must contain:

- `refresh` (boolean): set this to `true` if you want the list to be reloaded after this action

This method can be implemented asynchronously and can take a lot of time to complete.

See below for how to interact with the user.

### DeviceInfo action handlers

These functions are called when the user clicks on an action (i.e., button) for an adapter instance.

The parameters of this function are:

- `deviceId` (JSON object): the `id` of the device
- `context` (object): object containing helper methods that can be used when executing the action
- `options` (object): object containing the action `value` (if given)

The returned object must contain:

- `refresh` (string / boolean): the following values are allowed:
    - `"device"`: if you want the device details to be reloaded after this action
    - `"instance"`: if you want the entire device list to be reloaded after this action
    - `false`: if you don't want anything to be refreshed (important: this is a boolean, not a string!)

This method can be implemented asynchronously and can take a lot of time to complete.

See below for how to interact with the user.

### DeviceInfo control handlers

These functions are called when the user clicks on a control (i.e., slider) in the device card.

The parameters of this method are:

- `deviceId` (JSON object): the `id` that was given in `loadDevices()` --> `[].id`
- `controlId` (string): the `id` that was given in `loadDevices()` --> `[].controls[].id`. There are some reserved control names, you can find the list below.
- `newState` (string | number | boolean): new state for the control, that will be sent to a real device
- `context` (object): object containing helper methods that can be used when executing the action

The returned object must be an ioBroker state object.

This method can be implemented asynchronously and can take a lot of time to complete.

### DeviceInfo getState handlers

These functions are called when GUI requests the update of the state.

The parameters of this method are:

- `deviceId` (JSON object): the `id` that was given in `loadDevices()` --> `[].id`
- `controlId` (string): the `id` that was given in `loadDevices()` --> `[].controls[].id`
- `context` (object): object containing helper methods that can be used when executing the action

The returned object must be an ioBroker state object.

This method can be implemented asynchronously and can take a lot of time to complete.

## Action sequences

To allow your adapter to interact with the user, you can use "actions".

As described above, there are actions on the instance and on devices. The behavior of both methods is similar.

Inside an action method (`handleInstanceAction()` or `handleDeviceAction()`) you can perform arbitrary actions, like talking to a device or API, and you can interact with the user.
For interactions, there are methods you can call on `context`:

There are some reserved action names, you can find the list below:

- `status` - This action is called when the user clicks on the status icon. So to implement the "click-on-status" functionality, the developer has to implement this action.
- `disable` - This action will be called when the user clicks on the `enabled` icon. `disable` and `enable` actions cannot be together.
- `enable` - This action will be called when the user clicks on the `disabled` icon. `disable` and `enable` actions cannot be together.

### `showMessage(text: ioBroker.StringOrTranslated)`

Shows a message to the user.

The method has the following parameter:

- `text` (string or translation): the text to show to the user

This asynchronous method returns (or rather: the Promise is resolved) once the user has clicked on "OK".

### `showConfirmation(text: ioBroker.StringOrTranslated)`

Lets the user confirm an action by showing a message with an "OK" and "Cancel" button.

The method has the following parameter:

- `text` (string or translation): the text to show to the user

This asynchronous method returns (or rather: the Promise is resolved) once the user has clicked a button in the dialog:

- `true` if the user clicked "OK"
- `false` if the user clicked "Cancel"

### `showForm(schema: JsonFormSchema, options?: { data?: JsonFormData; title?: string; ignoreApplyDisabled?: boolean })`

Shows a dialog with a Custom JSON form that can be edited by the user.

The method has the following parameters:

- `schema` (Custom JSON form schema): the schema of the Custom JSON form to show in the dialog
- `options` (object, optional): options to configure the dialog further
    - `data` (object, optional): the data used to populate the Custom JSON form
    - `title` (string, optional): the dialog title
    - `ignoreApplyDisabled` (boolean, optional): set to `true` to always enable the "OK" button even if the form is unchanged

This asynchronous method returns (or rather: the Promise is resolved) once the user has clicked a button in the dialog:

- the form data, if the user clicked "OK"
- `undefined`, if the user clicked "Cancel"

### `openProgress(title: string, options?: {indeterminate?: boolean, value?: number, label?: string})`

Shows a dialog with a linear progress bar to the user. There is no way for the user to dismiss this dialog.

The method has the following parameters:

- `title` (string): the dialog title
- `options` (object, optional): options to configure the dialog further
    - `indeterminate` (boolean, optional): set to `true` to visualize an unspecified wait time
    - `value` (number, optional): the progress value to show to the user (if set, it must be a value between 0 and 100)
    - `label` (string, optional): label to show to the right of the progress bar; you may show the progress value in a human-readable way (e.g. "42%") or show the current step in a multi-step progress (e.g. "Logging in...")

This method returns a promise that resolves to a `ProgressDialog` object.

**Important:** you must always call `close()` on the returned object before you may open any other dialog.

`ProgressDialog` has two methods:

- `update(update: { title?: string; indeterminate?: boolean; value?:number; label?: string; })`
    - Updates the progress dialog with new values
    - The method has the following parameter:
        - `update` (object): what to update in the dialog
            - `title` (string, optional): change the dialog title
            - `indeterminate` (boolean, optional): change whether the progress is indeterminate
            - `value` (number, optional): change the progress value (if set, it must be a value between 0 and 100)
            - `label` (string, optional): change the label to the right of the progress bar
- `close()`
    - Closes the progress dialog (and allows you to open other dialogs)

### `sendCommandToGui(command: BackendToGuiCommand)`

Sends command to GUI to add/update/delete devices or to update the status of device.

**It is suggested** to use the state's ID directly in DeviceInfo structure instead of sending the command every time to GUI on status update.

See example below:

```ts
class MyAdapterDeviceManagement extends DeviceManagement<MyAdapter> {
    protected loadDevices(context: DeviceLoadContext<string>): void {
        const deviceInfo: DeviceInfo = {
            id: 'uniqieID',
            name: 'My device',
            icon: 'node', // find possible icons here: https://github.com/ioBroker/adapter-react-v5/blob/main/src/Components/DeviceType/DeviceTypeIcon.tsx#L68
            manufacturer: { objectId: 'uniqieID', property: 'native.manufacturer' },
            model: { objectId: 'uniqieID', property: 'native.model' },
            status: {
                battery: { stateId: 'uniqieID.DevicePower0.BatteryPercent' },
                connection: { stateId: 'uniqieID.online', mapping: { true: 'connected', false: 'disconnected' } },
                rssi: { stateId: 'uniqieID.rssi' },
            },
            hasDetails: true,
        };
        context.addDevice(deviceInfo);
    }
}
```

## Migration from 1.x to 2.x

Between version 1.x and 2.x, there are some breaking changes. Please also have a look at the changelog below for more information.

### Incremental loading of devices

In version 1.x, the `listDevices()` method had to return the full list of devices.
In version 2.x, this method was replaced by `loadDevices(context: DeviceLoadContext)` that allows incremental loading of devices.

Instead of creating and returning an array of `DeviceInfo` objects, you have to call `context.addDevice(deviceInfo)` for each device you want to add to the list.

You may also call `context.setTotalDevices(count: number)` as soon as possible to let the GUI know how many devices in total will be loaded.

### Refresh response of device actions

In version 2.x, the refresh response of device actions has changed.

| Version 1.x  | Version 2.x  | Description                                                                 |
| ------------ | ------------ | --------------------------------------------------------------------------- |
| `true`       | `'all'`      | the instance information as well as the entire device list will be reloaded |
| `false`      | `'none'`     | nothing will be reloaded                                                    |
| `'device'`   | `'devices'`  | the entire device list will be reloaded                                     |
| `'instance'` | `'instance'` | (unchanged) only the instance information will be reloaded                  |

## Changelog

<!--
	Placeholder for the next version (at the beginning of the line):
	### **WORK IN PROGRESS**
-->

### **WORK IN PROGRESS**

- (@UncleSamSwiss) Enabled incremental loading of devices
- (@UncleSamSwiss) Removed direct access to `DeviceManagement.handleXxx()` methods (use `handler` and similar properties instead)
- (@UncleSamSwiss) Added `identifier` property to `DeviceInfo` for human-readable identifiers
- (@UncleSamSwiss) Device refresh responses can no longer be a `boolean` and `'device'` was renamed to `'devices'`.
- (@UncleSamSwiss) Added `info` icon and possibility for actions to be a link (by providing a `url` property instead of a `handler` function)

### 2.0.2 (2026-01-28)

- (@GermanBluefox) BREAKING: Admin/GUI must have version 9 (or higher) of `dm-gui-components`
- (@GermanBluefox) Added types to update status of device directly from state
- (@GermanBluefox) Added backend to GUI communication possibility
- (@GermanBluefox) Added `dm:deviceInfo` command
- (@GermanBluefox) Added `dm:deviceStatus` command

### 1.0.16 (2026-01-02)

- (@GermanBluefox) Added `ignoreApplyDisabled` flag
- (@GermanBluefox) Added `update` icon

### 1.0.13 (2025-10-21)

- (@GermanBluefox) Updated packages

### 1.0.10 (2025-05-05)

- (@GermanBluefox) Added timeout property to actions
- (@GermanBluefox) Updated packages

### 1.0.9 (2025-01-25)

- (@GermanBluefox) Added copyToClipboard dialog button

### 1.0.8 (2025-01-24)

- (@GermanBluefox) Removed `headerTextColor` to device info

### 1.0.6 (2025-01-14)

- (@GermanBluefox) Added the connection type indication

### 1.0.5 (2025-01-11)

- (@GermanBluefox) Added action ENABLE_DISABLE and `enabled` status

### 1.0.0 (2025-01-08)

- (@GermanBluefox) Added `disabled` options for a device
- (@GermanBluefox) Major release just because is good enough. No breaking changes.

### 0.6.11 (2024-12-11)

- (@GermanBluefox) Do not close handler for progress

### 0.6.10 (2024-12-10)

- (@GermanBluefox) Export `BackEndCommandJsonFormOptions` type

### 0.6.9 (2024-11-22)

- (@GermanBluefox) Added a max-width option for form

### 0.6.8 (2024-11-22)

- (@GermanBluefox) Allowed grouping of devices

### 0.6.7 (2024-11-20)

- (@GermanBluefox) Updated types

### 0.6.6 (2024-11-18)

- (@GermanBluefox) Added configurable buttons for form

### 0.6.0 (2024-11-17)

- (@GermanBluefox) used new ioBroker/eslint-config lib and changed prettifier settings
- (@GermanBluefox) updated JsonConfig types

### 0.5.0 (2024-08-30)

- (bluefox) Migrated to eslint 9

### 0.4.0 (2024-08-30)

- (bluefox) Added `state` type for JSON config

### 0.3.1 (2024-07-18)

- (bluefox) Added qrCode type for JSON config

### 0.3.0 (2024-07-17)

- (bluefox) packages updated
- (bluefox) Updated JSON config types

### 0.2.2 (2024-06-26)

- (bluefox) packages updated

### 0.2.0 (2024-05-29)

- (bluefox) enhanced type exports
- (bluefox) added confirmation and input text options

### 0.1.9 (2023-12-25)

- (foxriver76) enhanced type exports

### 0.1.8 (2023-12-17)

- (bluefox) corrected control error

### 0.1.7 (2023-12-17)

- (bluefox) added channel info

### 0.1.5 (2023-12-16)

- (bluefox) extended controls with unit and new control types

### 0.1.4 (2023-12-13)

- (bluefox) added error codes

### 0.1.3 (2023-12-10)

- (bluefox) added some fields to DeviceInfo interface
- (bluefox) added control possibilities

## License

MIT License

Copyright (c) 2023-2026 ioBroker Community Developers

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

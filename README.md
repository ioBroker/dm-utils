# dm-utils

Utility classes for ioBroker adapters to support [ioBroker.device-manager](https://github.com/ioBroker/ioBroker.device-manager).

## How to use

Add in your `io-package.json` the property `deviceManager: true` to `common.supportedMessages`.
Note: If you don't have a `common.supportedMessages` property yet, you have to add it.
Also, if you don't have a `common.supportedMessages.messagebox: true` property yet, you have to add it. If common.messagebox exists, you can remove it. (see 
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
            name: "my-adapter",
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

### Access adapter methods

You can access all adapter methods like `getState()` or `getStateAsync()` via `this.adapter`.  
Example: `this.getState()` -> `this.adapter.getState()`

### Error Codes
| Code | Description                                                                                                                  | 
|------|------------------------------------------------------------------------------------------------------------------------------|
| 101  | Instance action ${actionId} was called before getInstanceInfo() was called. This could happen if the instance has restarted. |   
| 102  | Instance action ${actionId} is unknown.                                                                                      |                                                   
| 103  | Instance action ${actionId} is disabled because it has no handler.                                                           |       
| 201  | Device action ${actionId} was called before listDevices() was called. This could happen if the instance has restarted.       |
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

### `listDevices()`

This method must always be overridden (as it is abstract in the base class).

You must return an array with information about all devices of this adapter's instance.

This method is called when the user expands an instance in the list.

In most cases, you will get all states of your instance and fill the array with the relevant information.

Every array entry is an object of type `DeviceInfo` which has the following properties:

- `id` (string): a unique (human-readable) identifier of the device (it must be unique for your adapter instance only)
- `name` (string or translations): the human-readable name of this device
- `status` (optional): the current status of the device, which can be one of:
  - `"disconnected"`
  - `"connected"`
  - an object containing:
    - `icon` (string): an icon depicting the status of the device (see below for details)
    - `description` (string, optional): a text that will be shown as a tooltip on the status
- `actions` (array, optional): an array of actions that can be performed on the device; each object contains:
  - `id` (string): unique identifier to recognize an action (never shown to the user)
  - `icon` (string): an icon shown on the button (see below for details)
  - `description` (string, optional): a text that will be shown as a tooltip on the button
  - `disabled` (boolean, optional): if set to `true`, the button can't be clicked but is shown to the user
- `hasDetails` (boolean, optional): if set to `true`, the row of the device can be expanded and details are shown below

### `getInstanceInfo()`

This method allows the device manager tab to gather some general information about the instance. It is called when the user opens the tab.

If you override this method, the returned object must contain:

- `apiVersion` (string): the supported API version; must currently always be `"v1"`
- `actions` (array, optional): an array of actions that can be performed on the instance; each object contains:
  - `id` (string): unique identifier to recognize an action (never shown to the user)
  - `icon` (string): an icon shown on the button (see below for details)
  - `title` (string): the title shown next to the icon on the button
  - `description` (string, optional): a text that will be shown as a tooltip on the button
  - `disabled` (boolean, optional): if set to `true`, the button can't be clicked but is shown to the user

### `getDeviceDetails(id: string)`

This method is called if a device's `hasDetails` is set to `true` and the user clicks on the expander.

The returned object must contain:

- `id` (string): the `id` given as parameter to the method call
- `schema` (Custom JSON form schema): the schema of the Custom JSON form to show below the device information
- `data` (object, optional): the data used to populate the Custom JSON form

For more details about the schema, see [here](https://github.com/ioBroker/ioBroker.admin/blob/master/src-rx/src/components/JsonConfigComponent/SCHEMA.md).

Please keep in mind that there is no "Save" button, so in most cases, the form shouldn't contain editable fields, but you may use `sendTo<xxx>` objects to send data to the adapter.

### `handleInstanceAction(actionId: string, context: ActionContext)

This method is called when to user clicks on an action (i.e., button) for an adapter instance.

The parameters of this method are:
- `actionId` (string): the `id` that was given in `getInstanceInfo()` --> `actions[].id`
- `context` (object): object containing helper methods that can be used when executing the action

The returned object must contain:
- `refresh` (boolean): set this to `true` if you want the list to be reloaded after this action

This method can be implemented asynchronously and can take a lot of time to complete.

See below for how to interact with the user.

### `handleDeviceAction(deviceId: string, actionId: string, context: ActionContext)

This method is called when the user clicks on an action (i.e., button) for a device.

The parameters of this method are:
- `deviceId` (string): the `id` that was given in `listDevices()` --> `[].id`
- `actionId` (string): the `id` that was given in `listDevices()` --> `[].actions[].id`
- `context` (object): object containing helper methods that can be used when executing the action

The returned object must contain:
- `refresh` (string / boolean): the following values are allowed:
    - `"device"`: if you want the device details to be reloaded after this action
    - `"instance"`: if you want the entire device list to be reloaded after this action
    - `false`: if you don't want anything to be refreshed (important: this is a boolean, not a string!)

This method can be implemented asynchronously and can take a lot of time to complete.

See below for how to interact with the user.

### `handleDeviceControl(deviceId: string, controlId: string, state: ControlState, context: MessageContext)

This method is called when the user clicks on a control (i.e., slider) in the device card.

The parameters of this method are:
- `deviceId` (string): the `id` that was given in `listDevices()` --> `[].id`
- `controlId` (string): the `id` that was given in `listDevices()` --> `[].controls[].id`. There are some reserved control names, you can find the list below.
- `state` (string | number | boolean): new state for the control, that will be sent to a real device
- `context` (object): object containing helper methods that can be used when executing the action

The returned object must contain:
- `state`: ioBroker state object

This method can be implemented asynchronously and can take a lot of time to complete.

### `handleDeviceControlState(deviceId: string, controlId: string, context: MessageContext)

This method is called when GUI requests the update of the state.

The parameters of this method are:
- `deviceId` (string): the `id` that was given in `listDevices()` --> `[].id`
- `controlId` (string): the `id` that was given in `listDevices()` --> `[].controls[].id`
- `context` (object): object containing helper methods that can be used when executing the action

The returned object must contain:
- `state`: ioBroker state object

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

### `showForm(schema: JsonFormSchema, options?: { data?: JsonFormData; title?: string })`

Shows a dialog with a Custom JSON form that can be edited by the user.

The method has the following parameters:
- `schema` (Custom JSON form schema): the schema of the Custom JSON form to show in the dialog
- `options` (object, optional): options to configure the dialog further
  - `data` (object, optional): the data used to populate the Custom JSON form
  - `title` (string, optional): the dialog title

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
      - `value` (number, optional): change the progress value
      - `label` (string, optional): change the label to the right of the progress bar
- `close()`
  - Closes the progress dialog (and allows you to open other dialogs)
  
<!--
	Placeholder for the next version (at the beginning of the line):
	### **WORK IN PROGRESS**
-->
## Changelog
### 1.0.14 (2026-01-02)
* (@GermanBluefox) Added `ignoreApplyDisabled` flag

### 1.0.13 (2025-10-21)
* (@GermanBluefox) Updated packages

### 1.0.10 (2025-05-05)

* (@GermanBluefox) Added timeout property to actions
* (@GermanBluefox) Updated packages

### 1.0.9 (2025-01-25)

* (@GermanBluefox) Added copyToClipboard dialog button

### 1.0.8 (2025-01-24)

* (@GermanBluefox) Removed `headerTextColor` to device info

### 1.0.6 (2025-01-14)
 
* (@GermanBluefox) Added the connection type indication

### 1.0.5 (2025-01-11)

* (@GermanBluefox) Added action ENABLE_DISABLE and `enabled` status

### 1.0.0 (2025-01-08)

* (@GermanBluefox) Added `disabled` options for a device
* (@GermanBluefox) Major release just because is good enough. No breaking changes.

### 0.6.11 (2024-12-11)

* (@GermanBluefox) Do not close handler for progress

### 0.6.10 (2024-12-10)

* (@GermanBluefox) Export `BackEndCommandJsonFormOptions` type

### 0.6.9 (2024-11-22)

* (@GermanBluefox) Added a max-width option for form

### 0.6.8 (2024-11-22)

* (@GermanBluefox) Allowed grouping of devices

### 0.6.7 (2024-11-20)

* (@GermanBluefox) Updated types

### 0.6.6 (2024-11-18)

* (@GermanBluefox) Added configurable buttons for form

### 0.6.0 (2024-11-17)

* (@GermanBluefox) used new ioBroker/eslint-config lib and changed prettifier settings
* (@GermanBluefox) updated JsonConfig types

### 0.5.0 (2024-08-30)
* (bluefox) Migrated to eslint 9

### 0.4.0 (2024-08-30)
* (bluefox) Added `state` type for JSON config

### 0.3.1 (2024-07-18)
* (bluefox) Added qrCode type for JSON config

### 0.3.0 (2024-07-17)
* (bluefox) packages updated
* (bluefox) Updated JSON config types

### 0.2.2 (2024-06-26)
* (bluefox) packages updated

### 0.2.0 (2024-05-29)
* (bluefox) enhanced type exports
* (bluefox) added confirmation and input text options

### 0.1.9 (2023-12-25)
* (foxriver76) enhanced type exports

### 0.1.8 (2023-12-17)
* (bluefox) corrected control error

### 0.1.7 (2023-12-17)
* (bluefox) added channel info

### 0.1.5 (2023-12-16)
* (bluefox) extended controls with unit and new control types

### 0.1.4 (2023-12-13)
* (bluefox) added error codes

### 0.1.3 (2023-12-10)
* (bluefox) added some fields to DeviceInfo interface
* (bluefox) added control possibilities

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

# Local draft recovery

The studio saves editing sessions to this browser's IndexedDB after edits settle. Photos are not uploaded by autosave. Drafts contain the photo frames and editor settings, stay on this device, and expire after seven days.

When a saved session is found, choose **Restore session** or **Discard old draft**. The app pauses autosave until that decision, preventing a new empty screen from overwriting the draft. Clearing the local draft also turns recovery off for the current preference; enable the checkbox to resume saving.

Browser storage may be unavailable in private/restricted modes, full, cleared by the device, or removed when browser data is deleted. A draft is convenient recovery, not a backup. Download files you want to keep. Storage errors leave the active editor intact and display an actionable message.

Photos on shared devices can be accessible to another person using the same browser profile. Clear the local draft when finished. Cloud share operations are separate and never included in draft snapshots.

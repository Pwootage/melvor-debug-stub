# WARNING: THIS IS A MOD FOR DEVELOPERS ONLY!

A simple stub that patches loadResources to load from a local server.

To use:
- install mod
- in your mod folder, run: `npx http-server --cors -c-1` (or something similar!)

You should now load your local mod :)


Notes:

- Namespace is set to 'dev_stub'
- Mod settings will show up under Debug Stub
- Should otherwise work normally!
- If you create a save file named MOD_TEST (and then enable the option in mod settings), it will automatically load that (local) save
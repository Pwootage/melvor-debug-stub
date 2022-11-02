export async function setup(ctx) {
  function getResourceUrl(resource) {
    return 'http://localhost:8080/' + resource;
  }
  function isValidLoadResource(resource) {
    return isScriptFile(resource) || isModuleFile(resource) || isStylesheetFile(resource) || isHTMLFile(resource);
  }
  function isScriptFile(resource) {
    return typeof resource === 'string' && resource.endsWith('.js');
  }
  function isModuleFile(resource) {
    return typeof resource === 'string' && (resource.endsWith('.js') || resource.endsWith('.mjs'));
  }
  function isStylesheetFile(resource) {
    return typeof resource === 'string' && resource.endsWith('.css');
  }
  function isHTMLFile(resource) {
    return typeof resource === 'string' && resource.endsWith('.html');
  }
  function isJsonFile(resource) {
    return typeof resource === 'string' && resource.endsWith('.json');
  }
  async function loadResource(resource) {
    if (isScriptFile(resource))
      return await loadScript(resource);
    else if (isModuleFile(resource))
      return await loadModule(resource);
    else if (isStylesheetFile(resource))
      return loadStylesheet(resource);
    else if (isHTMLFile(resource))
      return await loadTemplates(resource);
    throw new Error(`Mod "__DEV_MOD" resource "${resource}" is invalid and cannot be loaded.`);
  }
  async function loadScript(resource) {
    if (!isScriptFile(resource))
      throw new Error(`[__DEV_MOD] Cannot load resource "${resource}" as a script. Expected file type ".js".`);
    return new Promise((res, rej) => {
      const scriptEl = document.createElement('script');
      scriptEl.type = 'text/javascript';
      scriptEl.src = getResourceUrl(resource);
      scriptEl.onload = () => res();
      scriptEl.onerror = () => rej(`[__DEV_MOD] Error loading resource "${resource}".`);
      document.body.appendChild(scriptEl);
    });
  }
  async function loadModule(resource) {
    if (!isModuleFile(resource))
      throw new Error(`[__DEV_MOD] Cannot load resource "${resource}" as a module. Expected file type ".mjs" or ".js".`);
    return await import(getResourceUrl(resource));
  }
  function loadStylesheet(resource) {
    if (!isStylesheetFile(resource))
      throw new Error(`[__DEV_MOD] Cannot load resource "${resource}" as a stylesheet. Expected file type ".css".`);
    const styleEl = document.createElement('link');
    styleEl.href = getResourceUrl(resource);
    styleEl.rel = 'stylesheet';
    document.head.appendChild(styleEl);
  }
  async function loadTemplates(resource) {
    if (!isHTMLFile(resource))
      throw new Error(`[__DEV_MOD] Cannot load resource "${resource}" as a template file. Expected file type ".html".`);
    const url = getResourceUrl(resource);
    return new Promise((res, rej) => {
      const req = new XMLHttpRequest();
      req.open('GET', url, true);
      req.responseType = 'document';
      req.onload = () => {
        req.response.querySelectorAll('template').forEach((el) => {
          document.body.append(el.cloneNode(true));
        });
        res();
      };
      req.onerror = () => {
        rej(`[__DEV_MOD] Templates failed to load.`);
      };
      req.send();
    });
  }
  async function loadJson(resource) {
    if (!isJsonFile(resource))
      throw new Error(`[__DEV_MOD] Cannot load resource "${resource}" as JSON data. Expected file type ".json".`);
    return fetch(getResourceUrl(resource)).then((res) => res.json());
  }

  // monkey patch context to allow for dev loading
  ctx.loadTemplates = loadTemplates;
  ctx.loadStylesheet = loadStylesheet;
  ctx.loadScript = loadScript;
  ctx.loadModule = loadModule;
  ctx.loadData = loadJson;

  // set up the auto-load settings
  const debugStub = ctx.settings.section('Debug Stub');
  debugStub.add({
    type: 'switch',
    name: 'auto-load-test',
    label: 'Auto load save with name <code>MOD_TEST</code>',
    default: false,
    onChange(value, previousValue) {
      localStorage['DEBUG_STUB_AUTO_LOAD'] = value ? 'true' : 'false';
    }
  });

  ctx.onCharacterSelectionLoaded(async () => {
    // this does the acutal auto-load once the character selection screen is loaded
    if (localStorage['DEBUG_STUB_AUTO_LOAD'] === 'true') {
      console.log('AUTO LOADING SAVE');

      let modSaveId = -1;
      for (let i = 0; i < maxSaveSlots; i++) {
        const header = localSaveHeaders[i];
        if (header.characterName === 'MOD_TEST') {
          console.log("Found save with name 'MOD_TEST'");
          modSaveId = i;
          break;
        }
      }
      if (modSaveId >= 0) {
        showSaveSelectionLoading(modSaveId);
        await loadLocalSave(modSaveId);
        await mod.trigger.characterLoaded();
      }
    }
  });

  ctx.onCharacterLoaded(() => {
    // This keeps the debug option in sync with the local storage value
    // since the option is stored in the save file
    if (localStorage['DEBUG_STUB_AUTO_LOAD'] === 'true') {
      debugStub.set('auto-load-test', true);
    } else {
      debugStub.set('auto-load-test', false);
    }
  });

  try {
    //ok now we can load the mod
    const manifest = await loadJson("manifest.json");

    if (manifest.setup) {
      const { setup } = await loadModule(manifest.setup);
      await setup(ctx);
    }
    if (manifest.load) {
      if (Array.isArray(manifest.load)) {
        for (const resource of manifest.load) {
          if (isValidLoadResource(resource)) {
            await loadResource(resource);
          }
        }
      } else if (isValidLoadResource(manifest.load)) {
        await loadResource(manifest.load);
      }
    }
    console.log('Loaded mod from debug stub');
  } catch (e) {
    console.error('Failed to load mod from debug stub', e);
  }
}

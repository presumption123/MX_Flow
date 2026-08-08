require('bytenode');
const stamp = require('./bytecode-stamp.json');

function refuse(message, role) {
  const detail = '[Halcyon bytecode] ' + message;
  console.error(detail);
  try { process.stderr.write(detail + '\n'); } catch {}
  if (role === 'main' && !process.argv.includes('--bytecode-smoke')) {
    // Clean EXIT, not an uncaught exception: show the actionable download message then quit before any
    // window opens, so the user sees a plain dialog and never Electron's raw crash box + JS stack.
    // (Smoke mode and non-main roles still throw, so verifyPackagedBytecode and module callers catch it.)
    try {
      const electron = require('electron');
      electron.dialog.showErrorBox('Halcyon needs the right download', detail);
      electron.app.exit(1);
      return;
    } catch {}
  }
  throw new Error(detail);
}

exports.load = function loadBytecode(target, role) {
  const actual = process.versions.electron || 'not-electron';
  if (actual !== stamp.electronVersion) {
    return refuse('Electron ' + actual + ' cannot load bytecode compiled for Electron ' + stamp.electronVersion + '. Rebuild the package after every Electron change.', role);
  }
  // V8 cached data (this bytecode) is CPU-architecture specific: an x64-compiled .jsc is rejected by an
  // arm64 runtime of the same Electron version, and vice versa. The stamp records the arch/platform the
  // bytecode was compiled for; compare it to this runtime's arch/platform and refuse EARLY with a clear
  // message instead of surfacing V8's opaque cachedDataRejected error deep inside require(). This keys on
  // the running Electron binary's arch (an x64 build under Rosetta on Apple Silicon reports "x64" and its
  // bytecode is x64, so it correctly PASSES) - not on the hardware. (Do NOT use a universal/lipo mac
  // target with this guard: a single stamp cannot describe both slices of a universal binary.)
  if (stamp.platform !== process.platform || stamp.arch !== process.arch) {
    return refuse('This package ships ' + stamp.platform + '-' + stamp.arch + ' V8 bytecode but this runtime is ' + process.platform + '-' + process.arch + '. Install the ' + process.platform + '-' + process.arch + ' build of this app. (An Intel/x64 build launched under Rosetta on Apple Silicon reports arch "x64" and needs the x64 download; the arm64 build runs natively.)', role);
  }
  try {
    return require(target);
  } catch (error) {
    if (role === 'main' && /cachedDataRejected|Invalid or incompatible cached data/.test(String(error && error.message))) {
      try {
        const fs = require('node:fs');
        const vm = require('node:vm');
        const cached = fs.readFileSync(require.resolve(target));
        const dummyScript = new vm.Script('"bytecode-header-probe"', { produceCachedData: true });
        const dummy = dummyScript.createCachedData();
        console.error('[Halcyon bytecode] cached header=' + cached.subarray(0, 32).toString('hex') + ' runtime header=' + dummy.subarray(0, 32).toString('hex') + ' node=' + process.version);
      } catch {}
      return refuse('The packaged V8 bytecode is incompatible with this Electron runtime. Reinstall a package built for this platform.', role);
    }
    throw error;
  }
};

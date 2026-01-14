/**
 * VERSION: 1.0.0
 * Daemon File Watcher
 *
 * DESCRIPTION:
 * Monitors all scripts in home and subdirectories for changes using CRC32.
 * When any file changes, automatically runs utilCopyAll.js to sync files.
 *
 * USAGE: run daemonFileWatcher.js
 */

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");

  const COPY_SCRIPT = "/utilCopyAll.js";
  const CHECK_INTERVAL = 5000;
  const crcCache = new Map();

  function crc32(str) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < str.length; i++) {
      crc ^= str.charCodeAt(i);
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1));
      }
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function getAllScripts(dir = "") {
    const files = ns.ls("home", dir);
    const scripts = [];

    for (const file of files) {
      if (file.endsWith(".js")) {
        scripts.push(file);
      }
    }

    return scripts;
  }

  function initializeCache() {
    const scripts = getAllScripts();
    for (const script of scripts) {
      const content = ns.read(script);
      const crc = crc32(content);
      crcCache.set(script, crc);
    }
    ns.print(`✅ Initialized cache with ${crcCache.size} files`);
  }

  function checkForChanges() {
    const scripts = getAllScripts();
    const changedFiles = [];

    for (const script of scripts) {
      const content = ns.read(script);
      const newCrc = crc32(content);
      const oldCrc = crcCache.get(script);

      if (oldCrc === undefined) {
        ns.print(`🆕 New file detected: ${script}`);
        changedFiles.push(script);
        crcCache.set(script, newCrc);
      } else if (oldCrc !== newCrc) {
        ns.print(`📝 File changed: ${script}`);
        changedFiles.push(script);
        crcCache.set(script, newCrc);
      }
    }

    const deletedFiles = [];
    for (const [cachedFile] of crcCache) {
      if (!scripts.includes(cachedFile)) {
        ns.print(`🗑️ File deleted: ${cachedFile}`);
        deletedFiles.push(cachedFile);
      }
    }

    for (const deleted of deletedFiles) {
      crcCache.delete(deleted);
    }

    return changedFiles.length > 0 || deletedFiles.length > 0;
  }

  ns.print(`🚀 Starting File Watcher Daemon`);
  initializeCache();

  while (true) {
    await ns.sleep(CHECK_INTERVAL);

    if (checkForChanges()) {
      ns.print(`🔄 Changes detected! Running ${COPY_SCRIPT}...`);
      ns.run(COPY_SCRIPT);
      await ns.sleep(2000);
    }
  }
}

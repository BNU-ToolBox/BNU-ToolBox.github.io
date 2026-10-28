(() => {
  "use strict";

  const API_URL = "https://api.github.com/repos/BNU-ToolBox/BNU-ToolBox/releases?per_page=10";
  const CACHE_KEY = "bnu-toolbox-latest-release";
  const CACHE_TTL = 10 * 60 * 1000;
  const status = document.getElementById("release-status");

  function applyRelease(release, installer) {
    const version = String(release.tag_name || "").replace(/^v/i, "");
    const channel = release.prerelease ? "测试版" : "正式版";
    const label = `下载 ${version} ${channel}`;
    if (!version || !installer || !installer.browser_download_url) return;

    document.querySelectorAll("[data-download-link]").forEach((link) => {
      link.href = installer.browser_download_url;
      link.setAttribute("aria-label", `${label}，大小 ${formatBytes(installer.size)}`);
    });
    document.querySelectorAll("[data-release-version]").forEach((node) => {
      node.textContent = version;
    });
    document.querySelectorAll("[data-release-channel]").forEach((node) => {
      node.textContent = channel;
    });
    document.querySelectorAll("[data-download-label]").forEach((node) => {
      node.textContent = label;
    });
    if (status) status.textContent = `已获取最新版本 ${version}。`;
  }

  function formatBytes(bytes) {
    const value = Number(bytes);
    if (!Number.isFinite(value) || value <= 0) return "未知";
    return `${(value / 1024 / 1024).toFixed(1)} MB`;
  }

  function readCache() {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
      if (cached && Date.now() - cached.savedAt < CACHE_TTL) return cached;
    } catch (error) {
      // Storage may be unavailable in privacy-restricted contexts.
    }
    return null;
  }

  function writeCache(release, installer) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        savedAt: Date.now(),
        release,
        installer,
      }));
    } catch (error) {
      // A failed cache write must not affect the download button.
    }
  }

  async function fetchLatest() {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(API_URL, {
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`GitHub API ${response.status}`);
      const releases = await response.json();
      if (!Array.isArray(releases)) throw new Error("Invalid release data");

      const release = releases.find((item) => {
        if (!item || item.draft) return false;
        return (item.assets || []).some(isInstaller);
      });
      if (!release) throw new Error("No installer release found");
      const installer = release.assets.find(isInstaller);
      applyRelease(release, installer);
      writeCache(release, installer);
    } catch (error) {
      if (status) status.textContent = "未获取到最新版本信息，当前使用内置下载地址。";
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function isInstaller(asset) {
    const name = String(asset && asset.name || "").toLowerCase();
    return name.startsWith("bnu-toolbox-setup-") && name.endsWith(".exe");
  }

  const cached = readCache();
  if (cached) applyRelease(cached.release || {}, cached.installer || {});
  fetchLatest();
})();

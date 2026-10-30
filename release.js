(() => {
  "use strict";

  const MANIFEST_URL = "./releases.json";
  const status = document.getElementById("release-status");

  function isInstaller(asset) {
    const name = String(asset && asset.name || "").toLowerCase();
    return /^bnu-toolbox-setup-\d+\.\d+\.\d+\.exe$/.test(name);
  }

  function formatBytes(bytes) {
    const value = Number(bytes);
    if (!Number.isFinite(value) || value <= 0) return "未知";
    return `${(value / 1024 / 1024).toFixed(1)} MB`;
  }

  function applyRelease(release, installer) {
    if (!release || release.draft || !isInstaller(installer)) return false;
    const version = String(release.tag_name || "").replace(/^v/i, "");
    const downloadUrl = String(installer.browser_download_url || "");
    if (!version || !downloadUrl.startsWith("https://github.com/")) return false;

    const channel = release.prerelease ? "测试版" : "正式版";
    const label = `下载 ${version} ${channel}`;
    document.querySelectorAll("[data-download-link]").forEach((link) => {
      link.href = downloadUrl;
      link.setAttribute(
        "aria-label",
        `${label}，大小 ${formatBytes(installer.size)}`,
      );
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
    document.querySelectorAll("[data-release-link]").forEach((link) => {
      if (release.html_url) link.href = release.html_url;
    });
    if (status) status.textContent = `已获取最新版本 ${version}。`;
    return true;
  }

  async function loadReleaseManifest() {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(MANIFEST_URL, {
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const manifest = await response.json();
      if (manifest.schema_version !== 1) {
        throw new Error("Unsupported release manifest");
      }
      if (!applyRelease(manifest.release, manifest.installer)) {
        throw new Error("Invalid release manifest");
      }
    } catch (error) {
      // Built-in links in index.html already point to a known release.
      if (status) {
        status.textContent = "未获取到在线版本清单，当前使用页面内置下载地址。";
      }
      console.warn("BNU-ToolBox release manifest unavailable:", error);
    } finally {
      window.clearTimeout(timeout);
    }
  }

  loadReleaseManifest();
})();

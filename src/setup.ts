import { homedir } from "node:os";
import { join } from "node:path";
import * as action from "@actions/core";
import { downloadTool, extractTar } from "@actions/tool-cache";
import * as cache from "@actions/cache";
import { restoreCache, saveCache } from "@actions/cache";
import { mv } from "@actions/io";
import { getExecOutput } from "@actions/exec";

export type Options = {
  version: string;
  dotfiles: string;
  options: string;
};

export default async (
  options: Options
): Promise<{
  version: string;
  cacheHit: boolean;
}> => {
  // throw error on unsupported platforms (windows)
  if (process.platform === "win32") {
    throw new Error("Envhub is not supported on Windows");
  }

  const { url, cacheKey } = getDownloadUrl({
    version: options.version,
  });
  const cacheEnabled = cacheKey && cache.isFeatureAvailable();
  const dir = join(homedir(), ".envhub", "bin");
  action.addPath(dir);
  const path = join(dir, "envhub");
  let version: string | undefined;
  let cacheHit = false;

  if (cacheEnabled) {
    const cacheRestored = await restoreCache([dir], cacheKey);
    if (cacheRestored) {
      version = await verifyEnvhub(path);
      if (version) {
        cacheHit = true;
        action.info(`Envhub ${version} restored from cache`);
      } else {
        action.warning(
          "Found a cached version of Envhub, but it appears to be corrupted? Attempting to download a new version."
        );
      }
    }
  }

  if (!cacheHit) {
    action.info(`Downloading a new version of Envhub: ${url}`);
    const tarPath = await downloadTool(url);
    const extractedPath = await extractTar(tarPath);
    const exePath = join(extractedPath, "envhub");
    await mv(exePath, path);
    version = await verifyEnvhub(path);
  }
  if (!version) {
    throw new Error("Unable to verify the downloaded version of Envhub");
  }
  if (cacheEnabled) {
    try {
      await saveCache([path], cacheKey);
    } catch (error) {
      action.warning(
        `Failed to save the downloaded version of Envhub to the cache: ${error.message}`
      );
    }
  }

  if (options.dotfiles.length > 0) {
    action.info(`Setting up dotfiles: ${options.dotfiles}`);
    const args =
      options.options !== ""
        ? ["use", options.dotfiles, ...options.options.split(" ")]
        : ["use", options.dotfiles];

    const { exitCode, stdout, stderr } = await getExecOutput(path, args);
    if (exitCode !== 0) {
      throw new Error(
        `Failed to set up dotfiles: ${stderr.trim() || stdout.trim()}`
      );
    }
  }

  return {
    version,
    cacheHit,
  };
};

function getDownloadUrl(options?: {
  version?: string;
  os?: string;
  arch?: string;
}): { url: string; cacheKey: string } {
  const release = encodeURIComponent(options?.version ?? "v0.2.4");
  const platform = {
    darwin: "apple-darwin",
    linux: "unknown-linux-gnu",
  };
  const os = encodeURIComponent(options?.os ?? platform[process.platform]);
  const arch = encodeURIComponent(options?.arch ?? process.arch);
  const cpu = {
    x64: "x86_64",
  };
  const { href } = new URL(
    `${release}/envhub_${release}_${cpu[arch] || arch}-${os}.tar.gz`,
    "https://github.com/tsirysndr/envhub/releases/download/"
  );

  return {
    url: href,
    cacheKey: `envhub-${release}-${arch}-${os}`,
  };
}

async function verifyEnvhub(path: string): Promise<string | undefined> {
  const { exitCode, stdout } = await getExecOutput(path, ["--version"], {
    ignoreReturnCode: true,
  });
  return exitCode === 0 ? stdout.trim() : undefined;
}

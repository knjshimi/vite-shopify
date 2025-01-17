import { parse, relative, resolve } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import { unlink } from 'node:fs/promises';

import picomatch from 'picomatch';
import fg from 'fast-glob';
import { normalizePath } from 'vite';

import { copyAllAssets, copyAsset, deleteAsset, logEvent, logEventIgnored, logWarn, renameFile } from './utils.js';

import type { Logger, Plugin } from 'vite';
import type { ResolvedPluginShopifyAssetsOptions } from './options.js';

export const servePlugin = ({
  publicDir,
  themeRoot,
  themeAssetsDir,
  targets,
  silent,
  onServe,
}: ResolvedPluginShopifyAssetsOptions): Plugin => {
  let logger: Logger;
  const currentDir = resolve();

  return {
    name: 'vite-plugin-shopify-assets:serve',
    apply: 'serve',

    config: () => ({
      publicDir,
    }),

    configResolved(_config): void {
      logger = _config.logger;

      if (targets.length > 0 && !existsSync(publicDir)) {
        const relativePublicDir = relative(currentDir, publicDir);
        logWarn(
          `Your publicDir does not exist, creating it at ${relativePublicDir}/ - Use this folder to store the source static assets for your Shopify theme`,
          logger,
        );
        mkdirSync(publicDir);
      }

      if (!existsSync(themeAssetsDir)) {
        const relativeThemeAssetsDir = relative(currentDir, themeAssetsDir);
        logWarn(
          `Your Shopify theme assets folder does not exist - creating it at ${relativeThemeAssetsDir}/ - Your static assets will be copied to this folder`,
          logger,
        );
        mkdirSync(themeAssetsDir);
      }
    },

    async buildStart(): Promise<void> {
      if (!onServe) {
        if (!silent) logWarn('Skipping serve', logger);
        return;
      }

      // Check if there are assets to clean (destination must be other than '<themeRoot>/assets')
      // Note: buildStart will only be run once on serve. Because we're using publicDir to watch files
      // vite should trigger the watchChange hook, which will take care of cleaning these special assets.
      for (const target of targets) {
        if (!target.cleanMatch) continue;

        const assetFiles = await fg(normalizePath(target.src), { ignore: target.ignore });
        if (!assetFiles.length) continue;

        // We need to keep track of the files we want to keep to avoid
        // having Shopify CLI deleting and reuploading them moments later.
        const filesToKeep = [];
        for (const src of assetFiles) {
          const { base: file } = parse(src);
          const resolvedDest = target.rename
            ? normalizePath(resolve(target.dest, await renameFile(file, src, target.rename)))
            : normalizePath(resolve(target.dest, file));
          filesToKeep.push(resolvedDest);
        }

        const filesToDelete = await fg(target.cleanMatch, { ignore: filesToKeep });
        if (!filesToDelete.length) continue;

        await Promise.all(
          filesToDelete.map(async (file) =>
            existsSync(file) ? unlink(file).then(() => Promise.resolve(file)) : Promise.resolve(file),
          ),
        )
          .then((results) => {
            if (!results.length) return;
            for (const fileDeleted of results) {
              const relativePath = relative(themeRoot, fileDeleted);
              logEvent('delete', relativePath, logger, true);
            }
          })
          .catch((error: unknown) => {
            if (silent) return;
            const message = error instanceof Error ? error.message : 'An unknown error occurred while deleting files';
            logger.error(message);
          });
      }

      // Copy all assets to the theme assets directory.
      for (const target of targets) {
        await copyAllAssets(target, logger, { silent, timestamp: true });
      }
    },

    async watchChange(fileChanged: string, { event }): Promise<void> {
      if (!onServe) return;

      const target = targets.find((_target) => picomatch(_target.src)(fileChanged));
      if (!target) return;

      if (target.ignore.some((glob) => picomatch(glob)(fileChanged))) {
        const relativeIgnored = relative(themeAssetsDir, fileChanged);
        logEventIgnored(event, relativeIgnored, logger, true);
        return;
      }

      switch (event) {
        case 'create':
        case 'update':
          return copyAsset(target, fileChanged, event, logger, silent).catch((error: unknown) => {
            if (silent) return;
            const message = error instanceof Error ? error.message : 'An unknown error occurred while copying files';
            logger.error(message);
          });

        case 'delete':
          return deleteAsset(target, fileChanged, event, logger, silent).catch((error: unknown) => {
            if (silent) return;
            const message = error instanceof Error ? error.message : 'An unknown error occurred while deleting files';
            logger.error(message);
          });
      }
    },
  };
};

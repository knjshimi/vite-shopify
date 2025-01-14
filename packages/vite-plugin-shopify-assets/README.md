# Vite Plugin Shopify Assets

<a href="https://www.npmjs.com/package/vite-plugin-shopify-assets"><img src="https://img.shields.io/npm/dt/vite-plugin-shopify-assets" alt="Total Downloads"></a>
<a href="https://www.npmjs.com/package/vite-plugin-shopify-assets"><img src="https://img.shields.io/npm/v/vite-plugin-shopify-assets" alt="Latest Stable Version"></a>
<a href="https://www.npmjs.com/package/vite-plugin-shopify-assets"><img src="https://img.shields.io/npm/l/vite-plugin-shopify-assets" alt="License"></a>

Created to be used alongside [vite-plugin-shopify](https://github.com/barrel/shopify-vite/tree/main/packages/vite-plugin-shopify), for those who need to watch static assets, keeping the Shopify theme assets folder always in sync.

Please give your feedback, and send me any questions. A better documentation is in progress.

## Installation

```shell
npm i -D vite-plugin-shopify-assets # npm
yarn add -D vite-plugin-shopify-assets # yarn
```

## Basic Usage

Assumptions for the basic usage example:

- Your Shopify theme folders are located in the root.
- Your Vite `publicDir` config option is not set (will default to 'public').
- You have a `public/` folder, which holds all your static files, located in the root.
- You have not added custom configuration to vite-plugin-shopify.
- You have not added custom configuration to vite-plugin-shopify-assets.

In your `vite.config.js` file, you need to import the plugin:

```js
// vite.config.js
import shopify from 'vite-plugin-shopify';
import shopifyAssets from 'vite-plugin-shopify-assets';

export default defineConfig({
  plugins: [shopify(), shopifyAssets()],
});
```

Based on the folder structure below...

```text
my-shopify-project/
  ├── public/
  │   ├── static-script.js
  │   └── static-style.css
  ├── frontend/
  │   └── entrypoints/
  │       ├── main.ts
  │       └── style.css
  ├── assets/
  ├── config/
  ├── layout/
  ├── locales/
  ├── sections/
  ├── snippets/
  └── templates/
```

... Your assets folder when running `vite build` will look like this:

```text
assets/
├── .vite/manifest.json
├── main-[HASH].js
├── style-[HASH].css
├── static-script.js
└── static-style.css
```

It works on dev, watch and build.

```json
{
  "name": "my-shopify-project",
  "scripts": {
    "dev": "vite",
    "watch": "vite build --watch",
    "build": "vite build"
  }
}
```

```shell
npm run dev
# yarn watch
# pnpm build
```

## Advanced usage

In your `vite.config.js` file, you can add custom configuration options:

```js
// vite.config.js
import shopify from 'vite-plugin-shopify';
import shopifyAssets from 'vite-plugin-shopify-assets';

export default defineConfig({
  plugins: [
    // Barrel's vite-plugin-shopify
    shopify({
      themeRoot: 'theme',
      sourceCodeDir: 'frontend',
    }),

    // This plugin
    shopifyAssets({
      themeRoot: 'theme',
      publicDir: 'frontend/assets',
      targets: [
        // when targets are passed as strings, all target options use the default
        // Note: target sources are relative to publicDir
        'fonts/*.{woff,woff2,ttf,otf,svg}',
        'images/*.{jpg,jpeg,gif,png,webp,svg}',

        // when targets are passed as objects, you can specify options
        {
          // glob pattern for source assets
          src: '**/*.{js,liquid,text,md,json,css}',

          // glob patterns to ignore
          ignore: ['other-ignored/**/*', 'icons/**/*', 'images/**/*'],
        },

        {
          // when a non-static asset (eg: used in js) also needs to be copied as a static asset,
          // you can tell the plugin to find it elsewhere. Note: relative to publicDir
          src: '../icons/icon-*.svg',

          // the default destination is {themeRoot}/assets, but you can specify
          // a different source (relative to themeRoot)
          dest: 'snippets',

          // rename function, useful for making liquid snippets out of svg files for example
          rename: (file, ext, src) => `${file}.liquid`,

          // cleanMatch - USE WITH CAUTION:
          // glob pattern, relative to the dest folder, of files that should be cleaned/deleted
          // useful when the dest folder is not the default `{themeRoot}/assets` to avoid unused asset files
          // being shipped with the theme
          //
          // Only use this when you are certain that ALL files matching the pattern
          // have their source elsewhere and thus can be safely deleted
          cleanMatch: 'icon-*.liquid',
        },
      ],
    }),
  ],
});
```

The above configuration assumes the below folder structure:

```text
my-shopify-project/
  ├── frontend/
  │   ├── assets/
  │   │   ├── fonts/
  │   │   │   └── static-font.woff
  │   │   ├── images/
  │   │   │   └── static-image.png
  │   │   ├── other/
  │   │   │   └── static-script-1.js
  │   │   └── static-script-2.js
  │   └── icons/
  │       └── icon-arrow.svg
  └── theme/
      ├── assets/
      ├── config/
      ├── layout/
      ├── locales/
      ├── sections/
      ├── snippets/
      └── templates/
```

## Acknowledgements

- [Vite Plugin Shopify](https://github.com/barrel/shopify-vite/tree/main/packages/vite-plugin-shopify) by [Barrel/NY](https://github.com/barrel) (Thanks for the amazing plugins!)
- [Vite Plugin Static Copy](https://github.com/sapphi-red/vite-plugin-static-copy)

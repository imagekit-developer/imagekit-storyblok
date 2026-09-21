# ImageKit Storyblok Plugin

> **⚠️ Pre-release**  
> This plugin isn't published on Storyblok's App Directory yet. The feature set below matches what ImageKit ships for other CMSs (e.g. [Contentful](https://imagekit.io/docs/integration/contentful)), but it hasn't been through App Store submission, and the API may still change before a 1.0. If you choose to use or fork this project, consider pinning to a specific commit and watch the repository for updates.

A Storyblok [field plugin](https://www.storyblok.com/docs/plugins/field-plugins) that embeds the
[ImageKit Media Library Widget](https://imagekit.io/docs/dam/embeddable-media-library-widget),
letting content editors browse, search and select assets from ImageKit's DAM directly inside a
Storyblok field — no separate upload/manage step, no leaving the CMS.

## Features

- **Browse & select** assets from your ImageKit Media Library through the same widget UI ImageKit
  ships for its other CMS integrations — folders, search, AI-powered visual search, collections.
- **Multi-select that accumulates.** Reopening the widget in multi-select mode adds to the existing
  selection (deduped by asset) instead of wiping it out, so editors can build up a set of assets
  across multiple visits.
- **Inline preview.** Selected assets show as thumbnails with name/dimensions/size directly in the
  collapsed field — no need to reopen the widget to see what's selected. Video assets show a
  "Video" badge and duration instead of dimensions.
- **Manage without reopening the widget**: remove an asset, drag to reorder the selection, or open
  the original file in a new tab, all from the field itself.
- **Per-asset inline transformations.** Click the sliders icon on any selected asset to open an
  editor with a live preview and a free-text [ImageKit transformation
  string](https://imagekit.io/docs/transformations) (e.g. `w-400,h-300,fo-auto,e-grayscale`) —
  Apply bakes it into the asset's delivered `url`, so whatever a frontend fetches from the Content
  Delivery API already has it applied, no code change needed. Re-editing replaces the
  transformation cleanly (it doesn't compound), and Reset clears it back to the original. See
  "Stored data shape" below for exactly how this works.
- **Video support.** Selecting a video works the same as an image — it's stored with the same
  shape (plus `duration`), previewed with a thumbnail in the field, and the sample frontend renders
  it as a real `<video>` player rather than a broken `<img>`. Note that ImageKit's own per-file
  `fileType` metadata is `"image"` or `"non-image"` (never `"video"`) — the plugin identifies videos
  by `mime` instead (see `isVideoAsset()` in `src/components/ImageKitEmbeddableML/options.ts`).
- **No ImageKit ID required to get started** — if omitted, the widget authenticates as whichever
  ImageKit account is already signed in in the editor's browser. Set `imagekitId` explicitly only
  when a space may be used by people with access to more than one ImageKit account.
- **Widget & delivery configuration** matching what ImageKit exposes for other CMS integrations —
  starting folder/collection/search/file-type filters, and a default transformation/quality applied
  to delivered URLs.

## Plugin Options

These are configured per field when adding the plugin to a block schema in Storyblok
(`Block Library → your block → the plugin field → Edit field`, under **Add options**).
All of them are optional except where noted.

| Option key | Type | Description |
|---|---|---|
| `imagekitId` | string | Your ImageKit ID. Omit to authenticate as the signed-in editor's default ImageKit account. Set this explicitly if a space may be used by people with access to more than one ImageKit account. |
| `multiple` | `"true"` / `"false"` | Allow selecting more than one asset. Defaults to `true`. |
| `maxFiles` | numeric string, e.g. `"5"` | Caps the total selection (across multiple widget sessions) when `multiple` is `true`. Unlimited if unset. |
| `loginViaSSO` | `"true"` / `"false"` | Automatically start SSO sign-in when the widget opens, instead of showing ImageKit's login screen first. Defaults to `false`. |
| `folderPath` | string, e.g. `"/marketing/banners/"` | Folder the widget opens to initially. |
| `collectionId` | string, or `"all"` | A specific Media Collection to open initially, or `"all"` to open the collections list. |
| `searchQuery` | string, e.g. `name = "banner.jpg"` | Search query the widget opens with. See [ImageKit's search query syntax](https://imagekit.io/docs/api-reference/media-api/list-and-search-files#advanced-search-queries). |
| `fileType` | `"images"` \| `"videos"` \| `"cssJs"` \| `"others"` | Restrict the widget to one file type. |
| `transformation` | string, e.g. `"w-1200,q-80"` | [Transformation string](https://imagekit.io/docs/transformations) appended to the `url` of every asset selected **after** this option is set. Existing selections aren't retroactively changed — remove and re-select an asset to apply a new value, same as ImageKit's other CMS integrations. |
| `quality` | numeric string 1–100 | Convenience option folded into `transformation` as `q-<value>`. |

`folderPath`, `searchQuery`, `collectionId` and `fileType` all set the widget's *initial* view —
only one can be active at a time; if more than one is configured the plugin picks the first set in
that order and logs a console warning.

Invalid values (a non-numeric `maxFiles`, an unrecognized `fileType`, etc.) are ignored with a
console warning rather than breaking the field.

## Stored data shape

The selected assets are stored as an array on the field's content value:

```ts
type SelectedAsset = {
  fileId: string
  name: string
  filePath: string
  /** The URL a frontend should render — `originalUrl` with `transformation` applied, if set. */
  url: string
  /** The untransformed, canonical ImageKit URL. Always the base `transformation` is applied to. */
  originalUrl: string
  thumbnail: string
  fileType: string
  mime: string
  width: number
  height: number
  size: number
  tags?: string[]
  /** Seconds. Only present for video assets. */
  duration?: number
  /** ImageKit transformation string (e.g. "w-400,h-300,fo-auto") currently applied to `url`. */
  transformation?: string
}
```

`url` is always what you should render — it's `originalUrl` with `transformation` appended as a
`tr=` query param when one is set, computed once whenever an editor applies/clears it (in
`withTransformation()`, `src/components/ImageKitEmbeddableML/options.ts`) rather than on every
render. `originalUrl` and `transformation` exist so the field's own "edit transformation" UI can
re-open with the current value prefilled and replace it cleanly (not compound `tr=` params) —
a frontend that just reads `url` doesn't need to know either exists.

Storyblok never re-hosts the asset — the stored `url` points straight at ImageKit's CDN, so any
transformation parameters on it keep working unmodified when a frontend renders the field.

## Usage

For development, run the application locally with

```shell
npm run dev
```

and open the [Sandbox](https://plugin-sandbox.storyblok.com/field-plugin/).

## Deployment

Issue a [personal access token](https://app.storyblok.com/#/me/account?tab=token), rename `.env.local.example` to `.env.example`, set the value of `STORYBLOK_PERSONAL_ACCESS_TOKEN`, and run

```shell
npm run deploy
```

This builds the project and deploys it to your Storyblok account under `My account > My Plugins`.

For CI/CD, define `STORYBLOK_PERSONAL_ACCESS_TOKEN` as an environment variable and run:

```shell
npm run deploy --name $NAME --skipPrompts
```

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) does exactly this: on every push to
`main` it runs lint/typecheck/tests, then builds and deploys to the Partner Portal under the name
`imagekit` (matching `package.json`'s `name`, which is what ties a deploy to the *existing* plugin
rather than creating a new one). It needs a `STORYBLOK_PERSONAL_ACCESS_TOKEN` repository secret to
run — add that under the repo's Settings → Secrets and variables → Actions before pushing to `main`.

## Sample project

[`samples/storyblok-landing-page`](samples/storyblok-landing-page) is a full Next.js + TypeScript
demo that consumes Storyblok stories using this plugin — a shadcn-ui-styled landing page with a
hero, feature grid, and gallery, each with a field powered by the ImageKit plugin. Use it to test
end to end: deploy the plugin above, then follow that project's own README to wire up a Storyblok
space and run the frontend locally against it.

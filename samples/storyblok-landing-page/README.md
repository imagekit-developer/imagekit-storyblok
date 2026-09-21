# Storyblok + ImageKit sample landing page

A small Next.js (App Router, TypeScript) site that renders content from a Storyblok
space, including one field type — `imagekit` — powered by the field plugin in the
root of this repo (`../../`). Use it to see the full loop end to end: developer
defines a schema → marketer picks images in ImageKit → frontend renders the story.

It's built with Tailwind and hand-rolled shadcn-ui-style primitives
(`components/ui/button.tsx`, `components/ui/card.tsx`) — no external UI package,
so there's nothing to install beyond what's in `package.json`.

## What's in here

```
app/                    Next.js App Router: layout, home page, global styles
components/
  blocks/               One component per Storyblok component (page, hero, feature_grid, gallery)
  ui/                    button.tsx / card.tsx (shadcn-style primitives)
  StoryblokBridge.tsx    Client component wiring up the Visual Editor live-preview bridge
  StoryblokMedia.tsx     Renders an ImageKit asset — <img> for images, <video> for video assets
lib/
  storyblok.ts           storyblokInit() — registers components + API token
  types.ts               TypeScript types for stories/blocks, incl. ImageKitAsset
  utils.ts                cn(), firstAsset(), ikUrl(), isVideoAsset() helpers
storyblok/
  components/*.json      Reference schemas for the Storyblok components used here
  home-story.example.json Example story content matching those schemas
```

## Prerequisites

1. **A Storyblok space** (the same Partner Workspace / dev space you're using to test
   the field plugin works fine).
2. **The ImageKit field plugin installed in that space**, deployed from the repo root:
   ```bash
   cd ../.. && npm install && npm run deploy
   ```
   See the root [README](../../README.md) for the plugin's own setup.
3. **Node.js 18.17+** (this sample's `.nvmrc`-equivalent — check with `node -v`).

## 1. Create the components in Storyblok

In your space go to **Block Library → New Block** and create four components,
matching the schemas under [`storyblok/components/`](./storyblok/components/):

| Component      | Type       | Notes                                                                 |
| -------------- | ---------- | ---------------------------------------------------------------------- |
| `page`         | root       | Has one `body` field of type "Blocks", whitelisted to the three below |
| `hero`         | nestable   | `headline`, `subheadline`, `cta_label`, `cta_url`, and an `image` field |
| `feature_grid` | nestable   | `heading` + a `features` "Blocks" field whitelisted to `feature`      |
| `feature`      | nestable   | `title`, `description`, `icon`                                        |
| `gallery`      | nestable   | `heading` + an `images` field                                         |

For the `image`, `icon`, and `images` fields specifically:

1. Set **Field type** to **Plugin**.
2. Set **Custom field type name** to the field plugin's name (`imagekit`, or whatever
   you named it during `npm run deploy`).
3. Under the plugin's options, set:
   - `imagekitId` → your ImageKit media library ID (same one the widget uses)
   - `multiple` → `false` for `image`/`icon`, `true` for `images`
   - `maxFiles` → e.g. `12` for `images` (optional)

You can create these via the UI by hand, or paste the JSON from each file in
`storyblok/components/` using **Block Library → New Block → paste schema** (or the
[Management API](https://www.storyblok.com/docs/api/management/v1/components/components)
if you prefer scripting it) — just replace `YOUR_IMAGEKIT_ID` first.

## 2. Create the "Home" story

Create a story at the root of the Content section with slug `home`, using the `page`
component. Add one `hero`, one `feature_grid` (with a few `feature` entries), and one
`gallery` block to its body — [`storyblok/home-story.example.json`](./storyblok/home-story.example.json)
shows the shape to aim for. Leave the `image`/`icon`/`images` fields empty for now;
you'll fill them in via the ImageKit modal once everything's running.

## 3. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in:

- `NEXT_PUBLIC_STORYBLOK_CONTENT_TOKEN` — Space **Settings → Access Tokens** →
  copy the **Preview** token (this is safe to expose client-side; it only reads
  draft/published content, it can't write).
- `NEXT_PUBLIC_STORYBLOK_VERSION` — `draft` while developing.
- `NEXT_PUBLIC_STORYBLOK_REGION` — `eu` unless your space is on the US/China/AU
  infrastructure (space Settings shows this).

## 4. Install and run

```bash
npm install
npm run dev
```

`npm run dev` runs `next dev --experimental-https`, since Storyblok's Visual Editor
refuses to iframe plain `http://` — Next.js will generate a local self-signed
certificate on first run (accept the "not private" browser warning once, locally).
The app comes up at **https://localhost:3000**.

If you only need to view the page directly (not inside Storyblok's Visual Editor),
`npm run dev:http` skips the certificate step.

## 5. Point Storyblok's Visual Editor at it

In your space: **Settings → Visual Editor**, set:

- **Location**: `https://localhost:3000/`

Open the `home` story from the Content section — it should now load your running
Next.js app in the preview pane, with click-to-select block highlighting.

## 6. Select images through ImageKit

Click into the `image` field on the Hero block (or `icon` on a Feature, or `images`
on the Gallery). The field plugin's "Open modal" button launches ImageKit's media
library widget. Pick one or more assets, then click **Insert** in the widget's
toolbar (clicking a thumbnail only selects it — Insert is what fires the callback
that writes the asset data back into the field). The preview pane updates instantly
via the Visual Editor bridge (`useStoryblokState` in `StoryblokBridge.tsx`) — no
save/reload needed to see it.

## How the ImageKit field maps to the frontend

Every field using the plugin stores an array of asset objects shaped like this
(written by `setContent` in the plugin's `ModalToggle.tsx`):

```ts
type ImageKitAsset = {
  fileId: string
  name: string
  filePath: string
  url: string // e.g. https://ik.imagekit.io/your_id/photo.jpg
  thumbnail: string
  fileType: string
  mime: string
  width: number
  height: number
  size: number
}
```

`lib/types.ts` mirrors this as `ImageKitAsset`/`ImageKitField`. `StoryblokMedia.tsx`
renders `asset.url` directly, optionally appending an ImageKit transformation string
via `ikUrl()` (e.g. `w-1200,h-630,fo-auto,q-80` for a resized, auto-cropped, quality-80
JPEG/WebP) — see [ImageKit's transformation docs](https://imagekit.io/docs/transformations)
for the full parameter reference. Storyblok never re-hosts or proxies the image: the
browser fetches it straight from ImageKit's CDN at render time.

**`asset.url` is already delivery-ready** — if an editor applied a transformation to the asset
in Storyblok's field UI (the sliders icon next to a selected asset), it's baked into `url` at
that point, not something this frontend has to know about or apply itself.

**When a block also passes its own `transformation` to `ikUrl()` (as Hero/Gallery/FeatureGrid all
do, for a placement-specific size), the two are *chained*, not one replacing the other.** ImageKit
supports multi-step transformations via a `:`-separated `tr=` value — `ikUrl()` takes whatever
`url` already carries (an editor's `tr=e-grayscale`, say) and appends this placement's own
transformation as the next step: `tr=e-grayscale:w-1920,q-70,fo-auto`. So an editor's creative
edit (grayscale, a crop focus, a format hint) still shows up everywhere the asset is used, with
each placement's own sizing/quality layered on top.

Chaining does mean an editor-supplied transformation that duplicates what a placement already
controls (its own `w-`/`h-`) can produce a double-resize — e.g. an editor's `w-300,h-300` crop,
chained under the Hero's `w-1920`, upscales that 300px crop back up to 1920px. In practice this is
rare: the field's inline editor is meant for creative edits (color, focus, format), not
re-specifying sizing a block already owns. A field whose frontend usage never applies its own
`transformation` (i.e. always calls `<StoryblokMedia asset={asset} />` with no third prop) has no
such conflict — the editor's transformation is the only step, exactly as typed.

**Video assets render as a real `<video>` player**, not a broken `<img>`. ImageKit's own
per-file `fileType` is only ever `"image"` or `"non-image"` (never `"video"`) — `isVideoAsset()`
in `lib/utils.ts` checks `asset.mime.startsWith('video/')` instead, and `StoryblokMedia.tsx`
branches on that to render `<video controls poster={asset.thumbnail}>` with the URL as its source.

**A field the ImageKit plugin has never touched comes back from the API as `""`**
(Storyblok's default empty value for custom/plugin field types), not `[]` or
`undefined`. Always read these fields through `assetList()`/`firstAsset()` in
`lib/utils.ts` rather than assuming the array shape directly — see `Gallery.tsx` for
the pattern.

## Implementation notes (things that will bite you if you skip them)

Verified by actually running this app against a live space, editing a field, and
confirming the change shows up on refresh — two non-obvious things had to be fixed
to make that work:

1. **`storyblokInit()` must run in both the server and client module graphs.**
   Next.js's App Router bundles Server Components and Client Components separately.
   `app/page.tsx` (a Server Component) needs `storyblokInit()` to have run so
   `getStoryblokApi()` works for its data fetch — but `<StoryblokComponent>`, which
   resolves `"page"` → `Page`, `"hero"` → `Hero`, etc., renders inside
   `StoryblokBridge.tsx` (a Client Component, needed for the Visual Editor's
   live-preview bridge). Those are two separate module instances of
   `@storyblok/react`'s internal component registry. Importing `@/lib/storyblok`
   only in `layout.tsx` silently breaks block resolution with `Component page
   doesn't exist.` — `StoryblokBridge.tsx` re-imports it for exactly this reason.
2. **Draft content needs an explicit cache-busting `cv` on every request.**
   Storyblok's CDN API pins a response to a "cache version" (`cv`) query param. If
   you never pass one, `storyblok-js-client` reuses whatever `cv` answered its
   *first* request for the lifetime of the process — so every request after that
   can keep returning the same stale snapshot, even with `dynamic = 'force-dynamic'`
   and no Next.js-level caching involved. `app/page.tsx` passes `cv: Date.now()` for
   `draft` requests to force a fresh read every time; `published` requests omit it
   so a real storefront still benefits from Storyblok's normal CDN caching
   (invalidated on publish).

## Production build

```bash
npm run build
npm run start
```

Set `NEXT_PUBLIC_STORYBLOK_VERSION=published` for a production deployment so it
serves published stories instead of drafts.

# Custom door designs

Drop PNG/JPG images of your front-panel designs here, then list them in
`src/editor/doors.js` → `CUSTOM_DESIGNS`.

## How

1. Save the image into this folder, e.g. `oak-grain.jpg`.
2. Open `src/editor/doors.js`.
3. Add an entry to `CUSTOM_DESIGNS`:
   ```js
   { id: 'custom-oak-grain', label: 'Oak Grain', src: '/door-designs/oak-grain.jpg' }
   ```
4. Reload the app. Your design appears as a new thumbnail in the door-style
   picker, alongside Slab / Shaker / Glass / Mirror / Fluted. Works for
   hinged and sliding panels both.

## Notes

- `id` must be unique. Convention: prefix with `custom-`.
- `label` is what users see in the picker.
- `src` is the URL Vite serves — the leading `/` matters.
- Aspect ratio: doors are typically tall (around 1:3 or 1:4). Images are
  rendered with `preserveAspectRatio="xMidYMid slice"` — they'll fill the
  door area and crop edges if the aspect ratio doesn't match. Centre the
  important detail of your design.
- Custom designs ignore the finish picker (the image *is* the finish).
- Recommended max size ~500 KB per image — these load every render.

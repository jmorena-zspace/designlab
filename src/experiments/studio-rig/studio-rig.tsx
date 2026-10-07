// Where the finished 3D page lives. Everything in the "public" folder is served as-is,
// so the studio rig (a single self-contained HTML file) sits at public/studio-rig/index.html.
// BASE_URL keeps the path correct on GitHub Pages too, where the site is in a sub-folder.
const studioRigUrl = `${import.meta.env.BASE_URL}studio-rig/index.html`

// The skull model inside that file was made lighter for the web:
//  - mesh: ~145k -> ~73k triangles (gltfpack: -si 0.5 -sa), positions/UVs/normals quantized
//  - texture: 4096x4096 -> 2048x2048 JPEG (quality 80)
//  - the model went from 5.7 MB to 1.4 MB; the whole page from 8.5 MB to 2.8 MB.
export default function StudioRigExperiment() {
  return (
    <main className="fixed inset-0 bg-black">
      {/* An iframe is a "page inside a page", so the rig's own styles and scripts stay separate.
          allow="camera" lets it ask for the webcam (head and hand tracking). */}
      <iframe
        src={studioRigUrl}
        title="Studio rig"
        className="h-full w-full border-0"
        allow="camera; fullscreen"
      />
    </main>
  )
}

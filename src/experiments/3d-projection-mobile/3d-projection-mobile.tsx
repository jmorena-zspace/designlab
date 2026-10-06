// Where the finished 3D page lives. Everything in the "public" folder is served as-is,
// so the original HTML file (untouched) sits at public/3d-projection-mobile/index.html.
// BASE_URL keeps the path correct on GitHub Pages too, where the site is in a sub-folder.
const projectionPageUrl = `${import.meta.env.BASE_URL}3d-projection-mobile/index.html`

export default function ThreeDProjectionMobileExperiment() {
  return (
    <main className="fixed inset-0 bg-black">
      {/* An iframe is a "page inside a page". It keeps the 3D HTML completely separate,
          so its own styles and scripts can't clash with the React app. */}
      <iframe
        src={projectionPageUrl}
        title="3D projection mobile"
        className="h-full w-full border-0"
        // Lets the page use the phone's motion/orientation sensors if it asks for them.
        allow="accelerometer; gyroscope; fullscreen"
      />
    </main>
  )
}

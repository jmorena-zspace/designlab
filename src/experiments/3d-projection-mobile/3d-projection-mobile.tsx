import { InfoExplainer } from '@/components/info/info-explainer'

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

      <InfoExplainer title="How this was built">
        <p>
          <strong>The idea:</strong> a 3D home scene made for phones. Touch and drag to move around
          it; the panel on the right holds its tuning sliders.
        </p>
        <p>
          <strong>The tools:</strong> the page is a single self-contained HTML file (Three.js is
          bundled inside it). It was added exactly as it was given, with no changes.
        </p>
        <p>
          <strong>How it's plugged in:</strong> the file lives in{' '}
          <code>public/3d-projection-mobile/index.html</code>, and this React page shows it full
          screen inside an <code>&lt;iframe&gt;</code>. The iframe keeps its styles and scripts
          separate from the rest of the app.
        </p>
        <p>
          <strong>To tweak:</strong> edit the HTML file directly (its sliders and colors are inside
          it), or change <code>projectionPageUrl</code> at the top of{' '}
          <code>3d-projection-mobile.tsx</code> to point at a different file.
        </p>
      </InfoExplainer>
    </main>
  )
}

import { useEffect, useState } from 'react'
import { Toaster } from '@/components/ui/sonner'
import ConsolidatedSearchExperiment from '@/experiments/consolidated-search'
import DataTablesExperiment from '@/experiments/data-tables'
import NodeBasedAssignmentExperiment from '@/experiments/node-based-assignment/node-based-assignment'
import DeviceInfoExperiment from '@/experiments/device-info'
import StudioRigExperiment from '@/experiments/studio-rig/studio-rig'
import ThreeDProjectionMobileExperiment from '@/experiments/3d-projection-mobile/3d-projection-mobile'

// Simple navigation without a router library: the part of the URL after "#"
// decides which screen shows. "#/device-info" opens the Device info experiment;
// anything else shows the home screen.
// TO ADD AN EXPERIMENT: import it above, then add a line to `experiments` below.
const experiments = [
  { path: '/device-info', title: 'Device info', page: DeviceInfoExperiment },
  { path: '/data-tables', title: 'Data tables', page: DataTablesExperiment },
  { path: '/consolidated-search', title: 'Consolidated search', page: ConsolidatedSearchExperiment },
  { path: '/node-based-assignment', title: 'Node based assignment', page: NodeBasedAssignmentExperiment },
  { path: '/3d-projection-mobile', title: '3D projection mobile', page: ThreeDProjectionMobileExperiment },
  { path: '/studio-rig', title: 'Studio rig', page: StudioRigExperiment },
]

export default function App() {
  // Remember the current "#" part of the URL, and update it when it changes.
  const [currentPath, setCurrentPath] = useState(window.location.hash.slice(1))
  useEffect(() => {
    const updatePath = () => setCurrentPath(window.location.hash.slice(1))
    window.addEventListener('hashchange', updatePath)
    return () => window.removeEventListener('hashchange', updatePath)
  }, [])

  // If the URL matches an experiment, show that experiment.
  const openExperiment = experiments.find((experiment) => experiment.path === currentPath)
  if (openExperiment) {
    const ExperimentPage = openExperiment.page
    return (
      <>
        <ExperimentPage />
        {/* Shows toast messages (like "Export successful") for every experiment. */}
        <Toaster />
      </>
    )
  }

  // Otherwise show the home screen.
  return (
    <main className="min-h-svh p-8 md:p-12">
      <header className="pt-12 text-left">
        <h1 className="font-sans text-7xl font-bold tracking-tight md:text-7xl">
          Juan's Design Lab
        </h1>
        <p className="mt-4 text-lg text-muted-foreground md:text-xl">
          This is where I will play around with crazy ideas that don't fit anywhere else
        </p>
      </header>

      {/* One link per experiment. */}
      <nav className="mt-12 flex flex-col items-start gap-2">
        {experiments.map((experiment) => (
          <a
            key={experiment.path}
            href={`#${experiment.path}`}
            className="text-lg font-medium underline underline-offset-4"
          >
            {experiment.title}
          </a>
        ))}
      </nav>
    </main>
  )
}

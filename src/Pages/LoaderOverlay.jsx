import { Spinner } from "./Spinner.jsx"

export default function LoaderOverlay({ isLoading, message = "Loading..." }) {
  if (!isLoading) return null

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl p-8 flex flex-col items-center gap-4">
        <Spinner className="size-8 text-blue-600" />
        <p className="text-slate-700 font-medium">{message}</p>
      </div>
    </div>
  )
}

const LoaderReact = ({ loading }) => {
  if (!loading) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white bg-opacity-90 rounded-lg shadow-lg p-8 flex flex-col items-center gap-4">
        {/* Spinner */}
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent border-r-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-gray-700 font-medium">Please wait...</p>
      </div>
    </div>
  )
}

export default LoaderReact;

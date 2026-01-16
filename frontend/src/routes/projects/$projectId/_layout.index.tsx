import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/projects/$projectId/_layout/')({
  component: RouteComponent,
})

function RouteComponent() {
   return (
     <div className="flex-1 flex items-center justify-center text-gray-500">
      <div className="text-center">
        <p className="text-lg mb-2">No chat selected</p>
        <p className="text-sm">Select a chat from the sidebar or create a new one</p>
      </div>
    </div>
  )
}

import {
  createFileRoute,
  Outlet,
  useNavigate,
  useParams,
} from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { api, type Project, type Chat } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar'

import { Plus, Trash, Gear, ArrowLeft } from '@phosphor-icons/react'

export const Route = createFileRoute('/projects/$projectId/_layout')({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  const { projectId } = Route.useParams()

  const { user, isLoading: authLoading } = useAuth()

  const [project, setProject] = useState<Project | null>(null)
  const [chats, setChats] = useState<Chat[]>([])
  const [isLoading, setIsLoading] = useState(true)

  /* ---------- Settings dialog state ---------- */
  const [showSettings, setShowSettings] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [editedDescription, setEditedDescription] = useState('')
  const [editedSystemPrompt, setEditedSystemPrompt] = useState('')

  /* ---------- Auth + Data ---------- */
  useEffect(() => {
    if (authLoading) return

    if (!user) {
      navigate({ to: '/login' })
      return
    }

    loadProject()
    loadChats()
  }, [authLoading, user, projectId])

  const loadProject = async () => {
    try {
      const { project } = await api.getProject(projectId)
      setProject(project)
      setEditedName(project.name)
      setEditedDescription(project.description || '')
      setEditedSystemPrompt(project.system_prompt || '')
    } finally {
      setIsLoading(false)
    }
  }

  const loadChats = async () => {
    const { chats } = await api.getChats(projectId)
    setChats(chats)
  }

  /* ---------- Chat actions ---------- */
  const handleCreateChat = async () => {
    const { chat } = await api.createChat(projectId)
    setChats((prev) => [chat, ...prev])
    navigate({ to: `/projects/${projectId}/${chat.id}` })
  }

  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this chat?')) return

    await api.deleteChat(projectId, chatId)
    setChats((prev) => prev.filter((c) => c.id !== chatId))
  }

  /* ---------- Project update ---------- */
  const handleUpdateProject = async () => {
    if (!project) return

    const { project: updated } = await api.updateProject(projectId, {
      name: editedName,
      description: editedDescription || undefined,
      system_prompt: editedSystemPrompt || undefined,
    })

    setProject(updated)
    setShowSettings(false)
  }

  /* ---------- States ---------- */
  if (authLoading || isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        Loading...
      </div>
    )
  }

  if (!project) {
    return (
      <div className="h-screen flex items-center justify-center">
        Project not found
      </div>
    )
  }

  /* ---------- Layout ---------- */
  return (
    <SidebarProvider>
      <div className="h-screen flex flex-col bg-gray-50 w-full">
        {/* Sidebar + Content */}
        <div className="flex-1 flex overflow-hidden">
          <Sidebar collapsible="offExamples" className="flex flex-col">
            <SidebarHeader className="border-b space-y-2 flex-shrink-0">
              <Button className="w-full" onClick={handleCreateChat}>
                <Plus className="mr-2" size={16} />
                New Chat
              </Button>
            </SidebarHeader>

            <SidebarContent className="flex-1 overflow-y-auto">
              <SidebarMenu>
                {chats.map((chat) => (
                  <SidebarMenuItem key={chat.id}>
                    <SidebarMenuButton
                      onClick={() =>
                        navigate({
                          to: `/projects/${projectId}/${chat.id}`,
                        })
                      }
                      className="justify-between group"
                    >
                      <span className="truncate">
                        Chat {new Date(chat.created_at).toLocaleDateString()}
                      </span>
                      <button
                        onClick={(e) => handleDeleteChat(chat.id, e)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded"
                      >
                        <Trash size={14} className="text-destructive" />
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarContent>
          </Sidebar>

          <SidebarInset className="flex flex-col">
            {/* Header */}
            <header className="bg-white border-b p-4 flex justify-between items-center">
              <div className="flex gap-4 items-center">
                <SidebarTrigger />
                <Button
                  variant="outline"
                  onClick={() => navigate({ to: '/dashboard' })}
                >
                  <ArrowLeft className="mr-2" size={16} />
                  Back
                </Button>
                <h1 className="text-xl font-bold">{project.name}</h1>
              </div>

              <Button variant="outline" onClick={() => setShowSettings(true)}>
                <Gear className="mr-2" size={16} />
                Settings
              </Button>
            </header>
            <Outlet />
          </SidebarInset>
        </div>

        {/* Settings Dialog */}
        <AlertDialog open={showSettings} onOpenChange={setShowSettings}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Project Settings</AlertDialogTitle>
              <AlertDialogDescription>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>Project Name</Label>
                    <Input
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label>System Prompt</Label>
                    <Textarea
                      rows={6}
                      value={editedSystemPrompt}
                      onChange={(e) => setEditedSystemPrompt(e.target.value)}
                    />
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleUpdateProject}>
                Save
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </SidebarProvider>
  )
}

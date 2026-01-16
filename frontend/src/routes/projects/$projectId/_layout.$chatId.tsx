import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { api, type Message } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/field'
import { useForm } from '@tanstack/react-form'
import * as z from 'zod'
export const Route = createFileRoute('/projects/$projectId/_layout/$chatId')({
  component: RouteComponent,
})

const messageSchema = z.object({
  message: z.string().min(1),
})
function RouteComponent() {
  const { projectId, chatId } = Route.useParams()
   const [messages, setMessages] = useState<Message[]>([])
   const [isSending, setIsSending] = useState(false)
   const [isLoading, setIsLoading] = useState(true)
   const messagesEndRef = useRef<HTMLDivElement>(null)
 
   const messageForm = useForm({
     defaultValues: {
       message: '',
     },
     validators: {
       onSubmit: messageSchema,
     },
     onSubmit: async ({ value }) => {
       await handleSendMessage(value.message)
     },
   })
 
   useEffect(() => {
     loadMessages()
   }, [chatId])
 
   useEffect(() => {
     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
   }, [messages])
 
   const loadMessages = async () => {
     setIsLoading(true)
     try {
       const { messages } = await api.getChat(projectId, chatId)
       setMessages(messages)
     } catch (error) {
       console.error('Failed to load messages:', error)
     } finally {
       setIsLoading(false)
     }
   }
 
   const handleSendMessage = async (text: string) => {
     if (isSending) return
     const trimmed = text.trim()
     if (!trimmed) return
 
     messageForm.reset()
     setIsSending(true)
 
     const tempId = `temp-ai-${Date.now()}`
     const tempAiMessage: Message = {
       id: tempId,
       chat_id: chatId,
       role: 'assistant',
       content: '',
       created_at: new Date().toISOString(),
     }
 
     try {
       await api.sendMessageStream(
         projectId,
         chatId,
         trimmed,
         (chunk) => {
           setMessages((prev) => {
             const updated = [...prev]
             const idx = updated.findIndex((m) => m.id === tempId)
             if (idx !== -1) {
               updated[idx] = {
                 ...updated[idx],
                 content: updated[idx].content + chunk,
               }
             }
             return updated
           })
         },
         (userMessage) => {
           setMessages((prev) => [...prev, userMessage, tempAiMessage])
         },
         (aiMessage) => {
           setMessages((prev) =>
             prev.filter((m) => m.id !== tempId).concat(aiMessage),
           )
           setIsSending(false)
         },
         () => setIsSending(false),
       )
     } catch {
       setIsSending(false)
     }
   }
 
   if (isLoading) {
     return (
       <div className="flex-1 flex items-center justify-center">
         <p>Loading chat...</p>
       </div>
     )
   }
 
   return (
     <>
       <div className="flex-1 overflow-y-auto p-6 space-y-4">
         {messages.map((m) => (
           <div
             key={m.id}
             className={`flex ${
               m.role === 'user' ? 'justify-end' : 'justify-start'
             }`}
           >
             <Card
               className={`max-w-2xl p-4 rounded-4xl ${
                 m.role === 'user'
                   ? 'bg-primary/50 text-white'
                   : 'bg-white'
               }`}
             >
               {m.content}
             </Card>
           </div>
         ))}
         <div ref={messagesEndRef} />
       </div>
 
       {/* Chat Input */}
       <div className="px-4 py-3">
         <form
           onSubmit={(e) => {
             e.preventDefault()
             messageForm.handleSubmit()
           }}
           className="max-w-4xl mx-auto"
         >
           <div className="flex items-center gap-2 border border-border bg-card px-3 py-2 shadow-sm rounded-full focus-within:ring-1 focus-within:ring-ring transition">
             <messageForm.Field
               name="message"
               children={(field) => (
                 <Field className="flex-1">
                   <Input
                     value={field.state.value}
                     onChange={(e) => field.handleChange(e.target.value)}
                     onBlur={field.handleBlur}
                     placeholder="Type your message…"
                     disabled={isSending}
                     className="border-0 bg-transparent px-1 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
                     onKeyDown={(e) => {
                       if (e.key === 'Enter' && !e.shiftKey) {
                         e.preventDefault()
                         messageForm.handleSubmit()
                       }
                     }}
                   />
                 </Field>
               )}
             />
 
             <Button
               type="submit"
               disabled={isSending || !messageForm.state.values.message.trim()}
               className="h-9 px-4 text-sm bg-primary rounded-full text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
             >
               {isSending ? 'Sending…' : 'Send'}
             </Button>
           </div>
         </form>
       </div>
     </>
   )
}

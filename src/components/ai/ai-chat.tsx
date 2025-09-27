// Panel de Chat IA
"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Mic, Send, Bot, User, MicOff } from "lucide-react"

interface AIChatProps {
  diagramId: string | null
  onAIAction?: (action: any) => void
}

interface Message {
  id: string
  type: "user" | "ai"
  content: string
  timestamp: Date
}

interface AIAction {
  type: string
  data: any
}

export function AIChat({ diagramId, onAIAction }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "ai",
      content:
        '¡Hola! Soy tu asistente IA para diagramas UML. Comandos simples:\n\n• "añadir clase Usuario" - Crea una clase\n• "conectar Usuario con Pedido" - Crea relación\n• "agregar atributo nombre a Usuario" - Añade atributo\n• "sistema de tienda" - Genera diagrama completo\n\n¿Qué necesitas?',
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return () => {
      if (audioStream) {
        audioStream.getTracks().forEach((track) => track.stop())
      }
      if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop()
      }
    }
  }, [audioStream, mediaRecorder])

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]")
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputValue,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: inputValue,
          diagramId: diagramId,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to get AI response")
      }

      const data = await response.json()

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: data.response,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, aiMessage])

      if (data.actions && data.actions.length > 0) {
        data.actions.forEach((action: AIAction) => {
          if (onAIAction) {
            onAIAction(action)
          }
        })
      }
    } catch (error) {
      console.error("Error sending message:", error)
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        type: "ai",
        content: "Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta de nuevo.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleVoiceInput = async () => {
    if (!isRecording) {
      try {
        if (audioStream) {
          audioStream.getTracks().forEach((track) => track.stop())
          setAudioStream(null)
        }

        const permissionStatus = await navigator.permissions.query({ name: "microphone" as PermissionName })
        if (permissionStatus.state === "denied") {
          const errorMessage: Message = {
            id: Date.now().toString(),
            type: "ai",
            content:
              "El acceso al micrófono está bloqueado. Para habilitarlo:\n\n1. Haz clic en el ícono del candado o micrófono en la barra de direcciones\n2. Selecciona 'Permitir' para el micrófono\n3. Recarga la página\n\nTambién puedes escribir tu mensaje normalmente.",
            timestamp: new Date(),
          }
          setMessages((prev) => [...prev, errorMessage])
          return
        }
      } catch (error) {
        console.log(" Permission API not supported, continuing with audio access attempt")
      }

      try {
        let testStream: MediaStream
        try {
          testStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              sampleRate: { ideal: 16000 },
              channelCount: { ideal: 1 },
            },
          })
        } catch (constraintError) {
          console.log(" Ideal constraints failed, trying basic audio")
          testStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          })
        }

        setAudioStream(testStream)

        if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
          startSpeechRecognition()
          return
        }

        testStream.getTracks().forEach((track) => track.stop())
        setAudioStream(null)

        const errorMessage: Message = {
          id: Date.now().toString(),
          type: "ai",
          content:
            "El reconocimiento de voz no está disponible en este navegador. Intenta usar Chrome, Edge o Safari. Por ahora, puedes escribir tu mensaje normalmente.",
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, errorMessage])
      } catch (error) {
        console.error(" Error accessing microphone:", error)

        let errorText = "No pude acceder al micrófono. Verifica los permisos del navegador."
        if (error instanceof DOMException) {
          switch (error.name) {
            case "NotAllowedError":
              errorText =
                "Acceso al micrófono denegado. Haz clic en el ícono del micrófono en la barra de direcciones, permite el acceso y recarga la página."
              break
            case "NotFoundError":
              errorText =
                "No se encontró ningún micrófono. Verifica que tu dispositivo tenga un micrófono conectado y funcionando."
              break
            case "NotReadableError":
            case "AbortError":
              errorText =
                "El micrófono está siendo usado por otra aplicación o pestaña del navegador. Soluciones:\n\n• Cierra otras pestañas que puedan estar usando el micrófono\n• Cierra aplicaciones como Zoom, Teams, Discord, etc.\n• Reinicia el navegador\n• Si el problema persiste, reinicia tu computadora\n\nPor ahora, puedes escribir tu mensaje normalmente."
              break
            case "OverconstrainedError":
              errorText =
                "Las configuraciones del micrófono no son compatibles con tu dispositivo. Intenta con un micrófono diferente."
              break
            case "SecurityError":
              errorText =
                "Error de seguridad al acceder al micrófono. Asegúrate de estar usando HTTPS y permite el acceso al micrófono."
              break
            default:
              errorText = `Error de micrófono: ${error.message}. Intenta escribir tu mensaje normalmente.`
          }
        }

        const errorMessage: Message = {
          id: Date.now().toString(),
          type: "ai",
          content: errorText,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, errorMessage])
      }
    } else {
      if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop()
        setIsRecording(false)
        setMediaRecorder(null)
      }

      if (audioStream) {
        audioStream.getTracks().forEach((track) => track.stop())
        setAudioStream(null)
      }
    }
  }

  const startSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      console.error(" Speech recognition not supported")
      if (audioStream) {
        audioStream.getTracks().forEach((track) => track.stop())
        setAudioStream(null)
      }

      const errorMessage: Message = {
        id: Date.now().toString(),
        type: "ai",
        content: "El reconocimiento de voz no está disponible en este navegador. Intenta usar Chrome o Edge.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
      return
    }

    const recognition = new SpeechRecognition()

    recognition.lang = "es-ES"
    recognition.continuous = false
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      console.log(" Speech recognition started")
      setIsRecording(true)
    }

    recognition.onresult = (event: any) => {
      console.log(" Speech recognition result:", event.results[0][0].transcript)
      const transcript = event.results[0][0].transcript
      setInputValue(transcript)
      setIsRecording(false)

      if (audioStream) {
        audioStream.getTracks().forEach((track) => track.stop())
        setAudioStream(null)
      }
    }

    recognition.onerror = (event: any) => {
      console.error(" Speech recognition error:", event.error)
      setIsRecording(false)

      if (audioStream) {
        audioStream.getTracks().forEach((track) => track.stop())
        setAudioStream(null)
      }

      let errorText = "No pude escuchar bien. Intenta escribir tu mensaje o verifica que el micrófono esté habilitado."

      switch (event.error) {
        case "audio-capture":
          errorText =
            "No se pudo capturar audio del micrófono. Posibles soluciones:\n\n• Verifica que el micrófono esté conectado y funcionando\n• Permite el acceso al micrófono cuando el navegador lo solicite\n• Cierra otras aplicaciones que puedan estar usando el micrófono (Zoom, Teams, Discord, etc.)\n• Cierra otras pestañas del navegador que puedan estar usando el micrófono\n• Intenta recargar la página\n• Si el problema persiste, reinicia el navegador\n\nPor ahora, puedes escribir tu mensaje normalmente."
          break
        case "not-allowed":
          errorText =
            "Acceso al micrófono denegado. Haz clic en el ícono del micrófono en la barra de direcciones y permite el acceso, luego recarga la página."
          break
        case "no-speech":
          errorText =
            "No se detectó ningún sonido. Intenta hablar más cerca del micrófono y asegúrate de que no esté silenciado."
          break
        case "network":
          errorText = "Error de conexión. Verifica tu conexión a internet e intenta de nuevo."
          break
        case "service-not-allowed":
          errorText = "El servicio de reconocimiento de voz no está disponible. Intenta escribir tu mensaje."
          break
        case "bad-grammar":
          errorText = "Error en el reconocimiento de voz. Intenta hablar más claramente y despacio."
          break
        default:
          errorText = `Error de reconocimiento de voz: ${event.error}. Intenta escribir tu mensaje.`
      }

      const errorMessage: Message = {
        id: Date.now().toString(),
        type: "ai",
        content: errorText,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    }

    recognition.onend = () => {
      console.log(" Speech recognition ended")
      setIsRecording(false)

      if (audioStream) {
        audioStream.getTracks().forEach((track) => track.stop())
        setAudioStream(null)
      }
    }

    try {
      recognition.start()
    } catch (error) {
      console.error(" Error starting speech recognition:", error)
      setIsRecording(false)

      if (audioStream) {
        audioStream.getTracks().forEach((track) => track.stop())
        setAudioStream(null)
      }

      const errorMessage: Message = {
        id: Date.now().toString(),
        type: "ai",
        content: "No se pudo iniciar el reconocimiento de voz. Intenta escribir tu mensaje.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const quickActions = [
    { label: "Añadir clase", action: "añadir clase Producto" },
    { label: "Crear relación", action: "conectar Usuario con Pedido" },
    { label: "Sistema completo", action: "crear sistema de e-commerce" },
  ]

  const handleQuickAction = (action: string) => {
    setInputValue(action)
  }

  return (
    <div className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bot className="w-5 h-5 text-blue-600" />
          Asistente IA
          {isLoading && <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea ref={scrollAreaRef} className="flex-1 px-4">
          <div className="space-y-4 pb-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.type === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.type === "ai" && (
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] p-3 rounded-lg text-sm whitespace-pre-line ${
                    message.type === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  }`}
                >
                  {message.content}
                </div>

                {message.type === "user" && (
                  <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    />
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-2 mb-2">
            {quickActions.map((quickAction, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="text-xs bg-transparent"
                onClick={() => handleQuickAction(quickAction.action)}
              >
                {quickAction.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Describe tu diagrama o pide ayuda..."
                className="pr-10"
                disabled={isLoading}
              />
              <Button
                variant="ghost"
                size="sm"
                className={`absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 ${
                  isRecording ? "text-red-500" : "text-gray-400"
                }`}
                onClick={handleVoiceInput}
                disabled={isLoading}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
            </div>
            <Button onClick={handleSendMessage} disabled={!inputValue.trim() || isLoading}>
              <Send className="w-4 h-4" />
            </Button>
          </div>

          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {isRecording ? "Grabando... Habla ahora" : "Presiona Enter para enviar, Shift+Enter para nueva línea"}
          </div>
        </div>
      </CardContent>
    </div>
  )
}

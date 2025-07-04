"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { MessageCircle, Send, Plus, Users, LogOut, Hash } from "lucide-react"

interface Room {
  id: string
  name: string
  description: string
}

interface Message {
  id: string
  content: string
  username: string
  created_at: string
}

interface User {
  id: string
  username: string
  email: string
}

export default function ChatPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [activeRoom, setActiveRoom] = useState<Room | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [onlineUsers, setOnlineUsers] = useState<User[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [newRoomName, setNewRoomName] = useState("")
  const [showCreateRoom, setShowCreateRoom] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    const token = localStorage.getItem("auth-token")
    if (!token) {
      router.push("/auth/login")
      return
    }

    // Fetch user profile
    fetchProfile(token)
    // Fetch user rooms
    fetchRooms(token)
  }, [router])

  useEffect(() => {
    if (activeRoom) {
      fetchMessages(activeRoom.id)
      fetchOnlineUsers(activeRoom.id)
      connectWebSocket(activeRoom.id)
    }
  }, [activeRoom])

  const fetchProfile = async (token: string) => {
    try {
      const response = await fetch("http://localhost:8080/api/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error)
    }
  }

  const fetchRooms = async (token: string) => {
    try {
      const response = await fetch("http://localhost:8080/api/chat/rooms", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (response.ok) {
        const roomsData = await response.json()
        setRooms(roomsData || [])
      }
    } catch (error) {
      console.error("Failed to fetch rooms:", error)
    }
  }

  const fetchMessages = async (roomId: string) => {
    const token = localStorage.getItem("auth-token")
    try {
      const response = await fetch(`http://localhost:8080/api/chat/rooms/${roomId}/messages`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (response.ok) {
        const messagesData = await response.json()
        setMessages(messagesData || [])
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error)
    }
  }

  const fetchOnlineUsers = async (roomId: string) => {
    const token = localStorage.getItem("auth-token")
    try {
      const response = await fetch(`http://localhost:8080/api/chat/rooms/${roomId}/online`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (response.ok) {
        const usersData = await response.json()
        setOnlineUsers(usersData || [])
      }
    } catch (error) {
      console.error("Failed to fetch online users:", error)
    }
  }

  const connectWebSocket = (roomId: string) => {
    const token = localStorage.getItem("auth-token")
    const wsUrl = `ws://localhost:8080/ws?token=${token}&room=${roomId}`

    const websocket = new WebSocket(wsUrl)

    websocket.onopen = () => {
      console.log("WebSocket connected")
    }

    websocket.onmessage = (event) => {
      const message = JSON.parse(event.data)
      setMessages((prev) => [...prev, message])
    }

    websocket.onclose = () => {
      console.log("WebSocket disconnected")
    }

    setWs(websocket)

    return () => {
      websocket.close()
    }
  }

  const createRoom = async () => {
    const token = localStorage.getItem("auth-token")
    try {
      const response = await fetch("http://localhost:8080/api/chat/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newRoomName }),
      })
      if (response.ok) {
        setNewRoomName("")
        setShowCreateRoom(false)
        fetchRooms(token!)
      }
    } catch (error) {
      console.error("Failed to create room:", error)
    }
  }

  const sendMessage = () => {
    if (ws && newMessage.trim() && activeRoom) {
      ws.send(
        JSON.stringify({
          type: "message",
          content: newMessage,
          room_id: activeRoom.id,
        }),
      )
      setNewMessage("")
    }
  }

  const logout = () => {
    localStorage.removeItem("auth-token")
    document.cookie = "auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT"
    router.push("/auth/login")
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-6 w-6 text-blue-600" />
              <h1 className="text-xl font-bold">TapMe</h1>
            </div>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
          {user && <p className="text-sm text-gray-600 mt-1">Welcome, {user.username}</p>}
        </div>

        {/* Rooms */}
        <div className="flex-1 overflow-hidden">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">Rooms</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowCreateRoom(!showCreateRoom)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {showCreateRoom && (
              <div className="mb-3 space-y-2">
                <Input placeholder="Room name" value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} />
                <div className="flex space-x-2">
                  <Button size="sm" onClick={createRoom}>
                    Create
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowCreateRoom(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

          <ScrollArea className="flex-1 px-4">
            <div className="space-y-1">
              {rooms.map((room) => (
                <Button
                  key={room.id}
                  variant={activeRoom?.id === room.id ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveRoom(room)}
                >
                  <Hash className="h-4 w-4 mr-2" />
                  {room.name}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Online Users */}
        {activeRoom && onlineUsers.length > 0 && (
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center space-x-2 mb-2">
              <Users className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Online ({onlineUsers.length})</span>
            </div>
            <div className="space-y-1">
              {onlineUsers.slice(0, 5).map((user) => (
                <div key={user.id} className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">{user.username}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeRoom ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center space-x-2">
                <Hash className="h-5 w-5 text-gray-600" />
                <h2 className="text-lg font-semibold">{activeRoom.name}</h2>
                <Badge variant="secondary">{onlineUsers.length} online</Badge>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className="flex space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{message.username.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-sm">{message.username}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(message.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mt-1">{message.content}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex space-x-2">
                <Input
                  placeholder={`Message #${activeRoom.name}`}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                />
                <Button onClick={sendMessage}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Welcome to TapMe</h3>
              <p className="text-gray-600">Select a room to start chatting or create a new one</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

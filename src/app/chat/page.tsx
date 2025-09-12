"use client";
import { useEffect, useState, useMemo } from "react";

type Room = {
  id: string;
  name: string | null;
  type: 'room' | 'dm';
};

type User = {
  id: string;
  walletAddress: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
};

// Default avatar placeholder
const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%230066ff'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";

export default function ChatPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [newRoom, setNewRoom] = useState("");
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [activeUser, setActiveUser] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [activeTab, setActiveTab] = useState<'rooms' | 'people'>('rooms');
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Filter rooms based on search and type
  const filteredRooms = useMemo(() => {
    return rooms.filter(room => room.type === 'room');
  }, [rooms]);

  const filteredUsers = useMemo(() => {
    return users;
  }, [users]);

  useEffect(() => {
    Promise.all([
      import("@/lib/api").then(({ apiFetch }) =>
        apiFetch("/chat/rooms").then((r) => r.json()).then((d) => d.rooms ?? [])
      ),
      import("@/lib/api").then(({ apiFetch }) =>
        apiFetch("/chat/users").then((r) => r.json()).then((d) => d.users ?? [])
      ),
      import("@/lib/api").then(({ apiFetch }) =>
        apiFetch("/auth/me").then((r) => r.json()).then((d) => d.user ?? null)
      )
    ]).then(([roomsData, usersData, userData]) => {
      // Transform rooms data
      const transformedRooms = roomsData.map((room: any) => ({
        ...room,
        type: 'room' as const
      }));
      
      setRooms(transformedRooms);
      setUsers(usersData);
      setCurrentUser(userData);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!activeRoom && !activeUser) return;
    
    const targetId = activeRoom || activeUser;
    if (!targetId) return;
    
    import("@/lib/api").then(({ apiFetch }) =>
      apiFetch(`/chat/rooms/${targetId}/messages`).then((r) => r.json()).then((d) => setMessages(d.messages ?? [])).catch(() => {})
    );
  }, [activeRoom, activeUser]);

  async function createRoom() {
    if (!newRoom.trim()) return;
    setLoading(true);
    try {
      const { apiFetch } = await import("@/lib/api");
      const r = await apiFetch("/chat/rooms", { method: "POST", body: JSON.stringify({ name: newRoom }) });
      const d = await r.json();
      setRooms((prev) => [{ ...d.room, type: 'room' }, ...prev]);
      setNewRoom("");
    } catch (error) {
      console.error("Failed to create room:", error);
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage() {
    if ((!activeRoom && !activeUser) || !text.trim() || loading) return;
    
    try {
      setLoading(true);
      
      // For direct messages, we need to use the special dm- format
      const targetRoomId = activeRoom || (activeUser ? `dm-${activeUser}` : null);
      
      if (!targetRoomId) {
        throw new Error("No room or user selected");
      }
      
      const r = await fetch(`/api/chat/rooms/${targetRoomId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text })
      });
      
      const d = await r.json();
      setMessages((prev) => [...prev, d.message]);
      setText("");
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleRoomSelect(roomId: string) {
    setActiveRoom(roomId);
    setActiveUser(null);
  }

  function handleUserSelect(userId: string) {
    // For direct messages, we'll use a special room ID format
    setActiveUser(userId);
    setActiveRoom(null);
  }

  // Get user avatar or default
  function getUserAvatar(user: User | null | undefined): string {
    if (!user) return DEFAULT_AVATAR;
    
    // If user has an avatar URL, use it
    if (user.avatarUrl) return user.avatarUrl;
    
    // Otherwise, return default avatar
    return DEFAULT_AVATAR;
  }

  // Get user display name
  function getUserDisplayName(user: User | null | undefined): string {
    if (!user) return "Unknown User";
    
    return user.username || 
           user.displayName || 
           (user.walletAddress ? 
             `${user.walletAddress.substring(0, 4)}...${user.walletAddress.substring(user.walletAddress.length - 4)}` : 
             "Unknown User");
  }

  return (
    <div className="flex flex-col gap-4 min-h-screen p-4" style={{ fontFamily: "'LisaStyle', monospace" }}>
      <div className="lisa-window flex-1">
        <div className="lisa-titlebar"><div className="lisa-title">Chat</div></div>
        <div className="lisa-content grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-120px)]">
          {/* Sidebar - Rooms and People */}
          <div className="flex flex-col gap-4 lg:border-r lg:border-gray-300 lg:pr-4">
            {/* Tabs for Rooms and People */}
            <div className="flex border-b border-gray-300">
              <button 
                className={`flex-1 py-2 text-center ${activeTab === 'rooms' ? 'border-b-2 border-blue-500 font-bold' : ''}`}
                onClick={() => setActiveTab('rooms')}
              >
                Rooms
              </button>
              <button 
                className={`flex-1 py-2 text-center ${activeTab === 'people' ? 'border-b-2 border-blue-500 font-bold' : ''}`}
                onClick={() => setActiveTab('people')}
              >
                People
              </button>
            </div>
            
            {/* Create room form */}
            {activeTab === 'rooms' && (
              <div className="flex gap-2">
                <input 
                  value={newRoom} 
                  onChange={(e) => setNewRoom(e.target.value)} 
                  placeholder="New room name" 
                  className="border-2 border-[#808080] p-2 flex-1 rounded"
                  disabled={loading}
                  onKeyPress={(e) => e.key === 'Enter' && createRoom()}
                />
                <button 
                  onClick={createRoom} 
                  className="lisa-button px-4 py-2"
                  disabled={loading || !newRoom.trim()}
                >
                  Create
                </button>
              </div>
            )}
            
            {/* Rooms or People list */}
            <div className="flex flex-col gap-2 overflow-y-auto flex-1">
              {activeTab === 'rooms' ? (
                filteredRooms.length > 0 ? (
                  filteredRooms.map((r) => (
                    <button 
                      key={r.id} 
                      onClick={() => handleRoomSelect(r.id)} 
                      className={`lisa-button text-left p-3 rounded-lg transition-all duration-200 ${
                        activeRoom === r.id ? 'lisa-button-primary bg-blue-100 border-l-4 border-l-blue-500' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-gray-200 border-2 border-dashed rounded-xl w-10 h-10 flex items-center justify-center">
                          <span className="text-lg">💬</span>
                        </div>
                        <div className="text-left">
                          <div className="font-medium">{r.name ?? r.id}</div>
                          <div className="text-xs text-gray-500">Room</div>
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-8">No rooms available</div>
                )
              ) : (
                filteredUsers.length > 0 ? (
                  filteredUsers.map((u) => (
                    <button 
                      key={u.id} 
                      onClick={() => handleUserSelect(u.id)} 
                      className={`lisa-button text-left p-3 rounded-lg transition-all duration-200 ${
                        activeUser === u.id ? 'lisa-button-primary bg-blue-100 border-l-4 border-l-blue-500' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img 
                          src={getUserAvatar(u)} 
                          alt={getUserDisplayName(u)} 
                          className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = DEFAULT_AVATAR;
                          }}
                        />
                        <div className="text-left">
                          <div className="font-medium">{getUserDisplayName(u)}</div>
                          <div className="text-xs text-gray-500">User</div>
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-8">No users available</div>
                )
              )}
            </div>
          </div>
          
          {/* Main Chat Area */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {/* Chat Header */}
            <div className="border-b border-gray-300 pb-2">
              <h2 className="text-xl font-bold">
                {activeRoom 
                  ? (rooms.find(r => r.id === activeRoom)?.name ?? 'Room') 
                  : activeUser 
                    ? (users.find(u => u.id === activeUser)?.username ?? 'User') 
                    : 'Select a chat'}
              </h2>
            </div>
            
            {/* Messages Container */}
            <div className="border-2 border-[#808080] p-4 rounded flex-1 overflow-auto flex flex-col">
              {messages.length > 0 ? (
                messages.map((m) => {
                  // Find sender in users or current user
                  const sender = users.find(u => u.id === m.senderId) || 
                                (m.senderId === currentUser?.id ? currentUser : null);
                  
                  const isCurrentUser = m.senderId === currentUser?.id;
                  
                  return (
                    <div 
                      key={m.id} 
                      className={`mb-4 p-3 rounded-lg max-w-[80%] ${
                        isCurrentUser 
                          ? 'self-end bg-blue-100 ml-auto' 
                          : 'self-start bg-gray-100 mr-auto'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {!isCurrentUser && (
                          <img 
                            src={getUserAvatar(sender)} 
                            alt={getUserDisplayName(sender)} 
                            className="w-6 h-6 rounded-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = DEFAULT_AVATAR;
                            }}
                          />
                        )}
                        <div className={`text-xs font-medium ${
                          isCurrentUser ? 'text-blue-800' : 'text-[#333]'
                        }`}>
                          {isCurrentUser ? 'You' : getUserDisplayName(sender)}
                        </div>
                        <div className="text-xs text-[#888]">
                          {m.createdAt && new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <div className={`${isCurrentUser ? 'text-blue-900' : 'text-gray-800'}`}>
                        {m.content}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  {activeRoom || activeUser ? "No messages yet" : "Select a room or user to start chatting"}
                </div>
              )}
              <div ref={(el) => {
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth' });
                }
              }} />
            </div>
            
            {/* Message Input */}
            <div className="flex gap-2">
              <input 
                value={text} 
                onChange={(e) => setText(e.target.value)} 
                className="border-2 border-[#808080] p-2 flex-1 rounded" 
                placeholder="Type a message..." 
                disabled={loading || (!activeRoom && !activeUser)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <button 
                onClick={sendMessage} 
                className="lisa-button lisa-button-primary px-6 py-2 rounded"
                disabled={loading || (!activeRoom && !activeUser) || !text.trim()}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
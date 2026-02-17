import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Send, Check, CheckCheck } from "lucide-react";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface Contact {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
}

const Messages = () => {
  const { user, profile, primaryRole } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile?.institution_id) return;
    const fetchContacts = async () => {
      // Fetch profiles in same institution with their roles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .eq("institution_id", profile.institution_id!)
        .neq("user_id", user!.id);

      if (!profiles) return;

      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("institution_id", profile.institution_id!);

      const roleMap: Record<string, string> = {};
      roles?.forEach((r: any) => { roleMap[r.user_id] = r.role; });

      // Filter based on role: teachers see parents/students, parents see teachers
      const filtered = profiles
        .map(p => ({ ...p, role: roleMap[p.user_id] || "UNKNOWN" }))
        .filter(p => {
          if (primaryRole === "TEACHER") return ["PARENT", "STUDENT"].includes(p.role);
          if (primaryRole === "PARENT") return ["TEACHER", "PRINCIPAL", "FOUNDER"].includes(p.role);
          return true; // Founder/Principal see everyone
        });

      setContacts(filtered);
    };
    fetchContacts();
  }, [profile?.institution_id]);

  useEffect(() => {
    if (!selectedContact || !user) return;
    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedContact.user_id}),and(sender_id.eq.${selectedContact.user_id},receiver_id.eq.${user.id})`)
        .eq("institution_id", profile!.institution_id!)
        .order("created_at", { ascending: true });
      setMessages((data as Message[]) || []);

      // Mark unread messages as read
      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("sender_id", selectedContact.user_id)
        .eq("receiver_id", user.id)
        .eq("is_read", false);
    };
    fetchMessages();

    // Realtime subscription
    const channel = supabase
      .channel(`messages-${selectedContact.user_id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const msg = payload.new as Message;
        if (
          (msg.sender_id === user.id && msg.receiver_id === selectedContact.user_id) ||
          (msg.sender_id === selectedContact.user_id && msg.receiver_id === user.id)
        ) {
          setMessages(prev => [...prev, msg]);
          if (msg.sender_id === selectedContact.user_id) {
            supabase.from("messages").update({ is_read: true }).eq("id", msg.id);
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedContact?.user_id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim() || !selectedContact || !user || !profile?.institution_id) return;
    setSending(true);
    await supabase.from("messages").insert({
      institution_id: profile.institution_id,
      sender_id: user.id,
      receiver_id: selectedContact.user_id,
      content: newMsg.trim(),
    });
    setNewMsg("");
    setSending(false);
  };

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-8rem)] bg-card border border-border rounded-xl overflow-hidden">
        {/* Contacts sidebar */}
        <div className="w-64 border-r border-border flex-shrink-0 flex flex-col">
          <div className="p-3 border-b border-border">
            <h2 className="text-sm font-semibold">Messages</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {contacts.length === 0 ? (
              <p className="p-4 text-xs text-muted-foreground">No contacts available</p>
            ) : (
              contacts.map(c => (
                <button
                  key={c.user_id}
                  onClick={() => setSelectedContact(c)}
                  className={`w-full text-left px-3 py-3 border-b border-border hover:bg-muted transition-colors ${
                    selectedContact?.user_id === c.user_id ? "bg-primary/10" : ""
                  }`}
                >
                  <p className="text-sm font-medium truncate">{c.full_name}</p>
                  <p className="text-xs text-muted-foreground">{c.role}</p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          {selectedContact ? (
            <>
              <div className="p-3 border-b border-border">
                <p className="text-sm font-semibold">{selectedContact.full_name}</p>
                <p className="text-xs text-muted-foreground">{selectedContact.role}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map(m => {
                  const isMine = m.sender_id === user!.id;
                  return (
                    <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[70%] rounded-xl px-3 py-2 text-sm ${
                        isMine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                      }`}>
                        <p>{m.content}</p>
                        <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : ""}`}>
                          <span className="text-[10px] opacity-70">
                            {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {isMine && (m.is_read ? <CheckCheck className="w-3 h-3 opacity-70" /> : <Check className="w-3 h-3 opacity-70" />)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
              <form onSubmit={handleSend} className="p-3 border-t border-border flex gap-2">
                <input
                  value={newMsg}
                  onChange={e => setNewMsg(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="submit"
                  disabled={sending || !newMsg.trim()}
                  className="h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              Select a contact to start messaging
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Messages;

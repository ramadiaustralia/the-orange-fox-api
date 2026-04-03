"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface Reply {
  type: string;
  message: string;
  timestamp: string;
}

export default function CustomerReplyPage() {
  const params = useParams();
  const id = params.id as string;
  const [msg, setMsg] = useState<any>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/messages/customer-reply?id=${id}`)
      .then((r) => r.json())
      .then((d) => setMsg(d.data))
      .catch(() => setError("Could not load conversation."));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/messages/customer-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, message: reply }),
      });
      if (!res.ok) throw new Error("Failed to send");
      setSent(true);
      setReply("");
      // Reload conversation
      const d = await fetch(`/api/messages/customer-reply?id=${id}`).then((r) => r.json());
      setMsg(d.data);
    } catch {
      setError("Failed to send reply. Please try again.");
    } finally {
      setSending(false);
      setTimeout(() => setSent(false), 3000);
    }
  };

  if (!msg && !error) return (
    <div style={{ display:"flex",justifyContent:"center",alignItems:"center",minHeight:"100vh",background:"#faf8f6" }}>
      <p style={{ color:"#999" }}>Loading conversation...</p>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh",background:"#faf8f6",padding:"40px 16px",fontFamily:"Arial,sans-serif" }}>
      <div style={{ maxWidth:600,margin:"0 auto" }}>
        <div style={{ textAlign:"center",marginBottom:32 }}>
          <h1 style={{ color:"#D4692A",fontSize:24,margin:0 }}>The Orange Fox</h1>
          <p style={{ color:"#999",fontSize:13,marginTop:4 }}>Project Request Conversation</p>
        </div>

        {error && !msg && <p style={{ color:"red",textAlign:"center" }}>{error}</p>}

        {msg && (
          <div style={{ background:"#fff",borderRadius:16,padding:24,boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ marginBottom:16,paddingBottom:16,borderBottom:"1px solid #f0ece8" }}>
              <p style={{ fontSize:14,color:"#555",margin:0 }}><strong>Subject:</strong> {msg.subject || "Project Request"}</p>
              <p style={{ fontSize:13,color:"#999",margin:"4px 0 0" }}>From: {msg.name} ({msg.email})</p>
            </div>

            {/* Original message */}
            <div style={{ background:"#f9f7f5",borderRadius:12,padding:16,marginBottom:12 }}>
              <p style={{ fontSize:11,color:"#999",margin:"0 0 6px" }}>Original message • {new Date(msg.created_at).toLocaleDateString()}</p>
              <p style={{ fontSize:14,color:"#555",margin:0,whiteSpace:"pre-wrap" }}>{msg.message}</p>
            </div>

            {/* Thread */}
            {(msg.replies || []).map((r: Reply, i: number) => (
              <div key={i} style={{
                background: r.type === "admin" ? "#fff3ed" : "#f0f7ff",
                borderRadius:12, padding:16, marginBottom:12,
                borderLeft: `3px solid ${r.type === "admin" ? "#D4692A" : "#3b82f6"}`
              }}>
                <p style={{ fontSize:11,color:"#999",margin:"0 0 6px" }}>
                  {r.type === "admin" ? "🦊 The Orange Fox Team" : "You"} • {new Date(r.timestamp).toLocaleString()}
                </p>
                <p style={{ fontSize:14,color:"#555",margin:0,whiteSpace:"pre-wrap" }}>{r.message}</p>
              </div>
            ))}

            {/* Reply form */}
            <form onSubmit={handleSubmit} style={{ marginTop:20 }}>
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Type your reply..."
                style={{
                  width:"100%",boxSizing:"border-box",border:"1px solid #e8e4e0",borderRadius:12,
                  padding:14,fontSize:14,minHeight:100,resize:"vertical",outline:"none",
                  fontFamily:"Arial,sans-serif"
                }}
              />
              {error && <p style={{ color:"red",fontSize:13,margin:"8px 0 0" }}>{error}</p>}
              {sent && <p style={{ color:"#22c55e",fontSize:13,margin:"8px 0 0" }}>Reply sent successfully!</p>}
              <button
                type="submit"
                disabled={sending || !reply.trim()}
                style={{
                  marginTop:12,background:"#D4692A",color:"#fff",border:"none",borderRadius:10,
                  padding:"12px 28px",fontSize:14,fontWeight:"bold",cursor:"pointer",
                  opacity: sending || !reply.trim() ? 0.5 : 1
                }}
              >
                {sending ? "Sending..." : "Send Reply"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

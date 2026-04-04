"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface Reply {
  type: string;
  message: string;
  timestamp: string;
  attachments?: { url: string; name: string; type: string; size: number }[];
}

export default function CustomerReplyPage() {
  const params = useParams();
  const id = params.id as string;
  const [msg, setMsg] = useState<any>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [files, setFiles] = useState<{ url: string; name: string; type: string; size: number }[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);

  const handleUpload = async (fileList: FileList) => {
    setUploadingFile(true);
    for (const file of Array.from(fileList)) {
      try {
        // Step 1: Get signed upload URL
        const signedRes = await fetch("/api/messages/customer-upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId: id, fileName: file.name, fileType: file.type }),
        });
        if (!signedRes.ok) continue;
        const { signedUrl, publicUrl } = await signedRes.json();

        // Step 2: Upload directly to Supabase Storage (bypasses Vercel 4.5MB limit)
        const uploadRes = await fetch(signedUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (uploadRes.ok) {
          setFiles(prev => [...prev, { url: publicUrl, name: file.name, type: file.type, size: file.size }]);
        }
      } catch {}
    }
    setUploadingFile(false);
  };

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
        body: JSON.stringify({ id, message: reply, attachments: files }),
      });
      if (!res.ok) throw new Error("Failed to send");
      setSent(true);
      setReply("");
      setFiles([]);
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
                {r.attachments && r.attachments.length > 0 && (
                  <div style={{ marginTop:10 }}>
                    {r.attachments.map((att: { url: string; name: string; type: string; size: number }, ai: number) => (
                      att.type?.startsWith("image/") ? (
                        <a key={ai} href={att.url} target="_blank" rel="noopener noreferrer" style={{ display:"block",marginTop:6 }}>
                          <img src={att.url} alt={att.name} style={{ maxWidth:"100%",maxHeight:200,borderRadius:8,border:"1px solid #e8e4e0" }} />
                        </a>
                      ) : att.type?.startsWith("video/") ? (
                        <video key={ai} src={att.url} controls preload="metadata" style={{ maxWidth:"100%",maxHeight:200,borderRadius:8,marginTop:6 }} />
                      ) : (
                        <a key={ai} href={att.url} target="_blank" rel="noopener noreferrer"
                          style={{ display:"inline-flex",alignItems:"center",gap:6,padding:"6px 12px",background:"rgba(255,255,255,0.5)",border:"1px solid #e8e4e0",borderRadius:8,fontSize:13,color:"#555",textDecoration:"none",marginTop:6 }}>
                          📄 {att.name} ⬇
                        </a>
                      )
                    ))}
                  </div>
                )}
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
              {/* Attachment Buttons */}
              <div style={{ display:"flex",gap:8,marginTop:10,flexWrap:"wrap",alignItems:"center" }}>
                <input type="file" id="cust-img" accept="image/*" multiple style={{ display:"none" }} onChange={(e) => e.target.files && handleUpload(e.target.files)} />
                <input type="file" id="cust-vid" accept="video/*" multiple style={{ display:"none" }} onChange={(e) => e.target.files && handleUpload(e.target.files)} />
                <input type="file" id="cust-doc" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip" multiple style={{ display:"none" }} onChange={(e) => e.target.files && handleUpload(e.target.files)} />
                <button type="button" onClick={() => document.getElementById("cust-img")?.click()}
                  style={{ display:"inline-flex",alignItems:"center",gap:4,padding:"6px 12px",fontSize:12,border:"1px solid #e8e4e0",borderRadius:8,background:"#fff",color:"#555",cursor:"pointer" }}>
                  🖼️ Photo
                </button>
                <button type="button" onClick={() => document.getElementById("cust-vid")?.click()}
                  style={{ display:"inline-flex",alignItems:"center",gap:4,padding:"6px 12px",fontSize:12,border:"1px solid #e8e4e0",borderRadius:8,background:"#fff",color:"#555",cursor:"pointer" }}>
                  🎥 Video
                </button>
                <button type="button" onClick={() => document.getElementById("cust-doc")?.click()}
                  style={{ display:"inline-flex",alignItems:"center",gap:4,padding:"6px 12px",fontSize:12,border:"1px solid #e8e4e0",borderRadius:8,background:"#fff",color:"#555",cursor:"pointer" }}>
                  📄 File
                </button>
                {uploadingFile && <span style={{ fontSize:12,color:"#999" }}>Uploading...</span>}
              </div>

              {/* File Preview */}
              {files.length > 0 && (
                <div style={{ display:"flex",flexWrap:"wrap",gap:8,marginTop:8 }}>
                  {files.map((f, fi) => (
                    <div key={fi} style={{ display:"inline-flex",alignItems:"center",gap:6,padding:"4px 10px",background:"#f5f2ef",border:"1px solid #e8e4e0",borderRadius:8,fontSize:12,color:"#555" }}>
                      {f.type?.startsWith("image/") ? "🖼️" : f.type?.startsWith("video/") ? "🎥" : "📄"}
                      <span style={{ maxWidth:100,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{f.name}</span>
                      <button type="button" onClick={() => setFiles(prev => prev.filter((_, i) => i !== fi))}
                        style={{ background:"none",border:"none",color:"#999",cursor:"pointer",fontSize:14,padding:0,lineHeight:1 }}>✕</button>
                    </div>
                  ))}
                </div>
              )}

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

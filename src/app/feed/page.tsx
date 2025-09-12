"use client";
import { useEffect, useState } from "react";

export default function FeedPage() {
  return (
    <div className="flex flex-col flex-1 py-4" style={{ fontFamily: "'LisaStyle', monospace" }}>
      <section className="lisa-window">
        <div className="lisa-titlebar">
          <div className="lisa-title">Feed</div>
        </div>
        <div className="lisa-content flex flex-col gap-4">
          <PostComposer />
          <FeedList />
        </div>
      </section>
    </div>
  );
}

function PostComposer() {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  async function submit() {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      const { apiFetch } = await import("@/lib/api");
      await apiFetch("/posts", { method: "POST", body: JSON.stringify({ content }) });
      setContent("");
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <div className="flex flex-col gap-2">
      <textarea value={content} onChange={(e) => setContent(e.target.value)} className="w-full border-2 border-[#808080] p-2" rows={3} placeholder="What's happening?" />
      <button onClick={submit} disabled={submitting} className="lisa-button lisa-button-primary self-end">Post</button>
    </div>
  );
}

function FeedList() {
  const [posts, setPosts] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => {
    import("@/lib/api").then(({ apiFetch }) =>
      apiFetch("/posts").then((r) => r.json()).then((d) => setPosts(d.posts ?? [])).catch(() => {})
    );
  }, [refreshKey]);

  async function like(postId: string) {
    const { apiFetch } = await import("@/lib/api");
    await apiFetch(`/posts/${postId}/likes`, { method: "POST" });
    setRefreshKey((k) => k + 1);
  }
  async function unlike(postId: string) {
    const { apiFetch } = await import("@/lib/api");
    await apiFetch(`/posts/${postId}/likes`, { method: "DELETE" });
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="flex flex-col gap-3">
      {posts.map((p) => (
        <article key={p.id} className="border-2 border-[#808080] p-3">
          <div className="text-sm text-[#555]">{p.author?.username ?? (p.author?.walletAddress?.slice(0, 4) + "…" + p.author?.walletAddress?.slice(-4))}</div>
          <div className="my-2 whitespace-pre-wrap">{p.content}</div>
          <div className="flex gap-2 text-sm">
            <button onClick={() => like(p.id)} className="lisa-button">❤️ {p._count?.likes ?? 0}</button>
            <button onClick={() => unlike(p.id)} className="lisa-button">💔</button>
            <span>💬 {p._count?.comments ?? 0}</span>
          </div>
        </article>
      ))}
    </div>
  );
}



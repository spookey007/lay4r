"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function FeedPage() {
  return (
    <motion.div 
      className="flex flex-col flex-1 py-4" 
      style={{ fontFamily: "'LisaStyle', monospace" }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <motion.section 
        className="lisa-window"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="lisa-titlebar">
          <div className="lisa-title">📝 Community Feed</div>
        </div>
        <div className="lisa-content flex flex-col gap-4">
          <PostComposer />
          <FeedList />
        </div>
      </motion.section>
    </motion.div>
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
    <motion.div 
      className="flex flex-col gap-3 p-4 bg-gray-50 border-2 border-[#808080] rounded-lg"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      whileHover={{ scale: 1.01 }}
    >
      <h3 className="text-lg font-semibold text-gray-800">Share Your Thoughts</h3>
      <motion.textarea 
        value={content} 
        onChange={(e) => setContent(e.target.value)} 
        className="w-full border-2 border-[#808080] p-3 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" 
        rows={3} 
        placeholder="What's happening in the Layer4 community? Share your thoughts, insights, or questions..."
        whileFocus={{ scale: 1.02 }}
      />
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-500">{content.length}/500 characters</span>
        <motion.button 
          onClick={submit} 
          disabled={submitting || !content.trim()} 
          className={`lisa-button lisa-button-primary px-6 py-2 ${
            submitting || !content.trim() 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:scale-105'
          }`}
          whileHover={!submitting && content.trim() ? { scale: 1.05 } : {}}
          whileTap={!submitting && content.trim() ? { scale: 0.95 } : {}}
        >
          {submitting ? (
            <motion.div 
              className="flex items-center gap-2"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
              Posting...
            </motion.div>
          ) : (
            "📝 Post"
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}

function FeedList() {
  const [posts, setPosts] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    setLoading(true);
    import("@/lib/api").then(({ apiFetch }) =>
      apiFetch("/posts")
        .then((r) => r.json())
        .then((d) => setPosts(d.posts ?? []))
        .catch(() => {})
        .finally(() => setLoading(false))
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

  if (loading) {
    return (
      <motion.div 
        className="flex justify-center items-center py-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div 
          className="text-center"
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{ 
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading posts...</p>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="flex flex-col gap-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <AnimatePresence>
        {posts.length === 0 ? (
          <motion.div 
            className="text-center py-12 bg-gray-50 border-2 border-[#808080] rounded-lg"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Posts Yet</h3>
            <p className="text-gray-600">Be the first to share something with the Layer4 community!</p>
          </motion.div>
        ) : (
          posts.map((p, index) => (
            <motion.article 
              key={p.id} 
              className="bg-white border-2 border-[#808080] p-4 rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              whileHover={{ scale: 1.02, y: -2 }}
              layout
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                  {p.author?.username?.[0]?.toUpperCase() || p.author?.walletAddress?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <div className="font-semibold text-gray-800">
                    {p.author?.username || p.author?.displayName || 'Anonymous User'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {p.author?.walletAddress?.slice(0, 8)}...{p.author?.walletAddress?.slice(-8)}
                  </div>
                </div>
                <div className="ml-auto text-sm text-gray-500">
                  {new Date(p.createdAt).toLocaleDateString()}
                </div>
              </div>
              
              <div className="my-3 whitespace-pre-wrap text-gray-800 leading-relaxed">
                {p.content}
              </div>
              
              <div className="flex gap-3 text-sm pt-3 border-t border-gray-200">
                <motion.button 
                  onClick={() => like(p.id)} 
                  className="flex items-center gap-1 px-3 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.span
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.3 }}
                  >
                    ❤️
                  </motion.span>
                  {p._count?.likes ?? 0}
                </motion.button>
                
                <motion.button 
                  onClick={() => unlike(p.id)} 
                  className="flex items-center gap-1 px-3 py-1 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  💔
                </motion.button>
                
                <div className="flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-600 rounded-lg">
                  💬 {p._count?.comments ?? 0}
                </div>
              </div>
            </motion.article>
          ))
        )}
      </AnimatePresence>
    </motion.div>
  );
}



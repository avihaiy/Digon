import FishingLayout from "@/components/fishing/FishingLayout";
import { motion } from "framer-motion";
import { Heart, MessageCircle, Share2, Fish } from "lucide-react";

export default function Community() {
  const posts = [
    {
      id: 1,
      user: "אלירן תפיסות",
      time: "לפני 2 שעות",
      location: "מרינה אשדוד",
      fish: "לוקוס לבן",
      weight: "2.4 ק״ג",
      image: "/fishing_bg.jpg",
      likes: 124,
      comments: 18,
    },
    {
      id: 2,
      user: "MikiFish",
      time: "אתמול",
      location: "שוברי גלים חיפה",
      fish: "דניס",
      weight: "800 גרם",
      image: "/fishing_bg.jpg",
      likes: 89,
      comments: 5,
    }
  ];

  return (
    <FishingLayout>
      <div className="px-4 pt-6 pb-20">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-3xl font-black text-white text-start">קהילת הדייגים</h1>
          <p className="text-cyan-400 text-sm mt-1">שיתופים חמים מהשטח</p>
        </motion.div>

        <div className="space-y-6">
          {posts.map((post, i) => (
            <motion.div 
              key={post.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white/5 backdrop-blur-md rounded-[2rem] overflow-hidden border border-white/10 shadow-lg"
            >
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-[0_0_15px_rgba(34,211,238,0.4)]">
                    {post.user.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-slate-100 text-sm">{post.user}</div>
                    <div className="text-xs text-slate-400">{post.time}</div>
                  </div>
                </div>
                <div className="text-end">
                  <div className="text-xs font-semibold text-cyan-300">{post.location}</div>
                </div>
              </div>

              <div className="h-64 w-full relative">
                <img src={post.image} alt={post.fish} className="w-full h-full object-cover" />
                <div className="absolute bottom-4 start-4 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
                  <Fish className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-bold text-white">{post.fish} • {post.weight}</span>
                </div>
              </div>

              <div className="p-4 flex items-center justify-between border-t border-white/5">
                <div className="flex gap-4">
                  <button className="flex items-center gap-1.5 text-rose-400 hover:text-rose-300 transition-colors">
                    <Heart className="w-5 h-5 fill-rose-400/20" />
                    <span className="text-sm font-medium">{post.likes}</span>
                  </button>
                  <button className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors">
                    <MessageCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">{post.comments}</span>
                  </button>
                </div>
                <button className="text-slate-300 hover:text-white transition-colors">
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </FishingLayout>
  );
}

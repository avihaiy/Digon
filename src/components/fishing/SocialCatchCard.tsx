import { useState } from "react";
import { Card } from "@/components/ui/card";
import { MapPin, Heart, MessageCircle, Send } from "lucide-react";
import { getImageUrl } from "@/hooks/useCatches";
import { useSocial } from "@/hooks/useSocial";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useUserBadges } from "@/hooks/useUserBadges";
import { BadgeIcon } from "@/components/fishing/BadgeIcon";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function SocialCatchCard({ report }: { report: any }) {
  const { user } = useAuth();
  const { likesCount, hasLiked, toggleLike, comments, commentsCount, addComment, isCommentLoading } = useSocial(report.$id);
  const { badges, title } = useUserBadges(report.user_id);
  const [commentText, setCommentText] = useState("");
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);

  const handleLike = () => {
    if (!user) {
      toast.error("יש להתחבר כדי לעשות לייק!");
      return;
    }
    toggleLike();
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("יש להתחבר כדי להגיב!");
      return;
    }
    if (!commentText.trim()) return;
    addComment(commentText.trim(), report.user_id);
    setCommentText("");
  };

  // Get user name helper (we don't have the user name for each comment in the DB right now, but for real app we'd fetch profile data. Since it's a demo we just show fisherman)
  const getUserDisplayName = (userId: string) => {
    return userId === user?.$id ? (user?.name || "אתה") : "דייג עמית";
  };

  return (
    <Card className="overflow-hidden border-border/50 shadow-sm bg-[#0B1426]/50 backdrop-blur-sm">
      <div className="flex p-3 gap-4 items-start">
        <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-white/10 shadow-lg">
          <img src={getImageUrl(report.image_id)} alt={report.fish_type} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-sm font-semibold text-white">{report.user_name}</p>
              {title && (
                <span className="text-[10px] bg-cyan-900/40 text-cyan-400 border border-cyan-500/30 px-1.5 py-0.5 rounded-md font-bold">
                  {title}
                </span>
              )}
              {badges?.length > 0 && (
                <div className="flex items-center gap-0.5">
                  {badges.slice(0, 3).map((badgeId: string) => (
                    <BadgeIcon key={badgeId} badgeId={badgeId} />
                  ))}
                </div>
              )}
            </div>
            <span className="text-[10px] text-slate-400 whitespace-nowrap">
              {new Date(report.$createdAt).toLocaleDateString('he-IL')}
            </span>
          </div>
          <p className="text-sm font-bold text-cyan-400 mb-1 drop-shadow-sm">
            {report.fish_type} {report.weight && <span className="text-xs font-normal text-slate-300 ml-1">({report.weight})</span>}
          </p>
          <p className="text-xs text-slate-400 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-rose-400" />
            {report.location}
          </p>
        </div>
      </div>

      {/* Social Actions */}
      <div className="px-3 pb-3 flex items-center gap-4 border-t border-white/5 pt-2 mt-1">
        <motion.button 
          whileTap={{ scale: 0.8 }}
          onClick={handleLike}
          className="flex items-center gap-1.5 group"
        >
          <Heart className={cn("w-5 h-5 transition-colors", hasLiked ? "fill-rose-500 text-rose-500" : "text-slate-400 group-hover:text-rose-400")} />
          <span className={cn("text-xs font-medium", hasLiked ? "text-rose-500" : "text-slate-400")}>{likesCount}</span>
        </motion.button>

        <Dialog open={isCommentsOpen} onOpenChange={setIsCommentsOpen}>
          <DialogTrigger asChild>
            <button className="flex items-center gap-1.5 group">
              <MessageCircle className="w-5 h-5 text-slate-400 group-hover:text-cyan-400 transition-colors" />
              <span className="text-xs font-medium text-slate-400">{commentsCount}</span>
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md bg-[#0B1426] border-white/10 text-white" dir="rtl">
            <DialogHeader>
              <DialogTitle>תגובות לתפיסה</DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[300px] pr-4 mt-4">
              {comments.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                  <MessageCircle className="w-12 h-12 mb-2" />
                  <p>תהיה הראשון להגיב!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment: any) => (
                    <div key={comment.$id} className="bg-white/5 rounded-xl p-3">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-bold text-cyan-400">{getUserDisplayName(comment.user_id)}</span>
                        <span className="text-[9px] text-slate-500">
                          {new Date(comment.$createdAt).toLocaleDateString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm text-slate-200">{comment.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            <form onSubmit={handleCommentSubmit} className="mt-4 flex gap-2">
              <Input 
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="כתוב תגובה מפרגנת..."
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-cyan-500"
              />
              <Button type="submit" disabled={isCommentLoading || !commentText.trim()} className="shrink-0 bg-cyan-600 hover:bg-cyan-700">
                <Send className="w-4 h-4 rtl:rotate-180" />
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Card>
  );
}

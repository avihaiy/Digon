import { useState } from 'react';
import { useSocial } from '@/hooks/useSocial';
import { Heart, MessageCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getImageUrl } from '@/hooks/useCatches';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

export function CatchSocial({ catchId }: { catchId: string }) {
  const { likesCount, isLiked, comments, toggleLike, addComment, isAddingComment } = useSocial(catchId);
  const [commentText, setCommentText] = useState('');

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      await addComment(commentText);
      setCommentText('');
    } catch (e) {
      console.error('Failed to comment');
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full min-h-[300px]">
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex gap-4">
          <button 
            onClick={() => toggleLike()}
            className={`flex items-center gap-1.5 transition-colors ${hasLiked ? 'text-red-500' : 'text-white'}`}
          >
            <Heart className={`w-6 h-6 ${hasLiked ? 'fill-current' : ''}`} />
            <span className="font-bold">{likesCount}</span>
          </button>
          <div className="flex items-center gap-1.5 text-white">
            <MessageCircle className="w-6 h-6" />
            <span className="font-bold">{comments.length}</span>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {comments.length === 0 ? (
          <div className="text-center text-white/50 text-sm mt-4">��� ������ �����. ��� ������ �����!</div>
        ) : (
          comments.map((c: any) => (
            <div key={c.$id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-cyan-900 shrink-0 overflow-hidden">
                {c.profile?.avatar_id ? (
                  <img src={getImageUrl(c.profile?.avatar_id)} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs font-bold text-cyan-200">
                    {c.profile?.full_name?.charAt(0) || '�'}
                  </div>
                )}
              </div>
              <div className="flex-1 bg-white/10 rounded-2xl rounded-tr-none p-3">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-bold text-white">{c.profile?.full_name || '����'}</span>
                  <span className="text-[10px] text-white/50">
                    {formatDistanceToNow(new Date(c.$createdAt), { addSuffix: true, locale: he })}
                  </span>
                </div>
                <p className="text-sm text-white/90">{c.text}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleAddComment} className="p-3 border-t border-white/10 flex gap-2">
        <Input 
          value={commentText} 
          onChange={(e) => setCommentText(e.target.value)} 
          placeholder="���� �����..." 
          className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/40 rounded-full h-10"
          dir="auto"
        />
        <Button 
          type="submit" 
          disabled={!commentText.trim() || isAddingComment}
          size="icon" 
          className="rounded-full h-10 w-10 shrink-0 bg-cyan-500 hover:bg-cyan-600 text-white"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}

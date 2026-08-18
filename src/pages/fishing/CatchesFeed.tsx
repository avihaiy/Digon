import { useCatches } from '@/hooks/useCatches';
import { SocialCatchCard } from '@/components/fishing/SocialCatchCard';
import { useRef, useCallback } from 'react';
import { Fish } from 'lucide-react';

export default function CatchesFeed() {
  const { catches, isLoading: catchesLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useCatches();
  
  // Intersection Observer for Infinite Scroll
  const observer = useRef<IntersectionObserver | null>(null);
  const lastCatchElementRef = useCallback((node: HTMLDivElement | null) => {
    if (catchesLoading || isFetchingNextPage) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasNextPage) {
        fetchNextPage();
      }
    });
    
    if (node) observer.current.observe(node);
  }, [catchesLoading, isFetchingNextPage, hasNextPage, fetchNextPage]);

  return (
    <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-lg mx-auto">
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 mt-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            תפיסות בשטח <Fish className="w-6 h-6 text-primary" />
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            התפיסות האחרונות מהדייגים בקהילה
          </p>
        </div>
      </div>

      {/* Feed */}
      <section className="px-4">
        <div className="space-y-4">
          {catchesLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : catches && catches.length > 0 ? (
            <div className="flex flex-col gap-4">
              {catches.map((report, index) => {
                if (catches.length === index + 1) {
                  return (
                    <div ref={lastCatchElementRef} key={report.$id}>
                      <SocialCatchCard report={report} />
                    </div>
                  );
                } else {
                  return <SocialCatchCard key={report.$id} report={report} />;
                }
              })}
              
              {isFetchingNextPage && (
                <div className="flex justify-center p-4">
                  <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              )}
            </div>
          ) : (
            <div className="text-center p-12 bg-muted/20 rounded-2xl border border-dashed flex flex-col items-center">
              <Fish className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-slate-900 dark:text-white">אין תפיסות כרגע</p>
              <p className="text-xs text-muted-foreground mt-1">תהיה הראשון לשתף תפיסה!</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

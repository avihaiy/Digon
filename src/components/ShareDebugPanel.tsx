import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bug, X, Trash2, RefreshCw } from 'lucide-react';
import { getShareDebugLog, clearShareDebugLog, type ShareDebugEntry } from '@/lib/receipt-share';

export function ShareDebugPanel() {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<ShareDebugEntry[]>([]);

  const refresh = () => setEntries(getShareDebugLog());

  useEffect(() => {
    if (open) refresh();
  }, [open]);

  if (!open) {
    return (
      <Button
        size="icon"
        variant="outline"
        className="fixed bottom-4 left-4 z-50 h-10 w-10 rounded-full shadow-lg opacity-60 hover:opacity-100"
        onClick={() => setOpen(true)}
        title="Share Debug"
      >
        <Bug className="h-4 w-4" />
      </Button>
    );
  }

  const methodColor = (method: string) => {
    if (method.includes('native')) return 'default';
    if (method.includes('wa_direct') || method.includes('whatsapp')) return 'secondary';
    return 'outline';
  };

  const resultColor = (result: string) => {
    if (result.includes('success') || result.includes('shared') || result.includes('clipboard')) return 'text-green-600';
    if (result.includes('aborted')) return 'text-yellow-600';
    if (result.includes('failed')) return 'text-red-600';
    return 'text-muted-foreground';
  };

  return (
    <Card className="fixed bottom-4 left-4 z-50 w-80 max-h-96 overflow-hidden shadow-xl border-2">
      <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          <Bug className="h-4 w-4" />
          Share Debug Log
        </CardTitle>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={refresh}>
            <RefreshCw className="h-3 w-3" />
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { clearShareDebugLog(); refresh(); }}>
            <Trash2 className="h-3 w-3" />
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setOpen(false)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 overflow-y-auto max-h-72">
        {entries.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No share attempts yet. Share a receipt to see debug info.
          </p>
        ) : (
          <div className="space-y-2">
            {entries.map((e, i) => (
              <div key={i} className="text-xs border rounded p-2 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-muted-foreground">{e.timestamp}</span>
                  <span className="font-bold">#{e.receiptNumber}</span>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  <Badge variant="outline" className="text-[10px] px-1 py-0">{e.platform}</Badge>
                  <Badge variant={methodColor(e.method)} className="text-[10px] px-1 py-0">{e.method}</Badge>
                  <Badge variant="outline" className="text-[10px] px-1 py-0">{e.fileType}</Badge>
                  {e.cached && <Badge variant="outline" className="text-[10px] px-1 py-0 bg-blue-50">cached</Badge>}
                </div>
                <div className={`font-medium ${resultColor(e.result)}`}>
                  → {e.result}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

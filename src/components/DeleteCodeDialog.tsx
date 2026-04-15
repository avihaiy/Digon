import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Lock } from 'lucide-react';

interface DeleteCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  isPending?: boolean;
  confirmLabel?: string;
}

export function DeleteCodeDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  isPending = false,
}: DeleteCodeDialogProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);

  const { data: deleteCode } = useQuery({
    queryKey: ['app-settings-delete-code'],
    queryFn: async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'delete_protection_code')
        .maybeSingle();
      return data?.value || '';
    },
  });

  useEffect(() => {
    if (!open) {
      setCode('');
      setError(false);
    }
  }, [open]);

  const handleConfirm = () => {
    // If no code is set, allow deletion without code
    if (!deleteCode) {
      onConfirm();
      return;
    }
    if (code === deleteCode) {
      onConfirm();
    } else {
      setError(true);
    }
  };

  const codeRequired = !!deleteCode;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-destructive" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {codeRequired && (
          <div className="space-y-2 py-2">
            <Label>הזן קוד מחיקה לאישור</Label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirm();
              }}
              placeholder="הזן קוד..."
              dir="ltr"
              className={`font-mono text-center text-xl tracking-widest ${error ? 'border-destructive' : ''}`}
              autoFocus
            />
            {error && (
              <p className="text-sm text-destructive">קוד שגוי, נסה שוב</p>
            )}
          </div>
        )}

        <AlertDialogFooter className="flex-row-reverse gap-2">
          <AlertDialogCancel>ביטול</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending || (codeRequired && code.length === 0)}
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'מחק'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

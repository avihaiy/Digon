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
  confirmLabel,
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

  const resolvedLabel = confirmLabel || (title.includes('עריכ') ? 'אשר' : 'מחק');
  const buttonVariant = title.includes('עריכ') ? 'default' as const : 'destructive' as const;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent dir="rtl" className="max-w-[calc(100vw-2rem)] sm:max-w-lg rounded-xl p-4 sm:p-6">
        <AlertDialogHeader className="space-y-1.5">
          <AlertDialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-destructive shrink-0" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs sm:text-sm">{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {codeRequired && (
          <div className="space-y-2 py-1 sm:py-2">
            <Label className="text-xs sm:text-sm">הזן קוד לאישור</Label>
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
              className={`font-mono text-center text-lg sm:text-xl tracking-widest h-11 ${error ? 'border-destructive' : ''}`}
              autoFocus
            />
            {error && (
              <p className="text-xs sm:text-sm text-destructive">קוד שגוי, נסה שוב</p>
            )}
          </div>
        )}

        <AlertDialogFooter className="flex-row-reverse gap-2 mt-2">
          <AlertDialogCancel className="h-10 min-w-[80px] text-sm">ביטול</AlertDialogCancel>
          <Button
            variant={buttonVariant}
            onClick={handleConfirm}
            disabled={isPending || (codeRequired && code.length === 0)}
            className="h-10 min-w-[80px] text-sm"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : resolvedLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

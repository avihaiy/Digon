import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/hebrew-utils';

export interface AshkavaData {
  enabled: boolean;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface BrachaData {
  enabled: boolean;
  type: 'single' | 'package_10' | 'package_20' | 'unlimited';
  price: number;
}

interface Props {
  memberId?: string;
  ashkava: AshkavaData;
  bracha: BrachaData;
  onAshkavaChange: (data: AshkavaData) => void;
  onBrachaChange: (data: BrachaData) => void;
}

export default function AshkavaBrachaBlock({
  memberId,
  ashkava,
  bracha,
  onAshkavaChange,
  onBrachaChange,
}: Props) {
  // Fetch settings for prices
  const { data: settings } = useQuery({
    queryKey: ['app-settings-prices'],
    queryFn: async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['ashkava_unit_price', 'bracha_unit_price', 'bracha_package_10_price', 'bracha_package_20_price']);
      const map: Record<string, number> = {};
      data?.forEach((s) => { map[s.key] = Number(s.value); });
      return map;
    },
  });

  // Fetch member's active bracha package balance
  const { data: memberBracha } = useQuery({
    queryKey: ['member-bracha', memberId],
    queryFn: async () => {
      if (!memberId) return null;
      const { data } = await (supabase as any)
        .from('bracha_packages')
        .select('*')
        .eq('member_id', memberId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);
      return data?.[0] || null;
    },
    enabled: !!memberId,
  });

  const ashkavaPrice = settings?.ashkava_unit_price || 30;
  const brachaPrice = settings?.bracha_unit_price || 180;
  const bracha10Price = settings?.bracha_package_10_price || 1500;
  const bracha20Price = settings?.bracha_package_20_price || 2500;

  // Initialize ashkava unit price from settings
  useEffect(() => {
    if (settings && ashkava.unitPrice === 0) {
      onAshkavaChange({ ...ashkava, unitPrice: ashkavaPrice });
    }
  }, [settings]);

  const handleAshkavaToggle = (checked: boolean) => {
    onAshkavaChange({
      ...ashkava,
      enabled: checked,
      quantity: checked ? Math.max(1, ashkava.quantity) : 0,
      unitPrice: ashkavaPrice,
      total: checked ? Math.max(1, ashkava.quantity) * ashkavaPrice : 0,
    });
  };

  const handleAshkavaQuantity = (val: string) => {
    const qty = Math.min(15, Math.max(1, Number(val) || 1));
    onAshkavaChange({
      ...ashkava,
      quantity: qty,
      total: qty * ashkava.unitPrice,
    });
  };

  const handleBrachaToggle = (checked: boolean) => {
    onBrachaChange({
      ...bracha,
      enabled: checked,
      price: checked ? brachaPrice : 0,
    });
  };

  const handleBrachaType = (type: string) => {
    let price = brachaPrice;
    if (type === 'package_10') price = bracha10Price;
    else if (type === 'package_20') price = bracha20Price;
    else if (type === 'unlimited') price = 5000;
    onBrachaChange({
      ...bracha,
      type: type as BrachaData['type'],
      price,
    });
  };

  return (
    <div className="space-y-4">
      {/* Ashkava Block */}
      <div className="p-4 rounded-xl border border-border bg-secondary/30">
        <div className="flex items-center gap-3 mb-3">
          <Checkbox
            id="ashkava-toggle"
            checked={ashkava.enabled}
            onCheckedChange={handleAshkavaToggle}
          />
          <Label htmlFor="ashkava-toggle" className="text-base font-bold cursor-pointer">
            🕯 קניית אשכבה
          </Label>
        </div>

        {ashkava.enabled && (
          <div className="space-y-3 mr-7">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">מספר אשכבות</Label>
                <Input
                  type="number"
                  min={1}
                  max={15}
                  value={ashkava.quantity}
                  onChange={(e) => handleAshkavaQuantity(e.target.value)}
                  dir="ltr"
                  className="text-center font-bold"
                />
              </div>
              <div>
                <Label className="text-xs">מחיר ליחידה</Label>
                <Input
                  type="number"
                  value={ashkava.unitPrice}
                  onChange={(e) => {
                    const up = Number(e.target.value) || 0;
                    onAshkavaChange({
                      ...ashkava,
                      unitPrice: up,
                      total: ashkava.quantity * up,
                    });
                  }}
                  dir="ltr"
                  className="text-center"
                />
              </div>
              <div>
                <Label className="text-xs">סה״כ</Label>
                <div className="h-10 flex items-center justify-center rounded-md bg-muted font-bold text-lg">
                  {formatCurrency(ashkava.total)}
                </div>
              </div>
            </div>

            {ashkava.quantity > 15 && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>ניתן לרכוש עד 15 אשכבות</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bracha Block */}
      <div className="p-4 rounded-xl border border-border bg-secondary/30">
        <div className="flex items-center gap-3 mb-3">
          <Checkbox
            id="bracha-toggle"
            checked={bracha.enabled}
            onCheckedChange={handleBrachaToggle}
          />
          <Label htmlFor="bracha-toggle" className="text-base font-bold cursor-pointer">
            ✨ ברכת השנה
          </Label>
          {memberBracha && (
            <Badge variant="secondary" className="mr-auto">
              יתרה: {memberBracha.package_type === 'unlimited' ? '∞' : memberBracha.balance}
            </Badge>
          )}
        </div>

        {bracha.enabled && (
          <div className="space-y-3 mr-7">
            <Select value={bracha.type} onValueChange={handleBrachaType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">ברכה חד פעמית - {formatCurrency(brachaPrice)}</SelectItem>
                <SelectItem value="package_10">חבילת 10 ברכות - {formatCurrency(bracha10Price)}</SelectItem>
                <SelectItem value="package_20">חבילת 20 ברכות - {formatCurrency(bracha20Price)}</SelectItem>
                <SelectItem value="unlimited">חבילה ללא הגבלה - {formatCurrency(5000)}</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">סה״כ לתשלום:</span>
              <span className="text-lg font-bold">{formatCurrency(bracha.price)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

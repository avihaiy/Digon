import { startOfMonth, subMonths } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

export interface PublicFinanceMonthlyData {
  label: string;
  month: string;
  isCurrent: boolean;
  income: number;
  expenses: number;
  balance: number;
}

export interface PublicFinanceDisplayStats {
  thisMonthIncome: number;
  thisMonthExpenses: number;
  thisMonthBalance: number;
  monthlyData: PublicFinanceMonthlyData[];
}

interface RpcMonthlyData {
  label?: string | null;
  month?: string | null;
  isCurrent?: boolean | null;
  income?: number | string | null;
  expenses?: number | string | null;
  balance?: number | string | null;
}

interface RpcFinanceDisplayStats {
  thisMonthIncome?: number | string | null;
  thisMonthExpenses?: number | string | null;
  thisMonthBalance?: number | string | null;
  monthlyData?: RpcMonthlyData[] | null;
}

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function getMonthLabel(offsetFromCurrent: number): string {
  return startOfMonth(subMonths(new Date(), offsetFromCurrent)).toLocaleDateString("he-IL", {
    month: "long",
  });
}

export async function fetchPublicFinanceDisplayStats(monthsCount = 3): Promise<PublicFinanceDisplayStats> {
  const rpcClient = supabase as unknown as {
    rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: RpcFinanceDisplayStats | null; error: Error | null }>;
  };

  const { data, error } = await rpcClient.rpc("get_public_finance_display_stats", {
    months_count: monthsCount,
  });

  if (error) throw error;

  const rawMonthlyData = Array.isArray(data?.monthlyData) ? data.monthlyData : [];

  const monthlyData = rawMonthlyData.map((month, index) => {
    const offsetFromCurrent = rawMonthlyData.length - index - 1;
    const localizedLabel = getMonthLabel(offsetFromCurrent);

    return {
      label: localizedLabel,
      month: localizedLabel,
      isCurrent: Boolean(month.isCurrent),
      income: toNumber(month.income),
      expenses: toNumber(month.expenses),
      balance: toNumber(month.balance),
    };
  });

  return {
    thisMonthIncome: toNumber(data?.thisMonthIncome),
    thisMonthExpenses: toNumber(data?.thisMonthExpenses),
    thisMonthBalance: toNumber(data?.thisMonthBalance),
    monthlyData,
  };
}
import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { useAppSettings } from './useAppSettings';

export interface DailyReward {
  earnedPoints: number;
  newStreak: number;
}

export function useDailyLogin() {
  const { user, prefs, updateUserPrefs, updateProfileField, points, loading } = useAuth();
  const { data: appSettings } = useAppSettings();
  const [reward, setReward] = useState<DailyReward | null>(null);
  const [hasChecked, setHasChecked] = useState(false);
  const [canClaimDaily, setCanClaimDaily] = useState(false);
  const [potentialReward, setPotentialReward] = useState<DailyReward | null>(null);

  useEffect(() => {
    if (loading || !user) return;
    checkDailyLogin();
  }, [loading, user, prefs?.last_login_date]);

  const checkDailyLogin = async () => {
    setHasChecked(true);
    
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localDate = new Date(today.getTime() - (offset*60*1000));
    const todayStr = localDate.toISOString().split('T')[0];

    const lastLogin = prefs.last_login_date as string | undefined;
    const currentStreak = (prefs.login_streak as number) || 0;

    if (lastLogin === todayStr) {
      setCanClaimDaily(false);
      return;
    }

    let newStreak = 1;
    
    if (lastLogin) {
      const lastDate = new Date(lastLogin);
      const todayDate = new Date(todayStr);
      const diffTime = Math.abs(todayDate.getTime() - lastDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      
      if (diffDays === 1) {
        newStreak = currentStreak + 1;
        if (newStreak > 7) newStreak = 1; 
      }
    }

    // Calculate points based on streak day
    // Get from settings if exists, otherwise fallback to defaults
    const getPointsForDay = (day: number) => {
      const setting = appSettings?.find(s => s.key === `daily_bonus_day_${day}`);
      if (setting && setting.value) return setting.value;
      const defaults: Record<number, number> = { 1:10, 2:20, 3:30, 4:40, 5:50, 6:60, 7:150 };
      return defaults[day] || 10;
    };
    const earnedPoints = getPointsForDay(newStreak);

    setPotentialReward({ earnedPoints, newStreak });
    setCanClaimDaily(true);
  };

  const claimDaily = async () => {
    if (!canClaimDaily || !potentialReward) return;

    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localDate = new Date(today.getTime() - (offset*60*1000));
    const todayStr = localDate.toISOString().split('T')[0];

    const updatedPrefs = {
      ...prefs,
      last_login_date: todayStr,
      login_streak: potentialReward.newStreak
    };
    
    const prefSuccess = await updateUserPrefs(updatedPrefs);
    if (prefSuccess) {
      await updateProfileField('points', points + potentialReward.earnedPoints);
      setReward(potentialReward);
      setCanClaimDaily(false);
    }
  };

  const clearReward = () => setReward(null);

  return {
    reward,
    canClaimDaily,
    potentialReward,
    claimDaily,
    clearReward
  };
}

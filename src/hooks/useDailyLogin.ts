import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

export interface DailyReward {
  earnedPoints: number;
  newStreak: number;
}

export function useDailyLogin() {
  const { user, prefs, updateUserPrefs, updateProfileField, points, loading } = useAuth();
  const [reward, setReward] = useState<DailyReward | null>(null);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    // Only run when auth is loaded, user exists, and we haven't checked yet
    if (loading || !user || hasChecked) return;
    
    checkDailyLogin();
  }, [loading, user, hasChecked]);

  const checkDailyLogin = async () => {
    setHasChecked(true);
    
    // Get local date string YYYY-MM-DD
    const today = new Date();
    // Adjust for timezone offset to get local YYYY-MM-DD
    const offset = today.getTimezoneOffset();
    const localDate = new Date(today.getTime() - (offset*60*1000));
    const todayStr = localDate.toISOString().split('T')[0];

    const lastLogin = prefs.last_login_date as string | undefined;
    const currentStreak = (prefs.login_streak as number) || 0;

    if (lastLogin === todayStr) {
      // Already logged in today
      return;
    }

    let newStreak = 1;
    
    if (lastLogin) {
      // Calculate days difference
      const lastDate = new Date(lastLogin);
      const todayDate = new Date(todayStr);
      
      // Calculate difference in days (ignoring time)
      const diffTime = Math.abs(todayDate.getTime() - lastDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      
      if (diffDays === 1) {
        // Logged in yesterday, increment streak
        newStreak = currentStreak + 1;
        // Cap streak at 7, then it resets to 1
        if (newStreak > 7) newStreak = 1; 
      }
    }

    // Calculate points based on streak day
    const pointsMap: Record<number, number> = {
      1: 10,
      2: 20,
      3: 30,
      4: 40,
      5: 50,
      6: 60,
      7: 150 // Weekly grand prize
    };
    
    const earnedPoints = pointsMap[newStreak] || 10;

    // Update preferences in Appwrite
    const updatedPrefs = {
      ...prefs,
      last_login_date: todayStr,
      login_streak: newStreak
    };
    
    const prefSuccess = await updateUserPrefs(updatedPrefs);
    if (prefSuccess) {
      // Update points in user profile
      await updateProfileField('points', points + earnedPoints);
      
      // Set reward state to trigger UI
      setReward({
        earnedPoints,
        newStreak
      });
    }
  };

  const clearReward = () => setReward(null);

  return {
    reward,
    clearReward
  };
}

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Trophy,
  Zap,
  Target,
  Award,
  TrendingUp,
  CheckCircle2,
  Flame,
  Medal,
  Crown,
  Sparkles
} from "lucide-react";
import { differenceInCalendarDays } from "date-fns";

const BADGES = [
  { id: 'first_note', name: 'First Note', icon: '📝', description: 'Complete your first documentation', points: 50 },
  { id: 'compliance_star', name: 'Compliance Star', icon: '⭐', description: 'Achieve 95%+ compliance score', points: 100 },
  { id: 'speed_demon', name: 'Speed Demon', icon: '⚡', description: 'Document a visit in under 10 minutes', points: 75 },
  { id: 'perfect_week', name: 'Perfect Week', icon: '🏆', description: '7 days of 100% compliance', points: 200 },
  { id: 'care_champion', name: 'Care Champion', icon: '💪', description: 'Complete 50 visits', points: 150 },
  { id: 'learner', name: 'Quick Learner', icon: '🎓', description: 'Complete 5 training modules', points: 100 },
  { id: 'mentor', name: 'Mentor', icon: '🌟', description: 'Help 3 colleagues improve scores', points: 250 },
  { id: 'streak_master', name: 'Streak Master', icon: '🔥', description: '30-day documentation streak', points: 300 },
];

const LEVELS = [
  { level: 1, name: 'Rookie', minPoints: 0, maxPoints: 100 },
  { level: 2, name: 'Apprentice', minPoints: 100, maxPoints: 300 },
  { level: 3, name: 'Professional', minPoints: 300, maxPoints: 600 },
  { level: 4, name: 'Expert', minPoints: 600, maxPoints: 1000 },
  { level: 5, name: 'Master', minPoints: 1000, maxPoints: 1500 },
  { level: 6, name: 'Champion', minPoints: 1500, maxPoints: 2500 },
  { level: 7, name: 'Legend', minPoints: 2500, maxPoints: Infinity },
];

export default function GamificationDashboard({ userEmail, compact = false }) {
  const [userStats, setUserStats] = useState(null);
  const [_showCelebration, _setShowCelebration] = useState(false);

  // Load user gamification data
  useEffect(() => {
    if (userEmail) {
      loadUserStats();
    }
  }, [userEmail]);

  const loadUserStats = () => {
    try {
      const stored = localStorage.getItem(`gamification_${userEmail}`);
      if (stored) {
        setUserStats(JSON.parse(stored));
        return;
      }
    } catch {}
    // Initialize new user
    const initial = {
      points: 0,
      badges: [],
      streak: 0,
      lastActivity: null,
      completedVisits: 0,
      completedTraining: 0,
      weeklyPoints: 0,
      monthlyPoints: 0
    };
    try { localStorage.setItem(`gamification_${userEmail}`, JSON.stringify(initial)); } catch {}
    setUserStats(initial);
  };

  const getCurrentLevel = () => {
    if (!userStats) return LEVELS[0];
    return LEVELS.find(l => userStats.points >= l.minPoints && userStats.points < l.maxPoints) || LEVELS[LEVELS.length - 1];
  };

  const getProgressToNextLevel = () => {
    if (!userStats) return 0;
    const level = getCurrentLevel();
    if (level.maxPoints === Infinity) return 100;
    const progress = ((userStats.points - level.minPoints) / (level.maxPoints - level.minPoints)) * 100;
    return Math.min(progress, 100);
  };

  const getEarnedBadges = () => {
    if (!userStats?.badges) return [];
    return BADGES.filter(b => userStats.badges.includes(b.id));
  };

  const _getAvailableBadges = () => {
    if (!userStats?.badges) return BADGES;
    return BADGES.filter(b => !userStats.badges.includes(b.id));
  };

  if (!userStats) {
    return null;
  }

  const currentLevel = getCurrentLevel();
  const earnedBadges = getEarnedBadges();

  if (compact) {
    return (
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-bold text-slate-900">Level {currentLevel.level}: {currentLevel.name}</p>
                <div className="flex items-center gap-2">
                  <Progress value={getProgressToNextLevel()} className="w-24 h-2" />
                  <span className="text-xs text-slate-600">{userStats.points} pts</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {userStats.streak > 0 && (
                <Badge className="bg-orange-500 text-white gap-1">
                  <Flame className="w-3 h-3" />
                  {userStats.streak} day streak
                </Badge>
              )}
              <Badge variant="outline" className="gap-1">
                <Medal className="w-3 h-3" />
                {earnedBadges.length} badges
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Level & Points Header */}
      <Card className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-none">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                <Crown className="w-10 h-10 text-yellow-300" />
              </div>
              <div>
                <p className="text-purple-100 text-sm">Current Level</p>
                <h2 className="text-3xl font-bold">Level {currentLevel.level}: {currentLevel.name}</h2>
                <div className="flex items-center gap-3 mt-2">
                  <Progress value={getProgressToNextLevel()} className="w-48 h-3 bg-white/20" />
                  <span className="text-sm">{userStats.points} / {currentLevel.maxPoints === Infinity ? '∞' : currentLevel.maxPoints} pts</span>
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold">{userStats.streak}</p>
                <p className="text-xs text-purple-200 flex items-center gap-1">
                  <Flame className="w-3 h-3" /> Day Streak
                </p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">{earnedBadges.length}</p>
                <p className="text-xs text-purple-200 flex items-center gap-1">
                  <Medal className="w-3 h-3" /> Badges
                </p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">{userStats.weeklyPoints || 0}</p>
                <p className="text-xs text-purple-200 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> This Week
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{userStats.completedVisits || 0}</p>
            <p className="text-xs text-slate-600">Visits Documented</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Target className="w-8 h-8 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold">{userStats.avgCompliance || 0}%</p>
            <p className="text-xs text-slate-600">Avg Compliance</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Award className="w-8 h-8 mx-auto mb-2 text-purple-500" />
            <p className="text-2xl font-bold">{userStats.completedTraining || 0}</p>
            <p className="text-xs text-slate-600">Training Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Zap className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
            <p className="text-2xl font-bold">{userStats.avgDocTime || 0}m</p>
            <p className="text-xs text-slate-600">Avg Doc Time</p>
          </CardContent>
        </Card>
      </div>

      {/* Earned Badges */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Medal className="w-5 h-5 text-yellow-500" />
            Your Badges ({earnedBadges.length}/{BADGES.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {BADGES.map((badge) => {
              const earned = userStats.badges?.includes(badge.id);
              return (
                <div
                  key={badge.id}
                  className={`p-4 rounded-lg text-center transition-all ${
                    earned 
                      ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300' 
                      : 'bg-slate-100 opacity-50'
                  }`}
                >
                  <span className="text-3xl">{badge.icon}</span>
                  <p className="font-semibold text-sm mt-2">{badge.name}</p>
                  <p className="text-xs text-slate-600">{badge.description}</p>
                  <Badge className={`mt-2 ${earned ? 'bg-yellow-500' : 'bg-slate-400'}`}>
                    +{badge.points} pts
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Weekly Challenges */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            Weekly Challenges
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: 'Document 10 visits', progress: 7, total: 10, reward: 50 },
              { name: 'Achieve 95% compliance on 5 notes', progress: 3, total: 5, reward: 75 },
              { name: 'Complete 2 training modules', progress: 1, total: 2, reward: 40 },
              { name: 'Maintain 7-day streak', progress: userStats.streak, total: 7, reward: 100 },
            ].map((challenge, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{challenge.name}</span>
                  <Badge variant="outline" className="text-xs">+{challenge.reward} pts</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={(challenge.progress / challenge.total) * 100} className="flex-1 h-2" />
                  <span className="text-xs text-slate-600">{challenge.progress}/{challenge.total}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper function to add points (call from other components)
export const addGamificationPoints = (userEmail, points, action, badgeId = null) => {
  let stored;
  try {
    stored = localStorage.getItem(`gamification_${userEmail}`);
  } catch { return; }
  if (!stored) return;

  let stats;
  try { stats = JSON.parse(stored); } catch { return; }
  stats.points += points;
  stats.weeklyPoints = (stats.weeklyPoints || 0) + points;
  stats.lastActivity = new Date().toISOString();
  
  // Update streak
  const lastDate = stats.lastActivityDate ? new Date(stats.lastActivityDate) : null;
  const today = new Date();
  if (lastDate) {
    // Compare calendar days, not 24h deltas: activity at 9:00 one day and 8:00
    // the next is a new day (delta < 24h) and must still extend the streak.
    const daysDiff = differenceInCalendarDays(today, lastDate);
    if (daysDiff === 1) {
      stats.streak += 1;
    } else if (daysDiff > 1) {
      stats.streak = 1;
    }
    // daysDiff === 0 (same calendar day): leave streak unchanged.
  } else {
    stats.streak = 1;
  }
  stats.lastActivityDate = today.toISOString();
  
  // Add badge if earned
  if (badgeId && !stats.badges.includes(badgeId)) {
    stats.badges.push(badgeId);
  }
  
  // Track specific actions
  if (action === 'visit_completed') {
    stats.completedVisits = (stats.completedVisits || 0) + 1;
  } else if (action === 'training_completed') {
    stats.completedTraining = (stats.completedTraining || 0) + 1;
  }
  
  try { localStorage.setItem(`gamification_${userEmail}`, JSON.stringify(stats)); } catch {}
  return stats;
};
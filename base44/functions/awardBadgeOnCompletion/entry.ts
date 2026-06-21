import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { attempt_id } = await req.json();

    // Get the attempt
    const attempt = await base44.entities.TrainingAttempt.filter({ id: attempt_id });
    if (!attempt || attempt.length === 0) {
      return Response.json({ error: 'Attempt not found' }, { status: 404 });
    }

    const attemptData = attempt[0];

    // Authorization: a user may only earn badges from their OWN attempt. The
    // attempt was read with the user-scoped client, but enforce ownership
    // explicitly so a forwarded/guessed attempt_id can't award to this account.
    if (user.role !== 'admin' && attemptData.user_id && attemptData.user_id !== user.email) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Idempotency (complete): once an attempt has been processed, re-running is a
    // no-op — this covers attempts that earn NO badge too, which would otherwise
    // re-bump streak/courses on every replay. The UserBadge check below is a
    // backstop for attempts processed before this marker field existed.
    if (attemptData.badges_processed_at) {
      return Response.json({ success: true, already_awarded: true, badges_awarded: 0, badges: [] });
    }
    const priorBadges = await base44.entities.UserBadge
      .filter({ user_id: user.email }, '-earned_at', 500).catch(() => []);
    if (priorBadges.some((b) => b?.trigger_context?.attempt_id === attemptData.id)) {
      return Response.json({ success: true, already_awarded: true, badges_awarded: 0, badges: [] });
    }

    const badgesAwarded = [];

    // Get or create leaderboard entry
    let leaderboard = await base44.entities.Leaderboard.filter({ user_id: user.email });
    if (!leaderboard || leaderboard.length === 0) {
      leaderboard = [await base44.entities.Leaderboard.create({
        user_id: user.email,
        user_name: user.full_name,
        total_points: 0,
        badges_earned: 0,
        courses_completed: 0,
        current_streak: 0,
        longest_streak: 0,
        perfect_scores: 0
      })];
    }
    const leaderboardEntry = leaderboard[0];

    // Get all available badges
    const allBadges = await base44.entities.SkillBadge.filter({ active: true });

    // Check for Perfect Score (100%)
    if (attemptData.score === 100) {
      const perfectBadge = allBadges.find(b => b.badge_type === 'perfect_score');
      if (perfectBadge) {
        const userBadge = await base44.entities.UserBadge.create({
          user_id: user.email,
          user_name: user.full_name,
          badge_id: perfectBadge.id,
          badge_name: perfectBadge.name,
          badge_type: perfectBadge.badge_type,
          earned_at: new Date().toISOString(),
          points_awarded: perfectBadge.points,
          trigger_context: {
            attempt_id: attemptData.id,
            course_id: attemptData.course_id,
            score: attemptData.score
          }
        });
        badgesAwarded.push(userBadge);

        // Update leaderboard perfect scores
        await base44.entities.Leaderboard.update(leaderboardEntry.id, {
          perfect_scores: (leaderboardEntry.perfect_scores || 0) + 1
        });
      }
    }

    // Check for High Score (90%+)
    if (attemptData.score >= 90 && attemptData.score < 100) {
      const highScoreBadge = allBadges.find(b => b.badge_type === 'high_score');
      if (highScoreBadge) {
        const userBadge = await base44.entities.UserBadge.create({
          user_id: user.email,
          user_name: user.full_name,
          badge_id: highScoreBadge.id,
          badge_name: highScoreBadge.name,
          badge_type: highScoreBadge.badge_type,
          earned_at: new Date().toISOString(),
          points_awarded: highScoreBadge.points,
          trigger_context: {
            attempt_id: attemptData.id,
            course_id: attemptData.course_id,
            score: attemptData.score
          }
        });
        badgesAwarded.push(userBadge);
      }
    }

    // Check for Early Completion (completed before due date)
    const assignment = await base44.entities.TrainingAssignment.filter({ id: attemptData.assignment_id });
    if (assignment && assignment.length > 0) {
      const dueDate = new Date(assignment[0].due_date);
      const completedDate = new Date(attemptData.submitted_at);
      const daysEarly = Math.ceil((dueDate - completedDate) / (1000 * 60 * 60 * 24));

      if (daysEarly > 0) {
        const earlyBadge = allBadges.find(b => b.badge_type === 'early_completion');
        if (earlyBadge) {
          const userBadge = await base44.entities.UserBadge.create({
            user_id: user.email,
            user_name: user.full_name,
            badge_id: earlyBadge.id,
            badge_name: earlyBadge.name,
            badge_type: earlyBadge.badge_type,
            earned_at: new Date().toISOString(),
            points_awarded: earlyBadge.points,
            trigger_context: {
              attempt_id: attemptData.id,
              course_id: attemptData.course_id,
              days_early: daysEarly
            }
          });
          badgesAwarded.push(userBadge);
        }
      }
    }

    // Update streak
    const newStreak = (leaderboardEntry.current_streak || 0) + 1;
    const longestStreak = Math.max(newStreak, leaderboardEntry.longest_streak || 0);

    // Check for Streak Badge (5, 10, 20, 50 completions)
    const streakMilestones = [5, 10, 20, 50];
    if (streakMilestones.includes(newStreak)) {
      const streakBadge = allBadges.find(b => b.badge_type === 'streak');
      if (streakBadge) {
        const userBadge = await base44.entities.UserBadge.create({
          user_id: user.email,
          user_name: user.full_name,
          badge_id: streakBadge.id,
          badge_name: `${newStreak} Course Streak`,
          badge_type: streakBadge.badge_type,
          earned_at: new Date().toISOString(),
          points_awarded: streakBadge.points * (newStreak / 5),
          trigger_context: {
            streak_count: newStreak
          }
        });
        badgesAwarded.push(userBadge);
      }
    }

    // Calculate total points from badges
    const totalPointsFromBadges = badgesAwarded.reduce((sum, badge) => sum + (badge.points_awarded || 0), 0);

    // Update leaderboard
    await base44.entities.Leaderboard.update(leaderboardEntry.id, {
      total_points: (leaderboardEntry.total_points || 0) + totalPointsFromBadges,
      badges_earned: (leaderboardEntry.badges_earned || 0) + badgesAwarded.length,
      courses_completed: (leaderboardEntry.courses_completed || 0) + 1,
      current_streak: newStreak,
      longest_streak: longestStreak,
      last_activity: new Date().toISOString()
    });

    // Send notification for each badge earned
    for (const badge of badgesAwarded) {
      await base44.entities.Notification.create({
        user_email: user.email,
        title: '🎉 New Badge Earned!',
        message: `Congratulations! You earned the "${badge.badge_name}" badge and ${badge.points_awarded} points!`,
        type: 'info',
        priority: 'low',
        action_url: '/LearningCenter',
        action_label: 'View Learning',
        metadata: {
          badge_id: badge.badge_id,
          badge_name: badge.badge_name,
          points: badge.points_awarded
        }
      });
    }

    // Mark the attempt processed so any replay short-circuits at the top. Done
    // last so a mid-processing failure doesn't mark it done with no awards.
    await base44.entities.TrainingAttempt.update(attemptData.id, {
      badges_processed_at: new Date().toISOString(),
    }).catch((e) => console.error('Failed to mark attempt badges_processed_at:', e?.message));

    return Response.json({
      success: true,
      badges_awarded: badgesAwarded.length,
      badges: badgesAwarded,
      total_points_earned: totalPointsFromBadges,
      new_streak: newStreak
    });

  } catch (error) {
    console.error('Badge awarding failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
/**
 * Stats and award computation logic.
 */

export interface ParticipantScore {
  participantId: string;
  participantName: string;
  agreementCount: number;
  totalVotes: number;
  score: number; // agreementCount / totalVotes
}

export interface PairwiseCorrelation {
  participant1Id: string;
  participant1Name: string;
  participant2Id: string;
  participant2Name: string;
  agreementCount: number;
  totalMatches: number;
  correlation: number; // agreementCount / totalMatches
}

export interface MatchContext {
  matchId: string;
  contestant1Id: string | null;
  contestant2Id: string | null;
  winnerId: string | null;
  roundNumber: number;
}

export interface StatsResult {
  individualScores: ParticipantScore[];
  pairwiseCorrelations: PairwiseCorrelation[];
  awards: Award[];
}

export interface Award {
  emoji: string;
  title: string;
  description: string;
  participantIds: string[];
  participantNames: string[];
}

interface VoteData {
  matchId: string;
  participantId: string;
  participantName: string;
  votedForId: string;
}

type ParticipantMap = Record<string, { name: string; agreed: number; total: number }>;

export function computeStats(votes: VoteData[], matches: MatchContext[] = []): StatsResult {
  // Group votes by match
  const votesByMatch: Record<string, VoteData[]> = {};
  for (const vote of votes) {
    if (!votesByMatch[vote.matchId]) votesByMatch[vote.matchId] = [];
    votesByMatch[vote.matchId].push(vote);
  }

  // Compute majority per match
  const majorityByMatch: Record<string, string> = {};
  for (const [matchId, matchVotes] of Object.entries(votesByMatch)) {
    const counts: Record<string, number> = {};
    for (const v of matchVotes) {
      counts[v.votedForId] = (counts[v.votedForId] || 0) + 1;
    }
    const majority = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (majority) majorityByMatch[matchId] = majority[0];
  }

  // Individual scores: how many times each participant voted with majority
  const participantMap: ParticipantMap = {};
  for (const vote of votes) {
    if (!participantMap[vote.participantId]) {
      participantMap[vote.participantId] = {
        name: vote.participantName,
        agreed: 0,
        total: 0,
      };
    }
    participantMap[vote.participantId].total++;
    if (majorityByMatch[vote.matchId] === vote.votedForId) {
      participantMap[vote.participantId].agreed++;
    }
  }

  const individualScores: ParticipantScore[] = Object.entries(participantMap)
    .map(([id, data]) => ({
      participantId: id,
      participantName: data.name,
      agreementCount: data.agreed,
      totalVotes: data.total,
      score: data.total > 0 ? data.agreed / data.total : 0,
    }))
    .sort((a, b) => b.score - a.score);

  // Pairwise correlations: for each pair, how many matches did they vote the same?
  const participantIds = Object.keys(participantMap);
  const pairwiseCorrelations: PairwiseCorrelation[] = [];

  for (let i = 0; i < participantIds.length; i++) {
    for (let j = i + 1; j < participantIds.length; j++) {
      const p1 = participantIds[i];
      const p2 = participantIds[j];

      const p1Votes: Record<string, string> = {};
      const p2Votes: Record<string, string> = {};
      for (const vote of votes) {
        if (vote.participantId === p1) p1Votes[vote.matchId] = vote.votedForId;
        if (vote.participantId === p2) p2Votes[vote.matchId] = vote.votedForId;
      }

      const commonMatches = Object.keys(p1Votes).filter((m) => m in p2Votes);
      const agreed = commonMatches.filter((m) => p1Votes[m] === p2Votes[m]).length;

      if (commonMatches.length > 0) {
        pairwiseCorrelations.push({
          participant1Id: p1,
          participant1Name: participantMap[p1].name,
          participant2Id: p2,
          participant2Name: participantMap[p2].name,
          agreementCount: agreed,
          totalMatches: commonMatches.length,
          correlation: agreed / commonMatches.length,
        });
      }
    }
  }

  const awards = computeAwards(
    individualScores,
    pairwiseCorrelations,
    votesByMatch,
    participantMap,
    matches
  );

  return { individualScores, pairwiseCorrelations, awards };
}

function computeAwards(
  scores: ParticipantScore[],
  pairs: PairwiseCorrelation[],
  votesByMatch: Record<string, VoteData[]>,
  participantMap: ParticipantMap,
  matches: MatchContext[]
): Award[] {
  const awards: Award[] = [];
  if (scores.length === 0) return awards;

  const sorted = [...scores].sort((a, b) => b.score - a.score);

  // 🥇 Top scorer
  awards.push({
    emoji: "🥇",
    title: "The Crowd Champion",
    description: "Top scorer — most often voted with the majority",
    participantIds: [sorted[0].participantId],
    participantNames: [sorted[0].participantName],
  });

  // 🥈 Runner-up
  if (sorted.length > 1) {
    awards.push({
      emoji: "🥈",
      title: "The People's Choice Silver",
      description: "Runner-up in majority agreement",
      participantIds: [sorted[1].participantId],
      participantNames: [sorted[1].participantName],
    });
  }

  // 🙃 Contrarian
  const contrarian = sorted[sorted.length - 1];
  awards.push({
    emoji: "🙃",
    title: "The Contrarian",
    description: "Most often voted against the majority",
    participantIds: [contrarian.participantId],
    participantNames: [contrarian.participantName],
  });

  // ✨ Flawless (rare — only awarded when the bracket is fully complete)
  const maxRound = matches.length > 0 ? Math.max(...matches.map((m) => m.roundNumber)) : 0;
  const finalMatches = matches.filter((m) => m.roundNumber === maxRound);
  const bracketComplete = finalMatches.length === 1 && finalMatches[0].winnerId !== null;
  if (bracketComplete) {
    const flawless = scores.filter((s) => s.score === 1.0 && s.totalVotes >= 1);
    if (flawless.length > 0) {
      awards.push({
        emoji: "✨",
        title: "Flawless",
        description: "Voted with the majority in every single match",
        participantIds: flawless.map((s) => s.participantId),
        participantNames: flawless.map((s) => s.participantName),
      });
    }
  }

  if (pairs.length === 0 && matches.length === 0) return awards;

  // Pairwise-based awards
  if (pairs.length > 0) {
    const sortedPairs = [...pairs].sort((a, b) => b.correlation - a.correlation);

    // ❤️ Dynamic Duo
    const dynamicDuo = sortedPairs[0];
    awards.push({
      emoji: "❤️",
      title: "Dynamic Duo",
      description: "Highest pairwise agreement between any two participants",
      participantIds: [dynamicDuo.participant1Id, dynamicDuo.participant2Id],
      participantNames: [dynamicDuo.participant1Name, dynamicDuo.participant2Name],
    });

    // 🤝 Solid Alliance (2nd highest pair)
    if (sortedPairs.length > 1) {
      const solidAlliance = sortedPairs[1];
      awards.push({
        emoji: "🤝",
        title: "Solid Alliance",
        description: "Second-highest pairwise agreement",
        participantIds: [solidAlliance.participant1Id, solidAlliance.participant2Id],
        participantNames: [solidAlliance.participant1Name, solidAlliance.participant2Name],
      });
    }

    // ⚡ The Mismatch — lowest correlation pair
    const mismatch = sortedPairs[sortedPairs.length - 1];
    awards.push({
      emoji: "⚡",
      title: "The Mismatch",
      description: "Most-disagreeing pair of participants",
      participantIds: [mismatch.participant1Id, mismatch.participant2Id],
      participantNames: [mismatch.participant1Name, mismatch.participant2Name],
    });

    // 🥊 The Odd Couple — most disagreeing pair not involving the Contrarian
    const nonContrarianPairs = sortedPairs.filter(
      (p) =>
        p.participant1Id !== contrarian.participantId &&
        p.participant2Id !== contrarian.participantId
    );
    if (nonContrarianPairs.length > 0) {
      const oddCouple = nonContrarianPairs[nonContrarianPairs.length - 1];
      awards.push({
        emoji: "🥊",
        title: "The Odd Couple",
        description: "Most disagreeing pair, excluding the Contrarian",
        participantIds: [oddCouple.participant1Id, oddCouple.participant2Id],
        participantNames: [oddCouple.participant1Name, oddCouple.participant2Name],
      });
    }

    // 🤷 How Bro? — non-Contrarian with highest agreement with Contrarian
    const contrarianPairs = pairs
      .filter(
        (p) =>
          p.participant1Id === contrarian.participantId ||
          p.participant2Id === contrarian.participantId
      )
      .sort((a, b) => b.correlation - a.correlation);

    if (contrarianPairs.length > 0) {
      const howBroPair = contrarianPairs[0];
      const howBroId =
        howBroPair.participant1Id === contrarian.participantId
          ? howBroPair.participant2Id
          : howBroPair.participant1Id;
      const howBroName =
        howBroPair.participant1Id === contrarian.participantId
          ? howBroPair.participant2Name
          : howBroPair.participant1Name;
      awards.push({
        emoji: "🤷",
        title: "How Bro?",
        description: "Highest agreement with the Contrarian",
        participantIds: [howBroId],
        participantNames: [howBroName],
      });
    }
  }

  // 🌶️ Hot Take — most lone-dissenter votes (voted alone in a match with ≥2 voters)
  const hotTakeCounts: Record<string, number> = {};
  for (const [, matchVotes] of Object.entries(votesByMatch)) {
    if (matchVotes.length < 2) continue;
    const voteCounts: Record<string, string[]> = {};
    for (const v of matchVotes) {
      if (!voteCounts[v.votedForId]) voteCounts[v.votedForId] = [];
      voteCounts[v.votedForId].push(v.participantId);
    }
    for (const voters of Object.values(voteCounts)) {
      if (voters.length === 1) {
        hotTakeCounts[voters[0]] = (hotTakeCounts[voters[0]] || 0) + 1;
      }
    }
  }
  const hotTakeTop = Object.entries(hotTakeCounts).sort((a, b) => b[1] - a[1]);
  if (hotTakeTop.length > 0) {
    const [htId] = hotTakeTop[0];
    awards.push({
      emoji: "🌶️",
      title: "Hot Take",
      description: "Most often the lone dissenter in a vote",
      participantIds: [htId],
      participantNames: [participantMap[htId].name],
    });
  }

  // 🎯 Clutch — most wins in matches decided by exactly 1 vote (min 3 such matches)
  const clutchCounts: Record<string, number> = {};
  for (const [, matchVotes] of Object.entries(votesByMatch)) {
    const voteCounts: Record<string, number> = {};
    for (const v of matchVotes) {
      voteCounts[v.votedForId] = (voteCounts[v.votedForId] || 0) + 1;
    }
    const sortedCounts = Object.entries(voteCounts).sort((a, b) => b[1] - a[1]);
    if (sortedCounts.length < 2) continue;
    if (sortedCounts[0][1] - sortedCounts[1][1] !== 1) continue;
    const majorityId = sortedCounts[0][0];
    for (const v of matchVotes) {
      if (v.votedForId === majorityId) {
        clutchCounts[v.participantId] = (clutchCounts[v.participantId] || 0) + 1;
      }
    }
  }
  const clutchTop = Object.entries(clutchCounts)
    .filter(([, c]) => c >= 3)
    .sort((a, b) => b[1] - a[1]);
  if (clutchTop.length > 0) {
    const [clutchId] = clutchTop[0];
    awards.push({
      emoji: "🎯",
      title: "Clutch",
      description: "Most often on the winning side of votes decided by a single vote (min. 3)",
      participantIds: [clutchId],
      participantNames: [participantMap[clutchId].name],
    });
  }

  // 👑 True Believer (rare) — voted for the tournament champion in every match they voted in
  if (matches.length > 0) {
    const resolvedMatches = matches.filter((m) => m.winnerId !== null);
    const finalMatch = resolvedMatches.sort((a, b) => b.roundNumber - a.roundNumber)[0];
    if (finalMatch?.winnerId) {
      const championId = finalMatch.winnerId;
      // All matches where the champion appeared and votes were cast
      const championMatches = matches.filter(
        (m) =>
          (m.contestant1Id === championId || m.contestant2Id === championId) &&
          votesByMatch[m.matchId]?.length > 0
      );
      if (championMatches.length > 0) {
        const trueBelievers: string[] = [];
        for (const pid of Object.keys(participantMap)) {
          // Matches where champion appeared AND this participant voted
          const participated = championMatches.filter((m) =>
            votesByMatch[m.matchId]?.some((v) => v.participantId === pid)
          );
          if (participated.length === 0) continue;
          // Must have backed champion in every one of those matches
          const alwaysBacked = participated.every((m) =>
            votesByMatch[m.matchId]?.some(
              (v) => v.participantId === pid && v.votedForId === championId
            )
          );
          if (alwaysBacked) trueBelievers.push(pid);
        }
        if (trueBelievers.length > 0) {
          awards.push({
            emoji: "👑",
            title: "True Believer",
            description: "Backed the tournament champion in every round",
            participantIds: trueBelievers,
            participantNames: trueBelievers.map((id) => participantMap[id].name),
          });
        }
      }
    }
  }

  return awards;
}

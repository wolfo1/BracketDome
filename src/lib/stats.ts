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

export function computeStats(votes: VoteData[]): StatsResult {
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
  const participantMap: Record<
    string,
    { name: string; agreed: number; total: number }
  > = {};
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

      // Find matches where both participated
      const p1Votes: Record<string, string> = {};
      const p2Votes: Record<string, string> = {};
      for (const vote of votes) {
        if (vote.participantId === p1) p1Votes[vote.matchId] = vote.votedForId;
        if (vote.participantId === p2) p2Votes[vote.matchId] = vote.votedForId;
      }

      const commonMatches = Object.keys(p1Votes).filter(
        (m) => m in p2Votes
      );
      const agreed = commonMatches.filter(
        (m) => p1Votes[m] === p2Votes[m]
      ).length;

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

  // Compute awards
  const awards = computeAwards(individualScores, pairwiseCorrelations);

  return { individualScores, pairwiseCorrelations, awards };
}

function computeAwards(
  scores: ParticipantScore[],
  pairs: PairwiseCorrelation[]
): Award[] {
  const awards: Award[] = [];
  if (scores.length === 0) return awards;

  const sorted = [...scores].sort((a, b) => b.score - a.score);

  // Top scorer
  awards.push({
    emoji: "🥇",
    title: "The Crowd Champion",
    description: "Top scorer — most often voted with the majority",
    participantIds: [sorted[0].participantId],
    participantNames: [sorted[0].participantName],
  });

  // Runner-up(s)
  if (sorted.length > 1) {
    awards.push({
      emoji: "🥈",
      title: "The People's Choice Silver",
      description: "Runner-up in majority agreement",
      participantIds: [sorted[1].participantId],
      participantNames: [sorted[1].participantName],
    });
  }

  // Contrarian
  const contrarian = sorted[sorted.length - 1];
  awards.push({
    emoji: "🙃",
    title: "The Contrarian",
    description: "Most often voted against the majority",
    participantIds: [contrarian.participantId],
    participantNames: [contrarian.participantName],
  });

  if (pairs.length === 0) return awards;

  const sortedPairs = [...pairs].sort((a, b) => b.correlation - a.correlation);

  // Dynamic Duo
  const dynamicDuo = sortedPairs[0];
  awards.push({
    emoji: "❤️",
    title: "Dynamic Duo",
    description: "Highest pairwise agreement between any two participants",
    participantIds: [dynamicDuo.participant1Id, dynamicDuo.participant2Id],
    participantNames: [
      dynamicDuo.participant1Name,
      dynamicDuo.participant2Name,
    ],
  });

  // Solid Alliance (2nd highest pair)
  if (sortedPairs.length > 1) {
    const solidAlliance = sortedPairs[1];
    awards.push({
      emoji: "🤝",
      title: "Solid Alliance",
      description: "Second-highest pairwise agreement",
      participantIds: [
        solidAlliance.participant1Id,
        solidAlliance.participant2Id,
      ],
      participantNames: [
        solidAlliance.participant1Name,
        solidAlliance.participant2Name,
      ],
    });
  }

  // The Mismatch — lowest correlation pair
  const mismatch = sortedPairs[sortedPairs.length - 1];
  awards.push({
    emoji: "⚡",
    title: "The Mismatch",
    description: "Most-disagreeing pair of participants",
    participantIds: [mismatch.participant1Id, mismatch.participant2Id],
    participantNames: [mismatch.participant1Name, mismatch.participant2Name],
  });

  // The Odd Couple — most disagreeing pair not involving the Contrarian
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

  // How Bro? — non-Contrarian participant with highest correlation to Contrarian
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

  return awards;
}

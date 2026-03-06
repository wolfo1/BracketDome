export type TournamentStatus = "SETUP" | "ACTIVE" | "COMPLETED";

export interface TournamentSummary {
  id: string;
  title: string;
  description: string | null;
  status: TournamentStatus;
  createdAt: string;
  contestantCount: number;
  participantCount: number;
}

export interface ContestantData {
  id: string;
  name: string;
  seed: number;
}

export interface ParticipantData {
  id: string;
  name: string;
}

export interface VoteData {
  participantId: string;
  participantName: string;
  votedForId: string;
  votedForName: string;
}

export interface MatchData {
  id: string;
  position: number;
  contestant1: ContestantData | null;
  contestant2: ContestantData | null;
  winner: ContestantData | null;
  votes: VoteData[];
}

export interface RoundData {
  id: string;
  number: number;
  name: string;
  matches: MatchData[];
}

export interface TournamentData {
  id: string;
  title: string;
  description: string | null;
  status: TournamentStatus;
  contestants: ContestantData[];
  participants: ParticipantData[];
  rounds: RoundData[];
}

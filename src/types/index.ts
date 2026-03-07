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

export interface ContestantLink {
  id: string;
  url: string;
}

export interface ContestantData {
  id: string;
  name: string;
  seed: number;
  links: ContestantLink[];
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
  resolvedAt: string | null;
  votes: VoteData[];
}

export interface RoundData {
  id: string;
  number: number;
  name: string;
  matches: MatchData[];
}

export interface AdminData {
  userId: string;
  email: string;
  name: string;
}

export interface ViewerData {
  id: string;
  email: string;
}

export interface TournamentData {
  id: string;
  title: string;
  description: string | null;
  status: TournamentStatus;
  isPrivate: boolean;
  startDate: string | null;
  maxParticipants: number;
  createdBy: string;
  contestants: ContestantData[];
  participants: ParticipantData[];
  rounds: RoundData[];
  admins: AdminData[];
  viewers: ViewerData[];
}

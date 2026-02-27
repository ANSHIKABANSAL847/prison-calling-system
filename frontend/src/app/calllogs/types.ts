export interface PopulatedAgent {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export interface PopulatedPrisoner {
  _id: string;
  fullName: string;
  prisonerId: number;
  prisonName: string;
}

export interface PopulatedContact {
  _id: string;
  contactName: string;
  relation: string;
  phoneNumber: string;
}

export interface CallLog {
  _id: string;
  sessionId: string;
  agent: PopulatedAgent;
  prisoner: PopulatedPrisoner;
  contact: PopulatedContact;
  date: string;
  /** "mm:ss" formatted by server */
  duration: string;
  durationSeconds: number;
  verificationResult: "Verified" | "Failed" | "Pending";
  similarityScore: number;
  audioUrl?: string;
  notes?: string;
}

export interface AppliedFilters {
  status: string;
  dateFrom: string;
  dateTo: string;
  similarityMin: string;
  similarityMax: string;
}

export const RELATION_OPTIONS = [
  "Wife", "Husband", "Father", "Mother", "Brother",
  "Sister", "Son", "Daughter", "Lawyer", "Friend", "Other",
] as const;

export type RelationOption = typeof RELATION_OPTIONS[number];

/** Relations where only ONE contact is allowed per prisoner */
export const SINGLETON_RELATIONS = ["Father", "Mother", "Wife", "Husband"] as const;

export type SingletonRelation = typeof SINGLETON_RELATIONS[number];

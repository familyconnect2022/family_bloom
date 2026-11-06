/** Pure, tiny solution relation vocabulary. No Firebase, no WebView, no subscriptions. */
export type StudyRelation='none'|'implies'|'iff'|'equals';
export const STUDY_RELATIONS:readonly StudyRelation[]=['none','implies','iff','equals'];
export const studyRelationGlyph:Record<StudyRelation,string>={none:'',implies:'⇒',iff:'⇔',equals:'='};

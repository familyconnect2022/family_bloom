// In-memory invalidation only; scoped screens own all private content.
let revision=0;export const articleRefreshRevision=()=>revision;export function markArticlesChanged(){revision++;}

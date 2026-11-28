'use strict';
// Search only public byline and title, never account profile or hidden identity.
const fold=v=>typeof v==='string'?v.normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase('vi').replace(/đ/g,'d').trim():'';
function matchesArticleSearch(article,query){const q=fold(query);return !q||fold(article?.title).includes(q)||fold(article?.authorName).includes(q);}
module.exports={matchesArticleSearch};

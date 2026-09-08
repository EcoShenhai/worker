'use strict';
// Government-style reference generator: OP/PA/<TYPE>/<YEAR>/<SEQ>
const typeCodes = {
  minutes: 'MIN', memo: 'MEMO', letter: 'LTR', report: 'RPT',
  policy_brief: 'PB', briefing_note: 'BN', concept_note: 'CN',
  circular: 'CIRC', action_matrix: 'AM',
};

function generateReference(type, seq) {
  const year = new Date().getFullYear();
  const code = typeCodes[type] || 'DOC';
  const n = String(seq || Math.floor(Math.random() * 9000) + 1000).padStart(4, '0');
  return `OP/PA/${code}/${year}/${n}`;
}

module.exports = { generateReference, typeCodes };

"use strict";

/**
 * CPAMind territory -> curriculum-language availability.
 *
 * These are the languages designated for curriculum/interface availability
 * in the CPAMind international architecture. They do not imply that every
 * course or qualification has already been translated into that language.
 */
const TERRITORY_LANGUAGES = {
  en: ["AG","AU","BB","BM","BN","BS","BT","BW","BZ","CA","CM","DM","ER","FJ","FM","GB","GD","GH","GM","GY","HK","IE","IN","JM","KE","KI","KN","LC","LR","LS","MH","MT","MU","MW","NA","NG","NR","NZ","PG","PH","PK","PW","RW","SB","SC","SG","SL","SS","SZ","TO","TT","TV","TZ","UG","US","VC","VG","VI","VU","WS","ZA","ZM","ZW"],
  fr: ["BE","BF","BI","BJ","CA","CD","CF","CG","CH","CI","CM","DJ","FR","GA","GN","HT","KM","LU","MC","MG","ML","NE","SN","TD","TG","VU"],
  es: ["AR","BO","CL","CO","CR","CU","DO","EC","ES","GQ","GT","HN","MX","NI","PA","PE","PR","PY","SV","UY","VE"],
  ar: ["AE","BH","DZ","EG","IQ","JO","KW","LB","LY","MA","MR","OM","PS","QA","SA","SD","SY","TN","YE"],
  pt: ["AO","BR","CV","GW","MZ","PT","ST","TL"],
  nl: ["AW","BE","CW","NL","SR"],
  de: ["AT","CH","DE","LI","LU"],
  zh: ["CN","HK","MO","TW"],
  it: ["CH","IT","SM","VA"],
  ru: ["BY","KZ","RU"],
  el: ["CY","GR"],
  ko: ["KP","KR"],
  ms: ["BN","MY"],
  fa: ["AF","IR"],
  ro: ["MD","RO"],
  sv: ["FI","SE"],
  af: ["ZA"],
  sq: ["AL"],
  am: ["ET"],
  hy: ["AM"],
  az: ["AZ"],
  be: ["BY"],
  bn: ["BD"],
  bs: ["BA"],
  bg: ["BG"],
  my: ["MM"],
  ca: ["AD"],
  hr: ["HR"],
  cs: ["CZ"],
  da: ["DK"],
  dv: ["MV"],
  et: ["EE"],
  fil: ["PH"],
  fi: ["FI"],
  ka: ["GE"],
  kl: ["GL"],
  he: ["IL"],
  hi: ["IN"],
  hu: ["HU"],
  is: ["IS"],
  id: ["ID"],
  ga: ["IE"],
  ja: ["JP"],
  kk: ["KZ"],
  km: ["KH"],
  ky: ["KG"],
  lo: ["LA"],
  lv: ["LV"],
  lt: ["LT"],
  mk: ["MK"],
  mt: ["MT"],
  mn: ["MN"],
  cnr: ["ME"],
  ne: ["NP"],
  no: ["NO"],
  pl: ["PL"],
  sr: ["RS"],
  si: ["LK"],
  sk: ["SK"],
  sl: ["SI"],
  so: ["SO"],
  sw: ["TZ"],
  tg: ["TJ"],
  ta: ["LK"],
  tet: ["TL"],
  th: ["TH"],
  tr: ["TR"],
  tk: ["TM"],
  uk: ["UA"],
  ur: ["PK"],
  uz: ["UZ"],
  vi: ["VN"]
};

const TERRITORY_TO_LANGUAGES = {};

for (const [languageCode, territoryCodes] of Object.entries(TERRITORY_LANGUAGES)) {
  for (const territoryCode of territoryCodes) {
    if (!TERRITORY_TO_LANGUAGES[territoryCode]) {
      TERRITORY_TO_LANGUAGES[territoryCode] = [];
    }
    TERRITORY_TO_LANGUAGES[territoryCode].push(languageCode);
  }
}

module.exports = {
  TERRITORY_LANGUAGES,
  TERRITORY_TO_LANGUAGES
};

"use strict";

/**
 * CPAMind territory registry.
 *
 * The CPAMind international universe is deliberately smaller than the
 * complete ISO 3166-1 list. It contains the 205 territories defined for
 * CPAMind's international architecture.
 *
 * Codes are ISO 3166-1 alpha-2 codes. Display names are CPAMind UI names.
 */
const TERRITORY_CODES = [
  "AD","AE","AF","AG","AL","AM","AO","AR","AT","AU","AZ",
  "BA","BB","BD","BE","BF","BG","BH","BI","BJ","BN","BO","BR","BS","BT","BW","BY","BZ",
  "CA","CD","CF","CG","CH","CI","CL","CM","CN","CO","CR","CU","CV","CW","CY","CZ",
  "DE","DJ","DK","DM","DO","DZ",
  "EC","EE","EG","ER","ES","ET",
  "FI","FJ","FM","FR",
  "GA","GB","GD","GE","GH","GM","GN","GQ","GR","GT","GW","GY",
  "HK","HN","HR","HT","HU",
  "ID","IE","IL","IN","IQ","IR","IS","IT",
  "JM","JO","JP",
  "KE","KG","KH","KI","KM","KN","KP","KR","KW","KZ",
  "LA","LB","LC","LI","LK","LR","LS","LT","LU","LV","LY",
  "MA","MC","MD","ME","MG","MH","MK","ML","MM","MN","MO","MR","MT","MU","MV","MW","MX","MY","MZ",
  "NA","NE","NG","NI","NL","NO","NP","NR","NZ",
  "OM",
  "PA","PE","PG","PH","PK","PL","PR","PS","PT","PW","PY",
  "QA",
  "RO","RS","RU","RW",
  "SA","SB","SC","SD","SE","SG","SI","SK","SL","SM","SN","SO","SR","SS","ST","SV","SY","SZ",
  "TD","TG","TH","TJ","TL","TM","TN","TO","TR","TT","TV","TW","TZ",
  "UA","UG","US","UY","UZ",
  "VA","VC","VE","VG","VI","VN","VU",
  "WS",
  "YE",
  "ZA","ZM","ZW",
  "BM","GL","AW"
];

const DISPLAY_NAMES = {
  AD: "Andorra", AE: "United Arab Emirates", AF: "Afghanistan", AG: "Antigua and Barbuda",
  AL: "Albania", AM: "Armenia", AO: "Angola", AR: "Argentina", AT: "Austria", AU: "Australia",
  AZ: "Azerbaijan", BA: "Bosnia and Herzegovina", BB: "Barbados", BD: "Bangladesh",
  BE: "Belgium", BF: "Burkina Faso", BG: "Bulgaria", BH: "Bahrain", BI: "Burundi",
  BJ: "Benin", BN: "Brunei", BO: "Bolivia", BR: "Brazil", BS: "Bahamas", BT: "Bhutan",
  BW: "Botswana", BY: "Belarus", BZ: "Belize", CA: "Canada", CD: "Democratic Republic of the Congo",
  CF: "Central African Republic", CG: "Republic of the Congo", CH: "Switzerland",
  CI: "Côte d’Ivoire", CL: "Chile", CM: "Cameroon", CN: "China", CO: "Colombia",
  CR: "Costa Rica", CU: "Cuba", CV: "Cabo Verde", CW: "Curaçao", CY: "Cyprus", CZ: "Czechia",
  DE: "Germany", DJ: "Djibouti", DK: "Denmark", DM: "Dominica", DO: "Dominican Republic",
  DZ: "Algeria", EC: "Ecuador", EE: "Estonia", EG: "Egypt", ER: "Eritrea", ES: "Spain",
  ET: "Ethiopia", FI: "Finland", FJ: "Fiji", FM: "Micronesia", FR: "France", GA: "Gabon",
  GB: "United Kingdom", GD: "Grenada", GE: "Georgia", GH: "Ghana", GM: "Gambia",
  GN: "Guinea", GQ: "Equatorial Guinea", GR: "Greece", GT: "Guatemala", GW: "Guinea-Bissau",
  GY: "Guyana", HK: "Hong Kong", HN: "Honduras", HR: "Croatia", HT: "Haiti", HU: "Hungary",
  ID: "Indonesia", IE: "Ireland", IL: "Israel", IN: "India", IQ: "Iraq", IR: "Iran",
  IS: "Iceland", IT: "Italy", JM: "Jamaica", JO: "Jordan", JP: "Japan", KE: "Kenya",
  KG: "Kyrgyzstan", KH: "Cambodia", KI: "Kiribati", KM: "Comoros", KN: "Saint Kitts and Nevis",
  KP: "North Korea", KR: "South Korea", KW: "Kuwait", KZ: "Kazakhstan", LA: "Laos",
  LB: "Lebanon", LC: "Saint Lucia", LI: "Liechtenstein", LK: "Sri Lanka", LR: "Liberia",
  LS: "Lesotho", LT: "Lithuania", LU: "Luxembourg", LV: "Latvia", LY: "Libya", MA: "Morocco",
  MC: "Monaco", MD: "Moldova", ME: "Montenegro", MG: "Madagascar", MH: "Marshall Islands",
  MK: "North Macedonia", ML: "Mali", MM: "Myanmar", MN: "Mongolia", MO: "Macau",
  MR: "Mauritania", MT: "Malta", MU: "Mauritius", MV: "Maldives", MW: "Malawi",
  MX: "Mexico", MY: "Malaysia", MZ: "Mozambique", NA: "Namibia", NE: "Niger",
  NG: "Nigeria", NI: "Nicaragua", NL: "Netherlands", NO: "Norway", NP: "Nepal", NR: "Nauru",
  NZ: "New Zealand", OM: "Oman", PA: "Panama", PE: "Peru", PG: "Papua New Guinea",
  PH: "Philippines", PK: "Pakistan", PL: "Poland", PR: "Puerto Rico", PS: "Palestine",
  PT: "Portugal", PW: "Palau", PY: "Paraguay", QA: "Qatar", RO: "Romania", RS: "Serbia",
  RU: "Russia", RW: "Rwanda", SA: "Saudi Arabia", SB: "Solomon Islands", SC: "Seychelles",
  SD: "Sudan", SE: "Sweden", SG: "Singapore", SI: "Slovenia", SK: "Slovakia",
  SL: "Sierra Leone", SM: "San Marino", SN: "Senegal", SO: "Somalia", SR: "Suriname",
  SS: "South Sudan", ST: "São Tomé and Príncipe", SV: "El Salvador", SY: "Syria", SZ: "Eswatini",
  TD: "Chad", TG: "Togo", TH: "Thailand", TJ: "Tajikistan", TL: "Timor-Leste",
  TM: "Turkmenistan", TN: "Tunisia", TO: "Tonga", TR: "Türkiye", TT: "Trinidad and Tobago",
  TV: "Tuvalu", TW: "Taiwan", TZ: "Tanzania", UA: "Ukraine", UG: "Uganda", US: "United States",
  UY: "Uruguay", UZ: "Uzbekistan", VA: "Vatican City", VC: "Saint Vincent and the Grenadines",
  VE: "Venezuela", VG: "British Virgin Islands", VI: "U.S. Virgin Islands", VN: "Vietnam",
  VU: "Vanuatu", WS: "Samoa", YE: "Yemen", ZA: "South Africa", ZM: "Zambia", ZW: "Zimbabwe",
  BM: "Bermuda", GL: "Greenland", AW: "Aruba"
};

const TERRITORIES = TERRITORY_CODES.map((code) => ({
  code,
  name: DISPLAY_NAMES[code]
}));

const TERRITORY_BY_CODE = Object.fromEntries(
  TERRITORIES.map((territory) => [territory.code, territory])
);

module.exports = {
  TERRITORIES,
  TERRITORY_BY_CODE
};

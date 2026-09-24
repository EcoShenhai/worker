"use strict";

/**
 * CPAMind international curriculum-language registry.
 *
 * This is interface/curriculum metadata only.
 * It does NOT imply that CPAMind course materials are translated.
 */
const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "fr", name: "French" },
  { code: "es", name: "Spanish" },
  { code: "ar", name: "Arabic" },
  { code: "pt", name: "Portuguese" },
  { code: "nl", name: "Dutch" },
  { code: "de", name: "German" },
  { code: "zh", name: "Chinese" },
  { code: "it", name: "Italian" },
  { code: "ru", name: "Russian" },
  { code: "el", name: "Greek" },
  { code: "ko", name: "Korean" },
  { code: "ms", name: "Malay" },
  { code: "fa", name: "Persian" },
  { code: "ro", name: "Romanian" },
  { code: "sv", name: "Swedish" },
  { code: "af", name: "Afrikaans" },
  { code: "sq", name: "Albanian" },
  { code: "am", name: "Amharic" },
  { code: "hy", name: "Armenian" },
  { code: "az", name: "Azerbaijani" },
  { code: "be", name: "Belarusian" },
  { code: "bn", name: "Bengali" },
  { code: "bs", name: "Bosnian" },
  { code: "bg", name: "Bulgarian" },
  { code: "my", name: "Burmese" },
  { code: "ca", name: "Catalan" },
  { code: "hr", name: "Croatian" },
  { code: "cs", name: "Czech" },
  { code: "da", name: "Danish" },
  { code: "dv", name: "Dhivehi" },
  { code: "et", name: "Estonian" },
  { code: "fil", name: "Filipino" },
  { code: "fi", name: "Finnish" },
  { code: "ka", name: "Georgian" },
  { code: "kl", name: "Greenlandic (Kalaallisut)" },
  { code: "he", name: "Hebrew" },
  { code: "hi", name: "Hindi" },
  { code: "hu", name: "Hungarian" },
  { code: "is", name: "Icelandic" },
  { code: "id", name: "Indonesian" },
  { code: "ga", name: "Irish" },
  { code: "ja", name: "Japanese" },
  { code: "kk", name: "Kazakh" },
  { code: "km", name: "Khmer" },
  { code: "ky", name: "Kyrgyz" },
  { code: "lo", name: "Lao" },
  { code: "lv", name: "Latvian" },
  { code: "lt", name: "Lithuanian" },
  { code: "mk", name: "Macedonian" },
  { code: "mt", name: "Maltese" },
  { code: "mn", name: "Mongolian" },
  { code: "cnr", name: "Montenegrin" },
  { code: "ne", name: "Nepali" },
  { code: "no", name: "Norwegian" },
  { code: "pl", name: "Polish" },
  { code: "sr", name: "Serbian" },
  { code: "si", name: "Sinhala" },
  { code: "sk", name: "Slovak" },
  { code: "sl", name: "Slovenian" },
  { code: "so", name: "Somali" },
  { code: "sw", name: "Swahili" },
  { code: "tg", name: "Tajik" },
  { code: "ta", name: "Tamil" },
  { code: "tet", name: "Tetum" },
  { code: "th", name: "Thai" },
  { code: "tr", name: "Turkish" },
  { code: "tk", name: "Turkmen" },
  { code: "uk", name: "Ukrainian" },
  { code: "ur", name: "Urdu" },
  { code: "uz", name: "Uzbek" },
  { code: "vi", name: "Vietnamese" }
];

const byCode = Object.fromEntries(LANGUAGES.map((language) => [language.code, language]));

module.exports = {
  LANGUAGES,
  LANGUAGE_BY_CODE: byCode
};

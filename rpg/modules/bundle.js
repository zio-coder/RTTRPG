const langs = ["en", "ko"];
const bundles = {};
langs.forEach(
  (lang) => (bundles[lang] = Database.readObject("bundle_" + lang + ".json"))
);

module.exports = {
  langs: langs,
  bundles: bundles,
  find: (lang, key) => bundles[lang || "ko"][key],
};

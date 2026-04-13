const createExpoWebpackConfigAsync = require('@expo/webpack-config');

function stripSourceMapLoader(rules) {
  if (!Array.isArray(rules)) return [];

  return rules
    .map((rule) => {
      if (!rule) return rule;

      if (Array.isArray(rule.oneOf)) {
        return { ...rule, oneOf: stripSourceMapLoader(rule.oneOf) };
      }

      if (Array.isArray(rule.rules)) {
        return { ...rule, rules: stripSourceMapLoader(rule.rules) };
      }

      if (typeof rule.loader === 'string' && rule.loader.includes('source-map-loader')) {
        return null;
      }

      if (Array.isArray(rule.use)) {
        const nextUse = rule.use.filter((entry) => {
          if (typeof entry === 'string') return !entry.includes('source-map-loader');
          if (entry && typeof entry.loader === 'string') return !entry.loader.includes('source-map-loader');
          return true;
        });
        return { ...rule, use: nextUse };
      }

      return rule;
    })
    .filter(Boolean);
}

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);
  config.module.rules = stripSourceMapLoader(config.module.rules);
  return config;
};

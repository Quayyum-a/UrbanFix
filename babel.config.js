module.exports = function (api) {
  api.cache(true);

  const isTest =
    process.env.JEST_WORKER_ID !== undefined || process.env.NODE_ENV === "test";

  return {
    presets: ["babel-preset-expo"],
    plugins: isTest
      ? []
      : [
          // Reanimated plugin has to be listed last
          "react-native-reanimated/plugin",
        ],
  };
};

const entrypoint = ({ proxies = [], config = {}, lib, constant = {}, context, ...rest }) => {
  const out = proxies.filter(
    (proxy) =>
      proxy?.properties?.hidden === undefined || !proxy.properties.hidden,
  );
  config.outbounds
    .filter((p) => ["selector", "urltest"].includes(p.type))
    .map((selector) => {
      if (
        [
          "🙋 Select",
          "🔍 Google",
          "🐈 Git",
          "📦 Microsoft",
          "🎬 Entertainment",
          "📺 Youtube",
          "🤖 AI-Service",
          "🍎 Apple",
        ].includes(selector.tag)
      ) {
        selector.outbounds.push(...out.map((o) => o.name));
      } else if (["✈️ TelegramDC1(NA)"].includes(selector.tag)) {
        selector.outbounds.push(
          ...out
            .filter(
              (o) =>
                lib.location.getArea(o) === "AREA_NORTH_AMERICA" ||
                lib.location.getLocation(o) === "JP",
            )
            .map((o) => o.name),
        );
      } else if (["✈️ TelegramDC4(EU)"].includes(selector.tag)) {
        selector.outbounds.push(
          ...out
            .filter(
              (o) =>
                lib.location.getArea(o) === "AREA_EUROPE" ||
                lib.location.getLocation(o) === "HK",
            )
            .map((o) => o.name),
        );
      } else if (["✈️ TelegramDC5(AP)"].includes(selector.tag)) {
        selector.outbounds.push(
          ...out
            .filter((o) => lib.location.getArea(o) === "AREA_ASIA")
            .map((o) => o.name),
        );
      }
    });
  return { proxies, config, ...rest };
};

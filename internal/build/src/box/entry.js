const assembledConfigs = new WeakSet();

const assembleConfig = ({
  config = {},
  proxies = [],
  endpoints = [],
  lib,
  constant = {},
}) => {
  if (assembledConfigs.has(config)) return config;
  const assembled = {
    ...config,
    outbounds: [
      ...(config.outbounds ?? []),
      ...lib.default.produce(proxies, constant),
    ],
    endpoints: [
      ...(config.endpoints ?? []),
      ...lib.default.produceEndpoint(endpoints, constant),
    ],
  };
  assembledConfigs.add(assembled);
  return assembled;
};

const entrypoint = async ({ context = {}, lib, constant = {}, ...rest } = {}) => {
  const lookupQuery = (name) => {
    return $options?._req?.query?.[name];
  };
  const sourceContent =
    typeof $content === "string" && $content.trim() !== ""
      ? $content.trim()
      : Array.isArray($files)
        ? $files[0]
        : "{}";

  const generated = {
    config: JSON.parse(sourceContent || "{}"),
    experimental: {},
    ua: lib.default.uaLookup(
      $options?._req?.headers?.["user-agent"] ||
        $options?._req?.headers?.["User-Agent"] ||
        context.test?.ua,
    ),
  };

  if (lookupQuery("user") || context.test?.user) {
    const userID = lookupQuery("user") || context.test?.user || "";
    const produced = await produceArtifact({
      type: lookupQuery("prod_type") || "collection",
      name: userID,
      platform: "json",
      produceType: "internal",
    });
    generated.proxies = produced.filter((proxy) =>
      [
        "socks",
        "http",
        "ss",
        "vmess",
        "trojan",
        "naive",
        "hysteria",
        "hysteria2",
        "vless",
        "tuic",
        "anytls",
        "tor",
        "ssh",
        "snell",
      ].includes(proxy.type),
    );
    generated.endpoints = produced.filter((proxy) =>
      ["wireguard", "tailscale"].includes(proxy.type),
    );
  } else {
    generated.proxies = [];
  }

  (lookupQuery("experimental") || context.test?.experimental || "")
    .split(",")
    .map((fe) => {
      generated.experimental[fe] = true;
    });

  return { ...rest, ...generated };
};

const postEntrypoint = ({
  config = {},
  proxies = [],
  endpoints = [],
  lib,
  constant = {},
  context,
  ...rest
}) => {
  const assembledConfig = assembleConfig({
    config,
    proxies,
    endpoints,
    lib,
    constant,
  });
  const assembled = {
    ...rest,
    config: assembledConfig,
  };
  // The entry post step is the final stack item, so emit after all post steps.
  $content = JSON.stringify(assembled.config);
  return assembled;
};

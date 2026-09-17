// @call = applyDnsEnhanced
const applyDnsEnhanced = ({ config = {}, experimental = {}, ...rest }) => {
  // client subnet
  const getClientIP = () => {
    const req = $options?._req;
    const headers = req?.headers ?? {};

    const ip =
      headers["cf-connecting-ip"] ||
      headers["true-client-ip"] ||
      headers["x-real-ip"] ||
      headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req?.socket?.remoteAddress;
    return ip === undefined ? "114.114.114.114" : ip.trim();
  };

  const clientIP = getClientIP();
  for (const dnsRule of [...(config?.dns?.rules ?? [])])
    if (dnsRule.client_subnet === "") dnsRule.client_subnet = clientIP;

  // experimental h3
  if (experimental.dns_cn_use_h3 && Array.isArray(config?.dns?.servers))
    config.dns.servers.map((dns) => {
      if (dns.tag === context.const.dns.direct) dns.type = "h3";
    });

  // leak
  if (experimental.dns_leak_boost && Array.isArray(config?.dns?.rules)) {
    config.dns.rules.map((r) => {
      if (r.server === context.const.dns.ecs) {
        r.server = context.const.dns.direct;
        r.client_subnet = undefined;
      }
    });
  }

  // no local
  if (experimental.dns_local_use_dhcp && Array.isArray(config?.dns?.servers))
    config.dns.servers
      .filter((server) => server.type === "local")
      .forEach((server) => (server.type = "dhcp"));

  return { config, experimental, ...rest };
};

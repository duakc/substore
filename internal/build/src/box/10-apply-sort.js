const entrypoint = ({ proxies = [], lib, constant = {}, context, ...rest }) => {
  const sortedProxies = lib.location.sortProxies({ proxies });

  // Notice heer , different platform has different name selector (tag or name)
  const names = lib.default.produce(proxies, constant).map((pp) => pp.tag);
  return {
    proxies: sortedProxies.filter((sp) => names.includes(sp.name)),
    ...rest,
  };
};

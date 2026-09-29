const fs = require("node:fs");

const GEN_TYPE_DYNAMIC = "dynamic";
const GEN_TYPE_STATIC = "static";

const generateConfig = {
  dataSoucre: {
    useUpstream: (name) => !name.startsWith("@"),
    isGeoip: (name) =>
      name.startsWith("geoip") ||
      name.startsWith("@geoip") ||
      name.startsWith("_geoip"),
    box: {
      upstreamGeositeURL: (name) =>
        "https://raw.githubusercontent.com/SagerNet/sing-geosite/rule-set/" +
        name +
        ".srs",
      upstreamGeoipURL: (name) =>
        "https://raw.githubusercontent.com/duakc/geoip/refs/heads/release/srs/" +
        name.slice(name.indexOf("-") + 1, name.length) +
        ".srs",
      localGeoipURL: (name) =>
        "https://raw.githubusercontent.com/duakc/substore/refs/heads/rule/rule-set/ip/srs/" +
        name +
        ".srs",
      localGeositeURL: (name) =>
        "https://raw.githubusercontent.com/duakc/substore/refs/heads/rule/rule-set/domain/srs/" +
        name +
        ".srs",
      domain: "../../ruleset/domain/srs",
      ip: "../../ruleset/ip/srs",
    },
  },
  box: [
    {
      type: GEN_TYPE_DYNAMIC,
      template: "../../internal/cores/box/template/box.json",
      path: "../../internal/cores/box/box.json",
      embed: true,
    },
    {
      type: GEN_TYPE_DYNAMIC,
      template: "../../internal/cores/box/template/enhanced.json",
      path: "../../internal/cores/box/enhanced.json",
      embed: true,
    },
    {
      type: GEN_TYPE_DYNAMIC,
      template: "../../internal/cores/box/template/minimal.json",
      path: "../../internal/cores/box/minimal.json",
      embed: true,
    },
  ],
};

const main = () => {
  for (const boxItem of generateConfig.box ?? []) {
    applyBox(boxItem);
  }

};

const applyBox = (item) => {
  const ruleset = [];
  const configData = fs.readFileSync(item.template, "utf-8");
  const config = JSON.parse(configData);
  if (!config) {
    console.log("empty template: ", item.template);
    return;
  }

  if (item.type === GEN_TYPE_DYNAMIC) {
    ruleset.push(...genRulesetFromConfig(config));
  } else if (item.type === GEN_TYPE_STATIC && item.staticFile) {
    const content = fs.readFileSync(item.staticFile, "utf8");
    ruleset.push(...content.split(/\r?\n/));
  } else {
    console.log("unknown type");
    return;
  }
  config.route = {
    ...(config.route ?? {}),
    rule_set: [
      ...(config.route?.rule_set ?? []),
      ...ruleset.map((name) => {
        let rulesetObject = {
          tag: name,
        };
        if (generateConfig.dataSoucre.useUpstream(name)) {
          rulesetObject = {
            ...rulesetObject,
            type: "remote",
            format: "binary",
            url: generateConfig.dataSoucre.isGeoip(name)
              ? generateConfig.dataSoucre.box.upstreamGeoipURL(name)
              : generateConfig.dataSoucre.box.upstreamGeositeURL(name),
          };
        } else if (item.embed) {
          const rulePath = generateConfig.dataSoucre.isGeoip(name)
            ? generateConfig.dataSoucre.box.ip + "/" + name + ".json"
            : generateConfig.dataSoucre.box.domain + "/" + name + ".json";
          const rule = JSON.parse(fs.readFileSync(rulePath));
          rulesetObject = {
            ...rulesetObject,
            type: "inline",
            rules: rule.rules,
          };
        } else {
          rulesetObject = {
            ...rulesetObject,
            type: "remote",
            format: "binary",
            url: generateConfig.dataSoucre.isGeoip(name)
              ? generateConfig.dataSoucre.box.localGeoipURL(name)
              : generateConfig.dataSoucre.box.localGeositeURL(name),
          };
          return rulesetObject;
        }
        return rulesetObject;
      }),
    ],
  };
  fs.writeFileSync(item.path, JSON.stringify(config, null, 2));
};

const genRulesetFromConfig = (config) => {
  const lookupRuleset = ({ ruleItem }) => {
    const res = [];
    if (ruleItem === undefined || ruleItem === null) {
    } else if (Array.isArray(ruleItem.rules)) {
      for (const logicalRuleItem of ruleItem.rules) {
        res.push(...lookupRuleset({ ruleItem: logicalRuleItem }));
      }
    } else if (typeof ruleItem.rule_set === "string") {
      res.push(ruleItem.rule_set);
    } else if (Array.isArray(ruleItem.rule_set)) {
      res.push(...ruleItem.rule_set);
    }
    return res;
  };

  const rulesetSet = new Set();

  for (const rs of [
    ...lookupRuleset({ ruleItem: config.route }),
    ...lookupRuleset({ ruleItem: config.dns }),
  ]) {
    rulesetSet.add(rs);
  }
  for (const rs of config.route?.rule_set ?? []) {
    if (rs.tag) rulesetSet.delete(rs.tag);
  }

  return [...rulesetSet]
    .filter((name) => !["@geosite-direct", "@geoip-direct"].includes(name))
    .sort();
};

main();

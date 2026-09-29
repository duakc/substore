const postEntrypoint = ({ context, lib, constant = {}, ...rest }) => {
  const override = context.secret?.superSecretSettings;
  if (typeof override === "function") return override(rest);
  if (override && typeof override === "object") return override;
  return rest;
};

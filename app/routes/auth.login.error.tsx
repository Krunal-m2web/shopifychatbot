export function loginErrorMessage(error: string) {
  if (error === "ShopParamMissing") {
    return "Missing shop parameter";
  }
  if (error === "InvalidShopParam") {
    return "Invalid shop parameter";
  }
  return error;
}

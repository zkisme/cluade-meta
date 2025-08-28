import { claudeCodeConfigType } from "./claudeCode";
import { routerConfigType } from "./router";

export { claudeCodeConfigType } from "./claudeCode";
export { routerConfigType } from "./router";

export const configTypes = [
  claudeCodeConfigType,
  // Temporarily hidden: routerConfigType,
] as const;
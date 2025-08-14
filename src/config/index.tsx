import { claudeCodeConfigType } from "./claudeCode";
import { routerConfigType } from "./router";

export { claudeCodeConfigType } from "./claudeCode";
export { routerConfigType } from "./router";

export const configTypes = [
  claudeCodeConfigType,
  routerConfigType,
] as const;
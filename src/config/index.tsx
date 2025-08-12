import { claudeCodeConfigType } from "./claudeCode";
import { environmentConfigType } from "./environment";
import { routerConfigType } from "./router";

export { claudeCodeConfigType } from "./claudeCode";
export { environmentConfigType } from "./environment";
export { routerConfigType } from "./router";

export const configTypes = [
  claudeCodeConfigType,
  environmentConfigType,
  routerConfigType,
] as const;
/**
 * @scenearc/shared — the contract shared across the SceneArc monorepo.
 *
 * Contains only types and zod schemas. NO secrets, NO proprietary prompt text,
 * and NO server logic live here, because this package can be imported by
 * browser code.
 */
export * from "./enums";
export * from "./script-analysis";
export * from "./prompt-package";
export * from "./extension";

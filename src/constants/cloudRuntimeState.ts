/** Pure in-memory feature state; safe to import on web and native. */
let cloudFunctionsActive = false;
export const getCloudFunctionsRuntimeEnabled = () => cloudFunctionsActive;
export const setCloudFunctionsRuntimeEnabled = (enabled: boolean) => { cloudFunctionsActive = enabled === true; };

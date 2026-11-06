"use strict";
const { getFirestore } = require("firebase-admin/firestore");
const SETTINGS_PATH = "system/featureSwitches";
const developerIdentity = (decoded) => decoded?.email_verified === true &&
  String(decoded.email || "").toLowerCase() === "huynh235@gmail.com";
async function featureOn(feature) {
  try {
    const snap = await getFirestore().doc(SETTINGS_PATH).get();
    return snap.exists && snap.data()?.[feature] === true;
  } catch (error) { console.error("cloudFeatureFlags read failed", error); return false; }
}
module.exports = { developerIdentity, featureOn, SETTINGS_PATH };

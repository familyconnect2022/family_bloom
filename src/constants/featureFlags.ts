/**
 * Runtime and deployment feature switches for Family Bloom.
 *
 * Keep USE_CLOUD_FUNCTIONS=false while the Firebase project is on Spark.
 * When Blaze is enabled later:
 * - deploy the maintained functions source
 * - publish firestore.cloud.rules
 * - set USE_CLOUD_FUNCTIONS=true
 * - rebuild or restart the app
 *
 * Today this switch controls trusted Family Graph mutations for Person,
 * relationships, Person Timeline and Person Album attachment. Read-side
 * realtime continues to use Firestore directly in both modes.
 */
export const FEATURE_FLAGS = {
  USE_CLOUD_FUNCTIONS: false,
} as const;

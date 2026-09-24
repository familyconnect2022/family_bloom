import axios from "axios";
import { getApp } from "@react-native-firebase/app";
import { getAuth } from "@react-native-firebase/auth";
import { AppError, type AppErrorCode } from "../../types/errors";

const REGION = "asia-southeast1";

const mutationUrl = () => {
  const projectId = getApp().options.projectId;
  if (!projectId) throw new AppError("UNKNOWN", "SYSTEM", "Thiếu Firebase projectId");
  return `https://${REGION}-${projectId}.cloudfunctions.net/familyGraphMutation`;
};

const GRAPH_ERROR_CODES = new Set<AppErrorCode>([
  "GRAPH_PERMISSION_DENIED",
  "GRAPH_FAMILY_MISMATCH",
  "GRAPH_BACKEND_UNAVAILABLE",
  "PERSON_NOT_FOUND",
  "PERSON_INVALID_DATA",
  "PERSON_ALREADY_LINKED",
  "PERSON_HAS_RELATIONSHIPS",
  "LINKED_UID_NOT_MEMBER",
  "UID_ALREADY_LINKED",
  "RELATIONSHIP_NOT_FOUND",
  "RELATIONSHIP_INVALID",
  "RELATIONSHIP_DUPLICATE",
  "RELATIONSHIP_SELF_REFERENCE",
  "RELATIONSHIP_PARENT_CYCLE",
]);

const toGraphAppError = (error: unknown): never => {
  if (error instanceof AppError) throw error;
  if (axios.isAxiosError(error)) {
    if (!error.response || error.response.status === 404) {
      throw new AppError("GRAPH_BACKEND_UNAVAILABLE", "GRAPH", undefined, { cause: error, retryable: true });
    }
    const rawCode = String(error.response?.data?.code ?? "").trim().toUpperCase() as AppErrorCode;
    if (GRAPH_ERROR_CODES.has(rawCode)) {
      const category = rawCode.startsWith("RELATIONSHIP_") ? "RELATIONSHIP"
        : rawCode.startsWith("PERSON_") || rawCode.startsWith("LINKED_UID_") || rawCode.startsWith("UID_ALREADY_") ? "PERSON"
        : "GRAPH";
      throw new AppError(rawCode, category, undefined, { cause: error });
    }
  }
  throw error;
};

export const postFamilyGraphMutation = async <T>(
  familyId: string,
  action: string,
  payload: Record<string, unknown>,
): Promise<T> => {
  const user = getAuth().currentUser;
  if (!user) throw new AppError("GRAPH_PERMISSION_DENIED", "GRAPH");
  const token = await user.getIdToken();
  try {
    const response = await axios.post(
      mutationUrl(),
      { action, familyId, payload },
      {
        timeout: 30000,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );
    if (!response.data?.ok) throw Object.assign(new Error("Graph mutation failed"), { response });
    return response.data.result as T;
  } catch (error) {
    return toGraphAppError(error);
  }
};

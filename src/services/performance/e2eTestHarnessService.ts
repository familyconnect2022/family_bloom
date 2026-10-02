import { collection, deleteDoc, doc, getDoc, getDocs, getFirestore } from "@react-native-firebase/firestore";
import { getAuth } from "@react-native-firebase/auth";
import { FIRESTORE_PATHS } from "../firebase/firestorePaths";
import { familyService } from "../family/familyService";
import { eventService } from "../event/eventService";
import { momentsService } from "../moments/momentsService";
import { activityService } from "../activity/activityService";
import { localNotificationService } from "../push/localNotificationService";
import { INTERNAL_TOOLS_ENABLED } from "../../constants/buildMode";

// Keep the E2E safety configuration colocated with the harness so Metro cannot
// fail because a DEV-only constants module was omitted by a patch/full-code copy.
// This does not bypass Auth or Firestore Rules.
const E2E_TEST_HARNESS = {
  enabled: INTERNAL_TOOLS_ENABLED,
  familyNamePrefix: "Bloom E2E",
  documentTitlePrefix: "[BLOOM-E2E]",
  cleanupAfterRun: true,
} as const;

const isE2ETestHarnessAvailable = () => E2E_TEST_HARNESS.enabled && INTERNAL_TOOLS_ENABLED;

export type E2ETestRun = {
  testRunId: string;
  startedAt: string;
  mode: "dry-run" | "firebase";
  status: "ready" | "blocked";
  reason?: string;
};

export type E2EStepStatus = "PASS" | "FAIL" | "SKIP";
export type E2EStep = { name: string; status: E2EStepStatus; detail: string; durationMs: number };
export type E2EFirebaseReport = {
  testRunId: string;
  familyId: string;
  familyName: string;
  startedAt: string;
  finishedAt: string;
  overall: "PASS" | "FAIL";
  steps: E2EStep[];
};

const createRunId = () => `bloom-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const errorText = (error: unknown) => error instanceof Error ? error.message : String(error);

const runStep = async (steps: E2EStep[], name: string, work: () => Promise<string>) => {
  const started = Date.now();
  try {
    const detail = await work();
    steps.push({ name, status: "PASS", detail, durationMs: Date.now() - started });
    return true;
  } catch (error) {
    steps.push({ name, status: "FAIL", detail: errorText(error), durationMs: Date.now() - started });
    return false;
  }
};

const assertDev = () => {
  if (!isE2ETestHarnessAvailable()) throw new Error("E2E_HARNESS_DISABLED");
};

/**
 * Phase 11.2B internal E2E runner.
 * It NEVER bypasses Auth or Firestore Rules. It discovers/creates a normal family
 * owned by the signed-in performance-test account, and refuses any family whose
 * name does not begin with the Bloom E2E prefix.
 */
export const e2eTestHarnessService = {
  prepareDryRun(): E2ETestRun {
    if (!isE2ETestHarnessAvailable()) {
      return { testRunId: createRunId(), startedAt: new Date().toISOString(), mode: "dry-run", status: "blocked", reason: "E2E harness chỉ có trong development build." };
    }
    return { testRunId: createRunId(), startedAt: new Date().toISOString(), mode: "dry-run", status: "ready" };
  },

  assertSafeFirebaseTarget(familyName: string) {
    assertDev();
    if (!familyName.trim().startsWith(E2E_TEST_HARNESS.familyNamePrefix)) throw new Error("E2E_REAL_FAMILY_BLOCKED");
    return true;
  },

  makeTitle(kind: "EVENT" | "MOMENT", testRunId: string) {
    return `${E2E_TEST_HARNESS.documentTitlePrefix} ${kind} ${testRunId}`;
  },

  async getOrCreateTestFamily(): Promise<{ familyId: string; familyName: string }> {
    assertDev();
    const uid = getAuth().currentUser?.uid;
    if (!uid) throw new Error("E2E_AUTH_REQUIRED");
    const db = getFirestore();
    const memberships = await getDocs(collection(db, `users/${uid}/memberships`));
    for (const membership of memberships.docs) {
      const data = membership.data() as { familyName?: unknown };
      const familyName = typeof data.familyName === "string" ? data.familyName.trim() : "";
      if (!familyName.startsWith(E2E_TEST_HARNESS.familyNamePrefix)) continue;
      const family = await familyService.getFamily(membership.id);
      if (family?.name?.startsWith(E2E_TEST_HARNESS.familyNamePrefix)) {
        return { familyId: membership.id, familyName: family.name };
      }
    }
    const created = await familyService.createFamilyForUser(uid, `${E2E_TEST_HARNESS.familyNamePrefix} · Internal`, { activateAfterCreate: false });
    this.assertSafeFirebaseTarget(created.familyName);
    return { familyId: created.familyId, familyName: created.familyName };
  },

  async createDeliveryProbe(): Promise<{ testRunId: string; familyId: string; familyName: string; eventId: string; seconds: number; title: string; deliverAtISO: string; identifier: string }> {
    assertDev();
    const currentUser = getAuth().currentUser;
    if (!currentUser?.uid) throw new Error("E2E_AUTH_REQUIRED");
    const testRunId = createRunId();
    const target = await this.getOrCreateTestFamily();
    this.assertSafeFirebaseTarget(target.familyName);
    const title = this.makeTitle("EVENT", testRunId);
    const date = new Date(Date.now() + 60_000);
    const created = await eventService.create(target.familyId, {
      title, dateISO: date.toISOString(), allDay: false, eventType: "family",
      notificationLevel: "notable", participantsMode: "all", participantIds: [], personIds: [],
      recurrence: "none", description: `Delivery probe ${testRunId}`, location: null, attachments: [],
      attachmentPublicIds: [], coverAttachmentId: null, createdByUid: currentUser.uid,
    });
    const scheduled = await localNotificationService.scheduleE2EEventProbe({ familyId: target.familyId, eventId: created.id, title, seconds: 60 });
    if (!scheduled.permissionGranted || !scheduled.identifier) {
      await eventService.delete(target.familyId, created.id).catch(() => undefined);
      throw new Error("E2E_NOTIFICATION_PERMISSION_REQUIRED");
    }
    if (!scheduled.verified || !scheduled.deliverAtISO) {
      await eventService.delete(target.familyId, created.id).catch(() => undefined);
      throw new Error("E2E_ANDROID_SCHEDULE_NOT_CONFIRMED");
    }
    return {
      testRunId,
      familyId: target.familyId,
      familyName: target.familyName,
      eventId: created.id,
      seconds: scheduled.seconds,
      title,
      deliverAtISO: scheduled.deliverAtISO,
      identifier: scheduled.identifier,
    };
  },

  async runFirebaseSmoke(): Promise<E2EFirebaseReport> {
    assertDev();
    const currentUser = getAuth().currentUser;
    if (!currentUser?.uid) throw new Error("E2E_AUTH_REQUIRED");
    const testRunId = createRunId();
    const startedAt = new Date().toISOString();
    const steps: E2EStep[] = [];
    let eventId: string | null = null;
    let momentId: string | null = null;
    let target = { familyId: "", familyName: "" };
    let eventActivityId: string | null = null;
    let momentActivityId: string | null = null;

    const familyReady = await runStep(steps, "Test Family safety", async () => {
      target = await this.getOrCreateTestFamily();
      this.assertSafeFirebaseTarget(target.familyName);
      const member = await getDoc(doc(getFirestore(), FIRESTORE_PATHS.familyMember(target.familyId, currentUser.uid)));
      if (!member.exists()) throw new Error("E2E_TEST_ACCOUNT_NOT_MEMBER");
      return `${target.familyName} · ${target.familyId}`;
    });

    if (familyReady) {
      await runStep(steps, "Event write/read", async () => {
        const date = new Date(Date.now() + 10 * 60_000);
        const created = await eventService.create(target.familyId, {
          title: this.makeTitle("EVENT", testRunId),
          dateISO: date.toISOString(),
          allDay: false,
          eventType: "family",
          notificationLevel: "normal",
          participantsMode: "all",
          participantIds: [],
          personIds: [],
          recurrence: "none",
          description: `Automated E2E ${testRunId}`,
          location: null,
          attachments: [],
          attachmentPublicIds: [],
          coverAttachmentId: null,
          createdByUid: currentUser.uid,
        });
        eventId = created.id;
        const readBack = await eventService.getById(target.familyId, created.id);
        if (!readBack || readBack.title !== created.title) throw new Error("E2E_EVENT_READBACK_MISMATCH");
        return `created/read ${created.id}`;
      });

      await runStep(steps, "Moment write/read", async () => {
        const created = await momentsService.create(
          target.familyId,
          { uid: currentUser.uid, displayName: currentUser.displayName || "Bloom E2E" },
          // Keep badge off for sender-only smoke. Receiver/badge verification is a separate two-account stage.
          { caption: this.makeTitle("MOMENT", testRunId), media: [], personIds: [], timelineAudience: "family", notifyFamily: false },
        );
        momentId = created.id;
        const snap = await getDoc(doc(getFirestore(), FIRESTORE_PATHS.moment(target.familyId, created.id)));
        if (!snap.exists() || String(snap.data()?.caption ?? "") !== created.caption) throw new Error("E2E_MOMENT_READBACK_MISMATCH");
        return `created/read ${created.id}`;
      });

      await runStep(steps, "Activity Center projection", async () => {
        if (!eventId || !momentId) throw new Error("E2E_SOURCE_IDS_MISSING");
        const event = await eventService.getById(target.familyId, eventId);
        const momentSnap = await getDoc(doc(getFirestore(), FIRESTORE_PATHS.moment(target.familyId, momentId)));
        if (!event || !momentSnap.exists()) throw new Error("E2E_ACTIVITY_SOURCE_MISSING");
        const moment = { ...(momentSnap.data() as Record<string, unknown>), id: momentId, familyId: target.familyId } as never;
        await activityService.createForEvent(event, currentUser.displayName || "Bloom E2E");
        await activityService.createForMoment(moment);
        eventActivityId = `event-${eventId}-family`;
        momentActivityId = `moment-${momentId}-family`;
        const page = await activityService.listForUser(target.familyId, currentUser.uid, 100);
        const eventActivity = page.items.find((item) => item.id === eventActivityId);
        const momentActivity = page.items.find((item) => item.id === momentActivityId);
        if (!eventActivity || !momentActivity) throw new Error("E2E_ACTIVITY_PROJECTION_MISSING");
        return `event + moment visible in Activity Center`;
      });

      await runStep(steps, "Deep-link contract", async () => {
        const page = await activityService.listForUser(target.familyId, currentUser.uid, 100);
        const eventActivity = page.items.find((item) => item.id === eventActivityId);
        const momentActivity = page.items.find((item) => item.id === momentActivityId);
        if (!eventActivity || !momentActivity) throw new Error("E2E_ACTIVITY_FOR_ROUTE_MISSING");
        const eventRoute = activityService.routeFor(eventActivity);
        const momentRoute = activityService.routeFor(momentActivity);
        if (eventRoute !== `/event/${eventId}`) throw new Error(`E2E_EVENT_ROUTE_MISMATCH:${eventRoute}`);
        if (!momentRoute?.includes(String(momentId))) throw new Error(`E2E_MOMENT_ROUTE_MISMATCH:${momentRoute}`);
        return `${eventRoute} · ${momentRoute}`;
      });
    }

    if (E2E_TEST_HARNESS.cleanupAfterRun && target.familyId) {
      await runStep(steps, "Cleanup", async () => {
        const errors: string[] = [];
        if (momentActivityId) try { await deleteDoc(doc(getFirestore(), FIRESTORE_PATHS.familyActivity(target.familyId, momentActivityId))); } catch (error) { errors.push(`moment activity: ${errorText(error)}`); }
        if (eventActivityId) try { await deleteDoc(doc(getFirestore(), FIRESTORE_PATHS.familyActivity(target.familyId, eventActivityId))); } catch (error) { errors.push(`event activity: ${errorText(error)}`); }
        if (momentId) try { await momentsService.delete(target.familyId, momentId); } catch (error) { errors.push(`moment: ${errorText(error)}`); }
        if (eventId) try { await eventService.delete(target.familyId, eventId); } catch (error) { errors.push(`event: ${errorText(error)}`); }
        if (errors.length) throw new Error(errors.join(" · "));
        return `removed ${[eventId, momentId, eventActivityId, momentActivityId].filter(Boolean).length} test documents`;
      });
    }

    steps.push({
      name: "Receiver badge / delivered notification",
      status: "SKIP",
      detail: "Cần test account thứ hai + thiết bị nhận. Sender harness không giả PASS cho delivery/badge từ người khác.",
      durationMs: 0,
    });

    return {
      testRunId,
      familyId: target.familyId,
      familyName: target.familyName,
      startedAt,
      finishedAt: new Date().toISOString(),
      overall: steps.some((step) => step.status === "FAIL") ? "FAIL" : "PASS",
      steps,
    };
  },

  exportText(report: E2EFirebaseReport) {
    return [
      `Family Bloom Phase 11.2B Firebase E2E · ${report.overall}`,
      `run=${report.testRunId}`,
      `family=${report.familyName} (${report.familyId})`,
      ...report.steps.map((step) => `${step.status} · ${step.name} · ${step.durationMs}ms · ${step.detail}`),
    ].join("\n");
  },
};

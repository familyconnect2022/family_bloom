# Family Bloom — Multi-Family Data Architecture

## Core decision
A person is a global user. A person can belong to Family A, Family B, Family C, etc. The app has a current/active family context, but that context is only a UI/data-loading preference and never an authorization mechanism.

## Recommended Firestore model

```text
users/{uid}
  global profile
  activeFamilyId   // last selected family; UX preference only

users/{uid}/memberships/{familyId}
  familyId
  familyName       // denormalized display value
  role
  joinedAt

families/{familyId}
  name
  ownerId
  createdAt
  updatedAt

families/{familyId}/members/{uid}
  uid
  displayName      // denormalized display value
  role              // authoritative family role
  joinedAt

families/{familyId}/moments/{momentId}
families/{familyId}/albums/{albumId}
families/{familyId}/events/{eventId}
families/{familyId}/relationships/{relationshipId}
families/{familyId}/conversations/{conversationId}
```

## Why two membership documents?

`families/{familyId}/members/{uid}` is the family-centric, authoritative membership record used by Firestore Rules.

`users/{uid}/memberships/{familyId}` is a user-centric reverse index optimized for listing all families for a user and switching between them quickly.

When a membership is created/removed, both sides must be changed atomically in a batch/transaction or by trusted backend code.

## Active family

`users/{uid}.activeFamilyId` stores the last selected family. It should be loaded at startup and used to initialize the FamilyContext/active-family store.

It must NEVER be used in security rules as proof that the user belongs to the family. Rules must check the family membership document.

## Switching family

```text
App starts
  ↓
load global profile
  ↓
load users/{uid}/memberships
  ↓
choose activeFamilyId (saved preference, otherwise first membership)
  ↓
FamilyContext.activeFamilyId
  ↓
family-scoped services query families/{activeFamilyId}/...
```

Switching only changes the active context:

```text
Family A → Family B
          ↓
verify users/{uid}/memberships/{familyB}
          ↓
update users/{uid}.activeFamilyId = familyB
          ↓
reload family-scoped data
```

## Joining another family

Do NOT let a client create an arbitrary membership just by knowing a familyId. A future invite/join flow should use a server-controlled invitation/token and atomically create both membership records after validation.

## Important product implication

Global profile fields belong to the user. Family-specific fields should not be placed in `users/{uid}`. If a future feature needs different names/roles/relationship metadata per family, put those fields in the family membership document.

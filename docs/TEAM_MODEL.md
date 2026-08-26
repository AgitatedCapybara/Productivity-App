# Team Creator ↔ Team Member Asymmetric Monetization Model

This document specifies the billing asymmetry design for Keystone Teams. It ensures bottom-up workspace expansion remains frictionless by keeping collaborating viewers and contributors free, charging only the professional team creator or space orchestrator.

---

## 1. Asymmetric Model Overview
Similar to **Coda's** doc-maker model, Keystone ensures team collaborations grow organically without high pre-seat entry friction:

- **Team Creator ($/month)**:
  - Pays for the licensing of shared team workspaces.
  - Can create and host shared team projects, configure the shared end-to-end (E2E) synchronization target (such as WebDAV, private AWS S3 buckets, or private databases), and assign tasks to peer nodes.
  - Controls access controls, invite links, and administrative parameters.

- **Team Member (Free)**:
  - Invited to join shared team workspaces completely free.
  - Can view, edit, check off, and comment on tasks within any shared channel or board.
  - Enjoys Pro-editor speed (advanced hotkeys, basic boards, local notes) inside the creator's shared enclave without billing constraints.
  - No prompt screens forcing other colleagues to enter credit cards to simply check off tasks.

---

## 2. Synchronization Layout
Collaborative syncing bypasses standard centralized servers to maximize security compliance:

```
  ┌────────────────────────────────────────────────────────┐
  │                   PRO TEAM CREATOR                     │
  │  - Purchases Team workspace license                    │
  │  - Provisions Private E2E Sync Target (WebDAV/S3 Bucket)│
  └───────────────────────────┬────────────────────────────┘
                              │ Writes / Reads Encrypted
                              ▼
                ┌───────────────────────────┐
                │ Private Sync Bucket (E2E) │
                │ (AES-256 Symmetric Key)   │
                └─────────────┬─────────────┘
                              ▲
                              │ Writes / Reads Encrypted
  ┌───────────────────────────┴────────────────────────────┐
  │                 INVITED TEAM MEMBERS                  │
  │  - Joins shared spaces via Creator invite keys         │
  │  - Synchronizes to Creator's Sync Target free         │
  └────────────────────────────────────────────────────────┘
```

---

## 3. Scaffolding & Data Model Representation
The standard database migrations support the following team references:
- **`license.tier`** supports both `team_creator` and `team_member`.
- Security signatures confirm that shared channels and syncing nodes correlate to an authenticated creator certificate.
- Invited team members possess a signed `team_member` license token supplied in the workspace invitation link. This token allows local client instances to authenticate read/write pathways inside target shared synchronization files without requiring credit cards.

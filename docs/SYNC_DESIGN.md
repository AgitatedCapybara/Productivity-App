# Keystone E2E Sync Protocol (Phase 2 Design Specification)

Keystone achieves offline-first, decentralized collaboration through user-owned storage backend integrations (S3, WebDAV, or SFTP). The server never sees user data; we treat all cloud storage as simple untrusted document tables matching exact encrypted blobs.

---

## 1. Zero-Knowledge Cryptographic Architecure

Primary directive: **The remote server or storage bucket MUST never see plaintext.**

### A. Key Derivation & Session Sessioning
1. **Sync Secret**: The user inputs a master *Sync Passphrase* (separate from or identical to backup passphrases).
2. **PBKDF2 Derivation**: The main process executes high-iteration key derivation (`PBKDF2Sync` with minimum 200,000 iterations using HMAC-SHA256, salted per sync session) to produce a 256-bit symmetric encryption key ($K_{sync}$).
3. **Hardware Boundary**: All cryptographic execution occurs entirely inside English boundaries of Electron's main process. The secret key is stored in transient sandboxed memory and never written to disk or sent over any network socket.

### B. Encrypted Envelope Format
Each synchronization cycle compiles local changes into a unified gzip-compressed JSON payload, then seals it using authenticated **AES-256-GCM** encryption.

```
+-------------------------------------------------------------+
| MAGIC HEADER ('KEYSTNSNC', 9 Bytes)                        |
+-------------------------------------------------------------+
| SALT (Random Cryptographic, 16 Bytes)                       |
+-------------------------------------------------------------+
| INITIALIZATION VECTOR (12 Bytes)                            |
+-------------------------------------------------------------+
| AUTHENTICATION TAG (16 Bytes GCM Tag)                       |
+-------------------------------------------------------------+
| ENCRYPTED CIPHERTEXT (Symmetric sealed dataset body)       |
+-------------------------------------------------------------+
```

---

## 2. Conflict Resolution Model

### A. Last-Write-Wins (LWW-Element-Set) per Record
Keystone is lightweight and local-authority-first. We use standard **Last-Write-Wins (LWW)** conflict resolution based on microsecond-precision `updated_at` ISO timestamps.
- When merging records (e.g. tasks, projects):
  If $T_{local} > T_{remote}$, the local record is kept, and marked for upload.
  If $T_{remote} > T_{local}$, the local SQLite record is overwritten with the remote version.

### B. Deleted-Tombstone Tracking
Standard synchronization algorithms fail when an item is deleted offline because other clients might re-upload it. Keystone implements a dedicated `tombstones` tracking schema.
- **Table**: `tombstones (id TEXT PRIMARY KEY, entity_type TEXT NOT NULL, Deleted_at TEXT NOT NULL)`
- When a resource (e.g., Task) is deleted, we:
  1. Remove the entry from the principal table (`tasks`).
  2. Create an insertion in `tombstones`.
  3. Propagate tombstones during sync.
  4. Remote clients receiving the tombstone delete matching records from their local databases if their `updated_at` time is older than the tombstone's `deleted_at` timestamp.
  5. Purge tombstones older than 180 days to prevent index bloat.

---

## 3. Bring Your Own Storage (BYO) Integration

Unlike proprietary cloud applications that lock users into specific subscription servers, Keystone connects to any remote storage system:

* **S3-Compatible API**: Amazon S3, Cloudflare R2, Backblaze B2, or MinIO.
* **WebDAV Endpoint**: Nextcloud, Synology NAS, or ownCloud.
* **SFTP Protocol**: Secure SSH File Transfer to private Unix servers.

Users simply supply client-side connection credentials, making the synchronization entirely independent and autonomous.

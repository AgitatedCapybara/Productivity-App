# Keystone Privacy Promise & Data Sovereignty Manual

Keystone is built upon the fundamental principle that **you own your data**. In an era dominated by intrusive telemetry and locked cloud repositories, Keystone stands as a decentralized fortress for your personal productivity.

---

## The Five Keystone Privacy Promises

### 1. Zero Cloud Databases by Default
Every task, project, habit completion log, focus session, and written note is stored entirely on your local machine. We do not provision user servers, we do not host personal data in remote backends, and we have zero visibility into your workspaces.

### 2. Complete Telemetry Exclusion
We believe in zero-friction offline execution:
* There are no embedded tracking SDKs, no amplitude logs, and no analytics pings.
* Keystone makes **zero network requests** during regular operation.

### 3. Absolute Account Sovereignty
You do not need to register an email, configure passwords, or pass through third-party OAuth flows just to organize your life. Launch Keystone, and start typing. There are no registration forms, no paywalls blocking local access, and no premium restrictions on your local files.

### 4. Democratic and Open Storage Specs
Keystone stores data in a readable, standard **SQLite 3** format with Write-Ahead Logging (WAL) enabled for maximum stability. You can open, query, edit, or copy your database directly using any open-source tool (like DB Browser for SQLite). 
* We provide instant **JSON exports** in the settings panel so you never face vendor lock-in.

### 5. Client-Side Encrypted Sync (BYO Cloud)
Synchronization is entirely optional and user-controlled:
* You bring your own storage target (S3 bucket, SFTP, WebDAV).
* Before leaving your machine, all resources are sealed inside an audited **AES-256-GCM** envelope derived from your personal sync passphrase. We cannot read, decrypt, or process your files even if we wanted to.

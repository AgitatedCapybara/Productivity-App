# Keystone Licensing Backend Contract Specification

This document details the backend server endpoints and payload signatures designed for offline/air-gapped and online cryptographic license validation. It defines how standard activation keys verify seat assignments and generate signed tokens.

## Architected Core Values
1. **Offline first**: Validation execution is completely local. An internet connection is never mandatory for daily application execution.
2. **Device Encapsulation**: Seats are securely bound to the hardware signature of the client machines without collecting or leaking private user telemetry.

---

## Cryptographic Key System (Ed25519)
The licensing backend and local desktop client communicate via signed **JSON Web Tokens (JWT)** generated with standard asymmetric Ed25519 digital signatures.

### Bundled Client Public Key:
```
-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAt1+Yd4EisMvY3WvFkM/g9H7T6kO23+7u8LAnfG1fB5w=
-----END PUBLIC KEY-----
```

---

## Licensing Server Api Contracts

### 1. Activating a Seat
Used to bind a public license activation key to a specific device.

- **Endpoint**: `POST /api/v1/license/activate`
- **Request Headers**: `Content-Type: application/json`
- **Payload**:
  ```json
  {
    "key": "KEY-XXXX-YYYY-ZZZZ",
    "machine_hash": "70f1a9dbfa32a0b1bc89a771"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "license_token": "eyJhbGciOiJFZDI1NTE5IiwidHlwIjoiSldUIn0.eyJ0aWVyIjoicHJvIiwiZXhwaXJlc19hdCI6IjIwMjgtMTItMzFUMjM6NTk6NTkuOTk5WiIsIm1hY2hpbmVfaGFzaCI6IjcwZjFhOWRiZmEzMmEwYjliYzg5YTc3MSIsInRyaWFsIjpmYWxzZX0.sig_bytes_in_base64url",
    "tier": "pro",
    "expires_at": "2028-12-31T23:59:59.999Z"
  }
  ```

---

### 2. Deactivating a Seat (Seat Freeing)
Frees up an active seat so the license key can be registers on a secondary laptop, adhering to ethical device usage policies.

- **Endpoint**: `POST /api/v1/license/deactivate`
- **Request Headers**: `Content-Type: application/json`
- **Payload**:
  ```json
  {
    "key": "KEY-XXXX-YYYY-ZZZZ",
    "machine_hash": "70f1a9dbfa32a0b1bc89a771"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Seat successfully disassociated. Slot is now free."
  }
  ```

---

### 3. Verification & Refresh Check
Determines if an existing license has been renewed or updated on the billing portal.

- **Endpoint**: `POST /api/v1/license/refresh`
- **Request Headers**: `Content-Type: application/json`
- **Payload**:
  ```json
  {
    "license_token": "eyJhbGciOiJFZDI1NTE5IiwidHlwIjoiSldUIiw..."
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "license_token": "new.updated.token_here",
    "expires_at": "2029-12-31T23:59:59.999Z"
  }
  ```

---

## Client Token Validation Sequence
When the Desktop main process parses an activation key:
1. It parses the key structure as a JWT: `header.payload.signature`
2. It checks if `machine_hash` matches the local machine fingerprint of the device database settings.
3. It performs cryptographic Ed25519 signature checks locally using the bundled public key and `crypto.verify(null, data, PEM_PUBLIC_KEY, signature)`.
4. If signature, machine hash, and date verify correctly, the app writes state rows into the local `license` database table, granting specialized Pro capabilities.
5. In case of expiration, the app honors a **30-day offline grace period** before reverting gracefully to the Free tier, preserving all local documents and databases.

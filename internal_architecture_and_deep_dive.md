# UGPMS — Internal Architecture & Developer Deep Dive

This developer guide is designed for **your eyes only**. It breaks down the complete inner workings of the **SGSITS Visitor Entry-Exit System**, detailing how each component was designed, how data flows, and why certain architectural decisions were made.

---

## 1. End-to-End Data Flow

To understand the system, trace what happens when a user performs an action (e.g., a Guard scans a pass):

```
[Web Browser (GateTerminalPage)]
       │
       ▼ (1. Triggers API Request via Axios client)
[Axios Network Client (api.ts)]
       │   - Automatically attaches bearer access token
       │   - Catches 401 errors to rotate tokens
       ▼
[Nginx Gateway / Load Balancer] (Directs /api/v1 calls to Express)
       │
       ▼
[Express Server (app.ts & server.ts)]
       │
       ▼ (2. Passes through Global Middleware Guards)
   [Rate Limiter] (Protects route against spam in Redis)
   [authenticateJWT] (Checks if access token is valid and parses user role)
   [RBAC Guard] (Verifies if parsed user role is allowed to hit this route)
   [validateDto] (Ensures the request payload matches the exact Zod Schema)
       │
       ▼ (3. Route controller execution)
[Route Controller (pass.controller.ts)]
       │
       ▼ (4. Business Logic execution)
[Pass Service (pass.service.ts)]
       │   - Fetches DB record via Prisma
       │   - Validates business constraints (e.g., is the pass currently active?)
       │   - Computes state updates
       │
       ├─► [Prisma Client ORM] ──► [PostgreSQL] (Writes updates, updates logs)
       ├─► [Redis Client] ───────► (Increments counters, clears cached records)
       └─► [Socket.io Server] ───► (Broadcasts 'pass:checked-in' alert to Warden/Admins)
```

---

## 2. Deep Dive: Core System Mechanics

### 🔑 A. Authentication & Session Security
The application uses a **Dual-Token JWT (JSON Web Token) architecture** coupled with **HttpOnly cookies** to achieve both security and a seamless user experience.

1. **The Tokens**:
   * **Access Token**: A short-lived token (15-minute expiry) containing the user's ID, email, and role. It is sent as a header: `Authorization: Bearer <token>`. The frontend stores it in memory.
   * **Refresh Token**: A long-lived token (7-day expiry) stored inside a secure database record on PostgreSQL. It is set by the backend as an **HttpOnly cookie** (which means client-side JavaScript cannot read or steal it, preventing Cross-Site Scripting (XSS) token theft).
2. **Token Rotation Flow**:
   * When the 15-minute access token expires, the browser receives a `401 Unauthorized` response.
   * Our Axios interceptor in [api.ts](file:///f:/University%20Gate%20Pass%20Management%20System/frontend/src/services/api.ts) intercepts this 401, pauses all outgoing requests, and calls the `/auth/refresh` endpoint in the background.
   * The backend reads the secure refresh token cookie. If valid, it revokes the old token, issues a **new Access Token** and a **rotated Refresh Token**, and returns them.
   * Axios updates the authorization header and retries the original request, so the user never notices they logged out.
3. **MFA / TOTP Security**:
   * When users enable Multi-Factor Authentication, the server generates a secret key, encrypts it using `AES-256-CBC` (using the server's private `JWT_ACCESS_SECRET` key), and stores it.
   * During login, the code decrypts the secret, verifies the 6-digit Time-Based One-Time Password (TOTP) token using `otplib` algorithms, and only issues access tokens if the code matches.

---

### 🛡️ B. Security Guard Verification & QR Cryptography
We do not store raw pass details or database IDs in the QR code. If we did, a visitor could easily edit the URL parameters to forge an approval. 

1. **QR Token Generation**:
   * When a pass is approved, the backend generates a secure token using a compound key:
     ```text
     passId + validTo + isMultiEntry
     ```
   * This string is encrypted using **`AES-256-CBC`** (Advanced Encryption Standard with a 32-character private key) to obscure the data.
   * To prevent tampering, the server generates an **`HMAC-SHA256`** signature (Hash-based Message Authentication Code) of the encrypted payload and appends it to the token.
2. **Scan Verification Flow**:
   * The QR code displays a link: `https://<domain>/terminal?token=<encrypted_token_value>`.
   * When scanned (e.g. by Google Lens or camera), the browser opens the guard terminal.
   * The terminal immediately reads the `token` parameter, sends it to the `/passes/verify` backend endpoint.
   * The backend:
     1. Recalculates the HMAC signature and compares it. If they don't match, it throws `Tampered QR Code`.
     2. Decrypts the payload using the private AES key.
     3. Checks database records to ensure the pass is `APPROVED`, is within its `validFrom` and `validTo` time window, and is not already checked-out.
     4. Logs the entry/exit instantly.

---

### 🔄 C. Real-Time Broadcaster & WebSocket Engine
Websockets are kept open between the client and server. Unlike HTTP requests which close immediately after a response, WebSockets remain open, allowing the server to push data instantly.

1. **Rooms**:
   * When a client logs in, their socket joins specific "Rooms" based on their role and user ID:
     * Guards join `role:SECURITY_GUARD`
     * Wardens join `role:HOSTEL_WARDEN`
2. **Broadcast Adapter**:
   * The socket server is linked to a **Redis Adapter**. If you run multiple server instances to handle a large college load, the servers communicate via Redis. If a guard checks in a hostel student on Server A, Server A writes a message to Redis, and Server B reads it and pushes a notification to the Warden’s browser instantly.

---

### ⏰ D. Background Services (Cron Scheduler)
A background scheduler ([scheduler.ts](file:///f:/University%20Gate%20Pass%20Management%20System/backend/src/jobs/scheduler.ts)) boots up with the backend server and runs recurring cron tasks using `node-cron`:

1. **Auto-Expiration Job** (Runs every 5 minutes):
   * Scans the `passes` table for entries where `status` is `APPROVED` but the current time has passed `validTo`.
   * Automatically transitions their state to `EXPIRED` so they can no longer be used for entry.
2. **Overstay Detection Job** (Runs every 10 minutes):
   * Queries the database for passes that are checked-in (`status` is `ACTIVE`) but the current time has exceeded `validTo` by a configured grace period.
   * Generates a `SECURITY_ALERT` system notification and emits a real-time event to all logged-in security administrators.

---

## 3. Database Schema & Index Optimization

Our relational database runs on **PostgreSQL**. A key feature is our use of database indexes.

### The Role of Indexes
Normally, database queries scan tables row-by-row (a sequential scan, $O(N)$ speed). As the log history grows to $100,000+$ rows, this becomes slow. 
Adding indexes creates a sorted B-Tree directory ($O(\log N)$ speed) for specific columns, letting PostgreSQL locate records instantly.

| Model | Index Field | Optimization Purpose |
| :--- | :--- | :--- |
| `User` | `email`, `universityId` | Speeds up login checks and profile views by email/ID. |
| `Visitor` | `phone`, `idNumber` | Instant validation checks for blacklist status during check-in. |
| `Pass` | `passNumber`, `qrToken` | Guard scan lookup matches the scanned QR string in milliseconds. |
| `Pass` | `validFrom`, `validTo` | Quick cron scans for expired passes. |
| `EntryLog` | `passId`, `gate`, `entryAt` | Optimizes gate traffic reporting charts and dashboard audits. |
| `AuditLog` | `resource`, `resourceId` | Fast loading of administrative audit trail history. |

---

## ⚙️ 4. Environment Variables Reference (.env)

The system relies on configuration keys to run. Here is what they control:

* `PORT`: The port number the Express server listens on (e.g. `5000`).
* `NODE_ENV`: Runs as `development` (adds detailed error logs, enables local mock APIs) or `production` (enforces secure HTTPS cookies and optimized assets).
* `CORS_ORIGIN`: The exact URL of your Vercel frontend. The backend blocks any client browser requests that do not originate from this URL.
* `DATABASE_URL`: The connection string for PostgreSQL (containing credentials, host, port, and database name).
* `REDIS_HOST` & `REDIS_PORT`: Credentials for connecting to the Redis database cache.
* `MINIO_ENDPOINT` & `MINIO_ACCESS_KEY`: Credentials for upload storage.
* `JWT_ACCESS_SECRET`: A secure random string used to sign the short-lived user tokens.
* `JWT_REFRESH_SECRET`: A secure random string used to sign the HttpOnly refresh cookies.
* `QR_AES_KEY`: **Must be exactly 32 characters**. This key encrypts the QR tokens.
* `QR_HMAC_KEY`: A secret signature key used to verify QR codes have not been tampered with.

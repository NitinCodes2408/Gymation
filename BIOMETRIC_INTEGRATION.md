# 🔌 GymTrack AI - Real Biometric Integration Architecture (Step 1 Foundation)

This document specifies the architecture, networking considerations, configuration parameters, and synchronization workflow for integrating the **eSSL / Identix / ZKTeco K20** biometric fingerprint attendance terminal into **GymTrack AI**.

---

## 1. System Architecture Overview

Biometric attendance terminals communicate via proprietary low-level TCP/IP protocols (such as ZK-Protocol on port `4370`) over local area networks (LAN). 

Because GymTrack AI is hosted on **Vercel** (Cloud / Edge / Serverless) and accessed via web browsers, the integration relies on a **Local Biometric Bridge** acting as the secure gateway:

```
┌─────────────────────────────────┐
│     eSSL / Identix K20          │
│   (Fingerprint Attendance)      │
└────────────────┬────────────────┘
                 │
                 │ 1. Local TCP/IP Sockets (Port 4370)
                 ▼
┌─────────────────────────────────┐
│     Local Biometric Bridge      │
│  (Node.js On-Premise Service    │
│   running on Laptop / Gym PC)   │
└────────────────┬────────────────┘
                 │
                 │ 2. Secure HTTPS REST / Webhook with Bridge Secret
                 ▼
┌─────────────────────────────────┐
│   GymTrack AI Backend API       │
│   (Next.js App Router Routes)   │
└────────────────┬────────────────┘
                 │
                 │ 3. Firestore Document Transaction
                 ▼
┌─────────────────────────────────┐
│       Firebase Firestore        │
│   (/gyms/{gymId}/attendance)    │
└────────────────┬────────────────┘
                 │
                 │ 4. Real-time Subscription / State Sync
                 ▼
┌─────────────────────────────────┐
│   GymTrack AI Attendance UI     │
│   (Daily Check-ins & Calendar)  │
└─────────────────────────────────┘
```

---

## 2. Why Vercel Web Browsers Cannot Connect Directly to Local Biometric Terminals

1. **Browser Sandbox Restrictions**: Web browsers executing JavaScript inside a web page (even over HTTPS) cannot establish raw TCP sockets to arbitrary IP addresses due to web security sandboxing.
2. **Private Network Isolation (RFC 1918)**: The biometric terminal resides on a local private subnet (e.g., `192.168.1.201` or `192.168.0.201`). Cloud servers on Vercel cannot route packets to a private IP located behind a local gym router's NAT/firewall without a dedicated on-premise agent.
3. **Hardware Protocol Requirements**: The eSSL K20 hardware communicates using binary TCP/UDP packets (ZKTeco protocol), which requires a native socket environment (Node.js `net` module or specialized SDKs).

---

## 3. Where the Local Biometric Bridge Runs

- **Host Machine**: The bridge runs locally on the gym owner's laptop or reception desktop PC that is physically connected to the eSSL K20 device (via Ethernet LAN cable or local Wi-Fi router).
- **Runtime**: Node.js service located in the [`bridge/`](file:///d:/Gymation/bridge) directory of this repository.
- **Portability**: It can be executed directly with `npm start` in the `bridge/` directory, run in the background as a Windows Service (using NSSM / PM2), or triggered on demand.

---

## 4. Required Environment Variables

All sensitive communication keys, device IP addresses, and bridge credentials must be maintained in environment variables:

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `BIOMETRIC_DEVICE_IP` | String (IPv4) | *None* | Local LAN IP address of the eSSL K20 terminal (e.g. `192.168.1.201`). |
| `BIOMETRIC_DEVICE_PORT` | Number | `4370` | TCP communication port of the biometric terminal. |
| `BIOMETRIC_DEVICE_ID` | Number | `1` | Machine / Terminal ID configured on the device (default is `1`). |
| `BIOMETRIC_DEVICE_SERIAL` | String | *Optional* | Physical serial number found on the device label or device info menu. |
| `BIOMETRIC_COMM_KEY` | Number/String | `0` | Communication password set in the device security settings. |
| `GYMTRACK_BRIDGE_SECRET` | String | *Required* | Shared secret key for authenticating bridge requests to GymTrack AI cloud API. |
| `GYMTRACK_API_URL` | String (URL) | `http://localhost:3000` | Target URL of the GymTrack AI application instance. |
| `GYMTRACK_GYM_ID` | String | *Optional* | Gym identifier to bind incoming biometric check-ins to. |

> [!IMPORTANT]
> Never commit `.env` or `.env.local` files containing real production device credentials to version control.

---

## 5. Information Still Required From the Physical eSSL K20 Terminal

Before executing real-time data synchronization in Step 2, the following exact values must be checked on the physical device:

1. **Assigned IP Address**:
   - On the device screen: Press `M/OK` (Menu) $\rightarrow$ `Comm.` $\rightarrow$ `Ethernet` $\rightarrow$ note the `IP Address` (e.g. `192.168.1.201`).
2. **Subnet Mask & Gateway**:
   - Ensure the laptop's Ethernet adapter has an IP address on the **same subnet** (e.g. laptop IP `192.168.1.100`, subnet mask `255.255.255.0`).
3. **Communication Port**:
   - Verify `Port` (Standard is `4370`).
4. **Device ID / Machine Number**:
   - `Comm.` $\rightarrow$ `Device ID` or `PC Connection` (Typically `1`).
5. **Communication Key (Comm Key)**:
   - `Comm.` $\rightarrow$ `Security` $\rightarrow$ `Comm Key` (Check if set to `0` or if a custom numeric password exists).
6. **User Enrollment ID Scheme**:
   - Determine how member IDs are assigned on the machine (e.g., User ID `1`, `2`, `101`, or numeric component of Member ID `M-1001`).

---

## 6. How Future Transaction Synchronization Will Work (Next Steps)

```
[Member Places Finger on eSSL K20 Terminal]
               │
               ▼
[Device Validates Fingerprint & Stores Check-in Record with Timestamp]
               │
               ▼
[Local Biometric Bridge polls device or listens for realtime events via TCP]
               │
               ▼
[Bridge maps Device User ID (e.g. "101") ──► GymTrack Member ID (e.g. "M-1001")]
               │
               ▼
[Bridge POSTs payload to /api/biometric/sync with GYMTRACK_BRIDGE_SECRET]
               │
               ▼
[GymTrack AI backend validates signature & records Attendance document in Firestore]
               │
               ▼
[Attendance Portal & Dashboard UI automatically update with Real Check-in Time]
```

### Safety & Integrity Controls:
- **Deduplication**: Repeated scans within a configured cooldown window (e.g. 15 minutes) are flagged as duplicate scans rather than multiple entries.
- **Audit Trails**: All raw biometric logs retain the original hardware timestamp and device ID.
- **Offline Resiliency**: If the internet connection is temporarily interrupted, the eSSL K20 internal memory stores up to 100,000 logs, which the local bridge will automatically backfill upon reconnecting.

---

## 7. Testing Device Reachability Now

To run the diagnostic probe from your laptop:

```bash
# 1. Open terminal in the project directory
cd d:/Gymation/bridge

# 2. Run the diagnostic tool
node src/diagnostic.js
# or
npm run test-device
```

The diagnostic tool will report:
- Device IP & Port
- TCP socket handshake status
- Response latency in milliseconds
- Clear error codes (`ETIMEDOUT`, `ECONNREFUSED`, `EHOSTUNREACH`) and actionable troubleshooting steps if connectivity is not yet established.

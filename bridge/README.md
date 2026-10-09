# GymTrack AI - Local Biometric Bridge

This folder contains the **Local Biometric Bridge** for connecting on-premise **eSSL / Identix / ZKTeco K20** biometric attendance terminals to the GymTrack AI gym management platform.

---

## 🚀 Quickstart (Testing Device Reachability)

### Step 1: Configure Environment
Copy `.env.example` to `.env` inside the `bridge/` directory:
```bash
cp .env.example .env
```

Set your device's LAN configuration:
```env
BIOMETRIC_DEVICE_IP=192.168.1.201
BIOMETRIC_DEVICE_PORT=4370
BIOMETRIC_DEVICE_ID=1
BIOMETRIC_COMM_KEY=0
```

### Step 2: Run Diagnostic Probe
Execute the built-in diagnostic test to verify physical Ethernet / LAN connectivity:
```bash
node src/diagnostic.js
# or
npm run test-device
```

---

## 🔍 How to Find eSSL K20 IP & Port on the Device

1. Turn on the eSSL K20 terminal.
2. Press the **M/OK** (Menu) button.
3. Navigate to **Comm.** (Communication) -> **Ethernet**.
4. Check the following:
   - **IP Address**: (e.g. `192.168.1.201` or `192.168.0.201`)
   - **Subnet Mask**: (e.g. `255.255.255.0`)
   - **Gateway**: (e.g. `192.168.1.1`)
   - **Port**: (Default is `4370`)
5. If connecting via direct LAN cable to your laptop:
   - Make sure your laptop's Ethernet adapter has a **static IP on the same subnet** (e.g. `192.168.1.100` with subnet `255.255.255.0`).

---

## 🔒 Security Notice
- Keep all device IPs, communication keys, and bridge secrets in `.env`.
- Never commit `.env` containing real credentials to version control.

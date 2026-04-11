# Tailscale Remote Connection Setup

Connect your laptop (Anban) → Windows machine (OpenClaw) → Office machine

## Quick Setup (5 minutes)

### 1. Your Windows Machine (Office)

OpenClaw is already running. Just note these details:

- **Tailscale IP**: `100.64.173.84`
- **Port**: `18789`
- **Auth Token**: `1454396ef3170429ff6833a412e6a291509e01b44ad087376f263107cb5844ef`

### 2. Your Home Laptop (Anban)

**Option A: Skip Firebase Auth (Recommended for local testing)**

Add to `.env.local`:
```bash
DISABLE_AUTH="true"
NEXT_PUBLIC_DISABLE_AUTH="true"
```

This lets you use Anban without Firebase setup - perfect for local development!

**Option B: Use Firebase Auth**

If you want full authentication, see `.env.example` for Firebase configuration.

**Start the app:**
```bash
npm run dev
```

**Go to**: http://localhost:3000

### 3. Configure Anban Settings

1. **Sign in** with Firebase (email/password or Google)

2. **Create a board**:
   - Click "Create Board"
   - Name it (e.g., "My Tasks")
   - Click "Create"

3. **Configure OpenClaw**:
   - Go to: http://localhost:3000/settings?boardId=<your-board-id>
   - Or click "Settings" from the board page

4. **Fill in OpenClaw Connection**:
   - **Gateway URL**: `http://100.64.173.84:18789`
   - **API Key / Auth Token**: `1454396ef3170429ff6833a412e6a291509e01b44ad087376f263107cb5844ef`
   - **Enable OpenClaw integration**: ✅ checked

5. **Test Connection**:
   - Click "Test Connection"
   - You should see: ✅ "Connection successful!"

6. **Save Settings**:
   - Click "Save Settings"

### 4. Add an Agent

1. Go to: http://localhost:3000/agents
2. Click "Add Agent"
3. Fill in:
   - **Name**: "My Agent" (or any name)
   - **Description**: "Test agent"
   - **OpenClaw Agent ID**: (ask your OpenClaw setup for the agent ID)
4. Click "Save"

### 5. Test It Out

1. Go to your board
2. Click "Add Card" in any column
3. Enter title and description
4. Assign the agent
5. Save

The agent should automatically respond and update the card!

## Troubleshooting

### Connection test fails

1. **Check Tailscale** on both machines:
   ```powershell
   # On Windows (office)
   tailscale status

   # On laptop (home)
   ping 100.64.173.84
   ```

2. **Check firewall** on Windows:
   ```powershell
   # Allow port 18789
   New-NetFirewallRule -DisplayName "OpenClaw" -Direction Inbound -LocalPort 18789 -Protocol TCP -Action Allow
   ```

3. **Test direct access** from laptop:
   ```bash
   curl http://100.64.173.84:18789/health
   ```

### Agent not responding

1. Check agent is enabled in OpenClaw
2. Verify agent ID is correct
3. Check OpenClaw logs on Windows machine

### Real-time updates not working

1. Check browser console for SSE errors
2. Verify you're on the board page (not dashboard)
3. Look for green "Live" indicator

## Network Diagram

```
Home Laptop (Anban)          Tailscale VPN           Windows Office (OpenClaw)
┌─────────────────┐         ┌──────────┐         ┌────────────────────┐
│ Anban @ :3000   │◄────────►│  Tunnel  │◄────────►│ OpenClaw @ :18789  │
│                 │         │          │         │                    │
│ - Firebase Auth │         │ 100.x.x.x│         │ - Agent Gateway    │
│ - Kanban Board │         │          │         │ - Office Machine   │
│ - Settings     │         └──────────┘         └────────────────────┘
└─────────────────┘
```

## Security Notes

✅ **Tailscale provides**:
- End-to-end encryption
- Mutual authentication
- No open ports to internet

⚠️ **Remember**:
- Keep auth tokens secret
- Don't commit `.env.local` to git
- Use HTTPS in production

## Next Steps

1. **Deploy to production**: Use Fly.io for global access
2. **Add Telegram bot**: Mobile notifications (deferred to v2)
3. **Custom agents**: Configure your own OpenClaw agents

---

**Need help?** Check the main README.md or GitHub issues: https://github.com/gibtang/anban

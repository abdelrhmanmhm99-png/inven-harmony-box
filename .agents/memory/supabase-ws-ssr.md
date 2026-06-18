---
name: Supabase WebSocket SSR fix
description: Supabase Realtime needs WebSocket in SSR; Node.js 20 lacks it natively.
---

## Rule
When running TanStack Start (or any SSR framework) on Node.js < 22, the Supabase JS client will throw:
`"Node.js 20 detected without native WebSocket support"` the first time a Supabase client property is accessed server-side (e.g. `supabase.auth.getUser()` in a route `beforeLoad`).

**Why:** `@supabase/realtime-js` detects `globalThis.WebSocket` on first use. Node.js 20 doesn't expose it natively; Node.js 22+ does.

**How to apply:**
1. Install `ws` and `@types/ws` as dependencies.
2. In the SSR server entry file (`src/server.ts`), add before any other logic:
   ```ts
   import { WebSocket as NodeWebSocket } from "ws";
   if (typeof globalThis.WebSocket === "undefined") {
     (globalThis as unknown as Record<string, unknown>).WebSocket = NodeWebSocket;
   }
   ```
This must run before the first Supabase client property access, which is guaranteed by module-level execution order.

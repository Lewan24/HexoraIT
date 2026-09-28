export const DEMO_STORAGE_KEY = "hexorait_demo_state_v1"

export const DEMO_ACCOUNTS = {
  user: {
    email: "demo@hexorait.local",
    password: "DemoUser123!",
    label: "Demo user",
  },
  admin: {
    email: "admin@hexorait.local",
    password: "DemoAdmin123!",
    label: "Demo administrator",
  },
} as const

export function resetDemoData() {
  try {
    localStorage.removeItem(DEMO_STORAGE_KEY)
    localStorage.removeItem("auth_token")
    localStorage.removeItem("current_org_id")
  } catch {
    /* Reload will recreate the demo state when storage is available. */
  }
}

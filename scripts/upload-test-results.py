#!/usr/bin/env python3
"""
Upload Playwright JSON results → Supabase
Appelé après `npx playwright test --reporter=json`
Usage: python3 scripts/upload-test-results.py test-results.json <RUN_ID>
"""
import json, sys, os, re, urllib.request, urllib.error

SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SERVICE_KEY  = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
RUN_ID       = sys.argv[2] if len(sys.argv) > 2 else os.environ.get("TEST_RUN_ID", "")
RESULTS_FILE = sys.argv[1] if len(sys.argv) > 1 else "test-results.json"

if not all([SUPABASE_URL, SERVICE_KEY, RUN_ID]):
    print(f"❌ Missing env: SUPABASE_URL={bool(SUPABASE_URL)}, SERVICE_KEY={bool(SERVICE_KEY)}, RUN_ID={bool(RUN_ID)}")
    sys.exit(1)

def sb(method, table, data=None, params=""):
    url = f"{SUPABASE_URL}/rest/v1/{table}{params}"
    body = json.dumps(data).encode() if data else b""
    req = urllib.request.Request(url, data=body, method=method)
    req.add_header("apikey", SERVICE_KEY)
    req.add_header("Authorization", f"Bearer {SERVICE_KEY}")
    req.add_header("Content-Type", "application/json")
    req.add_header("Prefer", "return=representation")
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read()) if r.read else []
    except urllib.error.HTTPError as e:
        print(f"  ⚠️  {method} {table}: {e.code} {e.read().decode()[:100]}")
        return None

def patch_run(data):
    sb("PATCH", "test_runs", data, f"?id=eq.{RUN_ID}")

def patch_step(step_id, data):
    sb("PATCH", "test_steps", data, f"?id=eq.{step_id}")

# ID mapping — titre exact → test_id
TITLE_TO_ID = {
    "authenticate": "A0",
    "A1: cases page shows candidates": "A1",
    "A2: clicking a candidate loads without 500": "A2",
    "A3: notifications page loads": "A3",
    "A4: rdv booked case has google meet link": "A4",
    "A5: en-attente shows qualification items": "A5",
    "A6: portal for qualification_done loads": "A6",
    "A7: job_submitted case is staffed": "A7",
    "A8: en-attente shows employer or candidate": "A8",
    "A9: portal shows accept/reject": "A9",
    "A10: en-attente shows convention or candidate": "A10",
    "A11: portal for job_retained has upload": "A11",
    "A12: notifications page has content": "A12",
    "A13: convention_signed case billing tab loads without 500": "A13",
    "A14: convention_signed portal loads": "A14",
    "A15: payment_pending portal loads": "A15",
    "A16: clients page loads": "A16",
    "A17: en-attente shows waiting items": "A17",
    "A18: payment_received portal loads": "A18",
    "A19: en-attente shows visa items": "A19",
    "A20: visa agent portal loads": "A20",
    "A21: notifications shows visa_received": "A21",
    "A22: en-attente shows flight items": "A22",
    "A23: visa_received portal loads": "A23",
    "A24: arrival_prep case has qr or location": "A24",
    "A25: arrival portal has checklist": "A25",
    "A26: active case is visible": "A26",
    "A27: alumni page shows julie": "A27",
    "A28: alumni portal loads": "A28",
    "B3: invalid token returns 404": "B3",
    "B4: chloe has job submissions": "B4",
    "B5: nathan visa_received flight pending": "B5",
    "B6: mark resolved reduces items": "B6",
    "B7: click notification navigates to case": "B7",
    "B8: mark all read clears badges": "B8",
    "C1: feed page loads without 500": "C1",
    "C2: cases page has at least 10 candidates": "C2",
    "C3: cases page shows lead and alumni": "C3",
    "C4: en-attente shows intern and school": "C4",
    "C5: notifications page has at least 4 items": "C5",
    "C6: alumni page shows julie": "C6",
    "C7: jobs page has at least 1 job": "C7",
    "C8: contacts page shows marcus": "C8",
    "E1: settings has at least 30 email templates": "E1",
    "E2: agent section has visa_agent_submission": "E2",
    "E3: pre-departure section has all_indonesia": "E3",
    "E4: automations table has toggles": "E4",
}

def get_test_id(title):
    if title in TITLE_TO_ID:
        return TITLE_TO_ID[title]
    m = re.match(r'^([ABCE]\d+):', title)
    return m.group(1) if m else title[:10]

# Charger les résultats
try:
    with open(RESULTS_FILE) as f:
        data = json.load(f)
except FileNotFoundError:
    print(f"❌ {RESULTS_FILE} not found")
    patch_run({"status": "failed"})
    sys.exit(1)

stats = data.get("stats", {})
total   = stats.get("expected", 0)
passed  = stats.get("expected", 0) - stats.get("unexpected", 0) - stats.get("skipped", 0)
failed  = stats.get("unexpected", 0)
skipped = stats.get("skipped", 0)
duration_ms = int(stats.get("duration", 0))
overall_status = "passed" if failed == 0 else "failed"

print(f"📊 Total={total} ✓={passed} ✗={failed} skip={skipped} ({duration_ms}ms) → {overall_status}")

# Récupérer les steps existants en Supabase
existing = sb("GET", "test_steps", params=f"?run_id=eq.{RUN_ID}&select=id,test_id")
step_map = {s["test_id"]: s["id"] for s in (existing or [])}

# Parser chaque test dans le JSON Playwright
def parse_suite(suite, results):
    for spec in suite.get("specs", []):
        for test in spec.get("tests", []):
            title = test.get("title", "")
            test_id = get_test_id(title)
            status_raw = test.get("status", "")
            status = "passed" if status_raw == "expected" else \
                     "failed" if status_raw == "unexpected" else \
                     "skipped"
            duration = sum(r.get("duration", 0) for r in test.get("results", []))
            error_msg = None
            screenshot_url = None

            for r in test.get("results", []):
                if r.get("error"):
                    error_msg = (r["error"].get("message") or "")[:500]
                for att in r.get("attachments", []):
                    if att.get("name") == "screenshot" and att.get("path"):
                        # Pas d'upload depuis ici (pas de fichier local), on note juste le path
                        pass

            results.append({
                "test_id": test_id,
                "title": title,
                "status": status,
                "duration_ms": duration,
                "error_message": error_msg,
            })

    for child in suite.get("suites", []):
        parse_suite(child, results)

all_results = []
for suite in data.get("suites", []):
    parse_suite(suite, all_results)

print(f"🔍 {len(all_results)} tests parsés")

# Mettre à jour chaque step dans Supabase
updated = 0
for r in all_results:
    tid = r["test_id"]
    step_id = step_map.get(tid)
    if not step_id:
        print(f"  ⚠️  Step {tid} pas trouvé en DB, skip")
        continue
    payload = {
        "status": r["status"],
        "duration_ms": r["duration_ms"],
        "finished_at": "now()",
    }
    if r["error_message"]:
        payload["error_message"] = r["error_message"]
    patch_step(step_id, payload)
    icon = "✓" if r["status"] == "passed" else "✗" if r["status"] == "failed" else "—"
    print(f"  {icon} {tid}: {r['title'][:50]} ({r['duration_ms']}ms)")
    updated += 1

# Màj run final
patch_run({
    "status": overall_status,
    "finished_at": "now()",
    "duration_ms": duration_ms,
    "total": total,
    "passed": passed,
    "failed": failed,
    "skipped": skipped,
})

print(f"\n✅ {updated}/{len(all_results)} steps mis à jour → run {overall_status}")

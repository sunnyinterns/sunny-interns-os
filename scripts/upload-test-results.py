from datetime import datetime, timezone
import json, sys, os, re, glob
import urllib.request, urllib.error

SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SERVICE_KEY  = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
RUN_ID       = sys.argv[2] if len(sys.argv) > 2 else os.environ.get("TEST_RUN_ID", "")
RESULTS_FILE = sys.argv[1] if len(sys.argv) > 1 else "test-results.json"

if not all([SUPABASE_URL, SERVICE_KEY, RUN_ID]):
    print(f"Missing: SUPABASE_URL={bool(SUPABASE_URL)} SERVICE_KEY={bool(SERVICE_KEY)} RUN_ID={bool(RUN_ID)}")
    sys.exit(1)

def now():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

def sb_req(method, path, data=None, content_type="application/json"):
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    body = json.dumps(data).encode() if data and content_type == "application/json" else data
    req = urllib.request.Request(url, data=body, method=method)
    req.add_header("apikey", SERVICE_KEY)
    req.add_header("Authorization", f"Bearer {SERVICE_KEY}")
    req.add_header("Content-Type", content_type)
    req.add_header("Prefer", "return=representation")
    try:
        with urllib.request.urlopen(req) as r:
            raw = r.read()
            return json.loads(raw) if raw else []
    except urllib.error.HTTPError as e:
        print(f"  HTTP {e.code}: {e.read().decode()[:200]}")
        return None

def upload_screenshot(png_path, step_id):
    if not os.path.exists(png_path): return None
    try:
        with open(png_path, "rb") as f:
            data = f.read()
        key = f"{RUN_ID}/{step_id}.png"
        req = urllib.request.Request(
            f"{SUPABASE_URL}/storage/v1/object/test-screenshots/{key}",
            data=data, method="POST"
        )
        req.add_header("apikey", SERVICE_KEY)
        req.add_header("Authorization", f"Bearer {SERVICE_KEY}")
        req.add_header("Content-Type", "image/png")
        req.add_header("x-upsert", "true")
        with urllib.request.urlopen(req) as r:
            return f"{SUPABASE_URL}/storage/v1/object/public/test-screenshots/{key}"
    except Exception as e:
        print(f"  Screenshot upload failed: {e}")
        return None

TITLE_TO_ID = {
    "authenticate": "A0", "A0: authenticate": "A0",
    "A1: cases page shows candidates": "A1",
    "A2: clicking a candidate loads without 500": "A2",
    "A3: notifications page loads": "A3",
    "A4: rdv_booked case loads and shows profile": "A4",
    "A5: en-attente page loads with pending items": "A5",
    "A6: qualification_done case portal loads via portal_token": "A6",
    "A7: job_submitted case staffing tab shows job info": "A7",
    "A8: en-attente page loads without error": "A8",
    "A9: job_submitted portal loads": "A9",
    "A10: en-attente page loads without error": "A10",
    "A11: job_retained portal shows upload or convention": "A11",
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
    if title in TITLE_TO_ID: return TITLE_TO_ID[title]
    m = re.match(r"^([ABCE]\d+):", title)
    return m.group(1) if m else title[:12]

def find_screenshot(title, project):
    # Playwright saves screenshots in test-results/<file>-<title>-<project>/
    safe = re.sub(r"[^a-zA-Z0-9-]", "-", title)[:50]
    patterns = [
        f"test-results/**/*{safe}*/*.png",
        f"test-results/**/*.png",
    ]
    for p in patterns:
        files = glob.glob(p, recursive=True)
        if files:
            # Prendre le dernier screenshot (fin du test)
            return sorted(files)[-1]
    return None

def parse_tests(suite, results):
    for spec in suite.get("specs", []):
        for test in spec.get("tests", []):
            title = test.get("title", "")
            status_raw = test.get("status", "")
            status = "passed" if status_raw == "expected" else "skipped" if status_raw == "skipped" else "failed"
            duration = sum(r.get("duration", 0) for r in test.get("results", []))
            error_msg = None
            screenshot_path = None
            for r in test.get("results", []):
                if r.get("error"):
                    error_msg = (r["error"].get("message") or "")[:500]
                for att in r.get("attachments", []):
                    if att.get("name") == "screenshot" and att.get("path"):
                        screenshot_path = att["path"]
            results.append({"title": title, "status": status, "duration": duration,
                            "error": error_msg, "screenshot": screenshot_path})
    for child in suite.get("suites", []):
        parse_tests(child, results)

# Charger le JSON
try:
    data = json.load(open(RESULTS_FILE))
except Exception as e:
    print(f"Cannot read {RESULTS_FILE}: {e}")
    sb_req("PATCH", f"test_runs?id=eq.{RUN_ID}", {"status": "failed", "finished_at": now()})
    sys.exit(1)

stats = data.get("stats", {})
total    = stats.get("expected", 0) + stats.get("unexpected", 0) + stats.get("skipped", 0)
passed   = stats.get("expected", 0)
failed   = stats.get("unexpected", 0)
skipped  = stats.get("skipped", 0)
duration = int(stats.get("duration", 0))
status   = "passed" if failed == 0 else "failed"
print(f"Results: {total} total, {passed} passed, {failed} failed, {skipped} skipped ({duration}ms) → {status}")

# Parser chaque test
all_results = []
for suite in data.get("suites", []):
    parse_tests(suite, all_results)
print(f"Parsed {len(all_results)} tests")

# Upsert chaque step
sort = 0
for r in all_results:
    tid = get_test_id(r["title"])
    suite_letter = tid[0] if tid and tid[0] in "ABCE" else "A"
    
    # Uploader le screenshot
    screenshot_url = None
    if r["screenshot"]:
        screenshot_url = upload_screenshot(r["screenshot"], f"{tid}-{sort}")
        if screenshot_url:
            print(f"  📷 {tid}: screenshot uploadé")
    
    payload = {
        "run_id": RUN_ID, "test_id": tid, "title": r["title"],
        "suite": suite_letter, "status": r["status"],
        "duration_ms": r["duration"],
        "finished_at": now(), "sort_order": sort,
    }
    if r["error"]: payload["error_message"] = r["error"]
    if screenshot_url: payload["screenshot_url"] = screenshot_url
    
    sb_req("PATCH", f"test_steps?run_id=eq.{RUN_ID}&test_id=eq.{tid}", payload)
    
    icon = "✓" if r["status"] == "passed" else "✗" if r["status"] == "failed" else "-"
    print(f"  {icon} {tid}: {r['title'][:40]} ({r['duration']}ms)")
    sort += 1

# Finaliser le run
sb_req("PATCH", f"test_runs?id=eq.{RUN_ID}", {
    "status": status, "finished_at": now(),
    "total": total, "passed": passed, "failed": failed, "skipped": skipped,
    "duration_ms": duration,
})
print(f"Run {status}: {passed}/{total}")

#!/usr/bin/env python3
"""Parse npm audit JSON output into a human-readable report."""
import json
import sys

data = json.load(sys.stdin)
vulns = data.get("vulnerabilities", {})
meta = data.get("metadata", {}).get("vulnerabilities", {})
total = meta.get("total", 0)
critical = meta.get("critical", 0)
high = meta.get("high", 0)
moderate = meta.get("moderate", 0)
low = meta.get("low", 0)

print(f"Total vulnerabilities: {total}")
print(f"  Critical: {critical}")
print(f"  High:     {high}")
print(f"  Moderate: {moderate}")
print(f"  Low:      {low}")
print()

if not vulns:
    print("No vulnerabilities found.")
    sys.exit(0)

for pkg, info in sorted(vulns.items()):
    sev = info.get("severity", "unknown")
    via = info.get("via", [])
    print(f"[{sev.upper()}] {pkg} ({info.get('range', '?')})")
    for v in via:
        if isinstance(v, dict):
            print(f"       {v.get('title', '')}")
    print()

# Exit with error if any critical or high vulnerabilities exist
sys.exit(1 if critical > 0 or high > 0 else 0)

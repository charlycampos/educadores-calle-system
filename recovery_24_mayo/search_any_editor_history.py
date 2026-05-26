import os
import json
from datetime import datetime

appdata = os.environ.get("APPDATA")
if appdata:
    paths = {
        "VSCode": os.path.join(appdata, "Code", "User", "History"),
        "Cursor": os.path.join(appdata, "Cursor", "User", "History")
    }
    
    matches = []
    for editor_name, history_path in paths.items():
        if os.path.exists(history_path):
            print(f"Scanning {editor_name} history at {history_path}...")
            for root, dirs, files in os.walk(history_path):
                if "entries.json" in files:
                    entries_file = os.path.join(root, "entries.json")
                    try:
                        with open(entries_file, 'r', encoding='utf-8') as f:
                            data = json.load(f)
                            resource = data.get("resource", "")
                            # Check if the resource ends with NnaCreatePage.tsx case-insensitively
                            if resource.lower().endswith("nnacreatepage.tsx"):
                                print(f"  Found folder: {root} | Resource: {resource}")
                                for file in files:
                                    if file != "entries.json":
                                        fpath = os.path.join(root, file)
                                        size = os.path.getsize(fpath)
                                        mtime = os.path.getmtime(fpath)
                                        matches.append((fpath, size, mtime, resource, editor_name))
                    except Exception as e:
                        pass
        else:
            print(f"{editor_name} history path not found.")
            
    matches.sort(key=lambda x: x[2], reverse=True)
    print(f"\nTotal matches found: {len(matches)}")
    for path, size, mtime, res, editor in matches[:30]:
        dt = datetime.fromtimestamp(mtime)
        print(f"[{editor}] File: {path} | Size: {size} bytes | Saved: {dt} | Resource: {res}")
else:
    print("APPDATA not found.")

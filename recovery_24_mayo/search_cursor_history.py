import os
import json
from datetime import datetime

appdata = os.environ.get("APPDATA")
if appdata:
    cursor_history_path = os.path.join(appdata, "Cursor", "User", "History")
    if os.path.exists(cursor_history_path):
        print(f"Searching Cursor history at: {cursor_history_path}")
        matches = []
        for root, dirs, files in os.walk(cursor_history_path):
            # Check entries.json to see if this folder is for NnaCreatePage.tsx
            if "entries.json" in files:
                entries_file = os.path.join(root, "entries.json")
                try:
                    with open(entries_file, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        resource = data.get("resource", "")
                        if "NnaCreatePage.tsx" in resource:
                            print(f"Found history folder: {root} | Resource: {resource}")
                            for file in files:
                                if file != "entries.json":
                                    fpath = os.path.join(root, file)
                                    size = os.path.getsize(fpath)
                                    mtime = os.path.getmtime(fpath)
                                    matches.append((fpath, size, mtime, resource))
                except Exception as e:
                    pass
                    
        # Sort matches by modification time (latest first)
        matches.sort(key=lambda x: x[2], reverse=True)
        print(f"\nTotal history entries found in Cursor: {len(matches)}")
        for path, size, mtime, res in matches[:20]:
            dt = datetime.fromtimestamp(mtime)
            print(f"File: {path} | Size: {size} bytes | Saved: {dt} | Resource: {res}")
    else:
        print("Cursor history path not found.")
else:
    print("APPDATA not found.")

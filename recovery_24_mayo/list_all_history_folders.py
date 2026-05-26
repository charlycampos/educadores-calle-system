import os
import json

appdata = os.environ.get("APPDATA")
if appdata:
    history_path = os.path.join(appdata, "Code", "User", "History")
    if os.path.exists(history_path):
        print(f"Scanning history folders at {history_path}...")
        count = 0
        for root, dirs, files in os.walk(history_path):
            if "entries.json" in files:
                entries_file = os.path.join(root, "entries.json")
                try:
                    with open(entries_file, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        resource = data.get("resource", "")
                        count += 1
                        if count <= 40:
                            print(f"- {resource}")
                except Exception as e:
                    pass
        print(f"Total entries found: {count}")
else:
    print("APPDATA not found")

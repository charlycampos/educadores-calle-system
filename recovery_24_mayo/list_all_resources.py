import os
import json

appdata = os.environ.get("APPDATA")
if appdata:
    history_path = os.path.join(appdata, "Code", "User", "History")
    if os.path.exists(history_path):
        print(f"Listing all history resources matching .tsx or Nna:")
        
        matches = []
        for root, dirs, files in os.walk(history_path):
            if "entries.json" in files:
                entries_file = os.path.join(root, "entries.json")
                try:
                    with open(entries_file, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        resource = data.get("resource", "")
                        if "tsx" in resource.lower() or "nna" in resource.lower():
                            matches.append((root, resource, files))
                except Exception as e:
                    pass
        
        print(f"Total matches found: {len(matches)}")
        for root, resource, files in matches:
            print(f"Folder: {root} | Resource: {resource}")
            for file in files:
                if file != "entries.json":
                    print(f"  File: {file} | Size: {os.path.getsize(os.path.join(root, file))} bytes")
    else:
        print("VS Code history path not found")
else:
    print("APPDATA environment variable not found")

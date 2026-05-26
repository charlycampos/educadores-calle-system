import os

appdata = os.environ.get("APPDATA")
if appdata:
    history_path = os.path.join(appdata, "Code", "User", "History")
    if os.path.exists(history_path):
        print(f"VS Code history exists: {history_path}")
        subdirs = os.listdir(history_path)
        print(f"Total subdirectories in history: {len(subdirs)}")
        # Let's count total files in all subdirs
        total_files = 0
        for root, dirs, files in os.walk(history_path):
            total_files += len(files)
        print(f"Total files in history: {total_files}")
    else:
        print(f"VS Code history path not found: {history_path}")
else:
    print("APPDATA environment variable not found")

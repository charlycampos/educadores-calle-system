import os
from datetime import datetime

brain_dir = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\brain"

if os.path.exists(brain_dir):
    for conv_id in os.listdir(brain_dir):
        conv_path = os.path.join(brain_dir, conv_id)
        if not os.path.isdir(conv_path):
            continue
        # Get directory creation time
        mtime = os.path.getmtime(conv_path)
        dt = datetime.fromtimestamp(mtime)
        print(f"Conversation ID: {conv_id} | Modified: {dt}")
else:
    print("Brain directory not found")

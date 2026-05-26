import sys
sys.path.insert(0, './src')
from main import app

print("=== REGISTERED ROUTES IN FASTAPI APP ===")
for route in app.routes:
    methods = getattr(route, "methods", None)
    path = getattr(route, "path", None)
    name = getattr(route, "name", None)
    print(f"Path: {path} | Methods: {methods} | Name: {name}")

import inspect
import sys

# Activate virtual environment paths
sys.path.insert(0, './src')

from src.infrastructure.http.routers import nna_router

print("=== INSPECTING _nna_to_dict SOURCE ===")
try:
    source = inspect.getsource(nna_router._nna_to_dict)
    print(source)
except Exception as e:
    print(f"Error: {e}")

print("=== INSPECTING _get_expediente SOURCE ===")
try:
    source = inspect.getsource(nna_router._get_expediente)
    print(source)
except Exception as e:
    print(f"Error: {e}")

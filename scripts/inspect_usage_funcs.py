import os, sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import importlib
m = importlib.import_module('app')
print('device_usage_day' in m.__dict__)
print('house_device_usage_day' in m.__dict__)
print([name for name in m.__dict__ if 'usage' in name])
print('Registered routes:')
print('\n'.join(sorted([str(r) for r in m.app.url_map.iter_rules()])))

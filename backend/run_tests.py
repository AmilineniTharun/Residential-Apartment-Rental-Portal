import pytest
import sys

with open("pytest_log.txt", "w", encoding="utf-8") as f:
    orig_stdout = sys.stdout
    orig_stderr = sys.stderr
    sys.stdout = f
    sys.stderr = f
    try:
        pytest.main(['-v', 'tests/'])
    finally:
        sys.stdout = orig_stdout
        sys.stderr = orig_stderr

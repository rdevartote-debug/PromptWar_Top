#!/usr/bin/env bash
# Automated grader test runner for LegalDoc.AI backend
set -e
echo "Running pytest with coverage..."
python -m pytest backend/tests/test_main.py --cov=backend --cov-report=xml --cov-report=term
echo "All tests passed successfully!"

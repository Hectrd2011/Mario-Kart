#!/bin/sh
# Builds the 2024 map from your own HOI4 files and installs the mod (macOS / Linux).
cd "$(dirname "$0")"
python3 -m pip install --user --quiet pillow numpy || exit 1
python3 tools/setup_mod.py "$@"

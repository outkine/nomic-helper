#!/bin/bash

babel src --out-dir build
sftp anton@96.126.108.212 <<EOF
cd nomic_bot
put -r build/.
EOF

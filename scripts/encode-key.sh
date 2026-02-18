#!/bin/bash

# 사용법: ./scripts/encode-key.sh /path/to/service-account.json

if [ -z "$1" ]; then
  echo "사용법: $0 <service-account.json 파일 경로>"
  echo "예시: $0 ~/Downloads/pw-talktalk-xxxx.json"
  exit 1
fi

if [ ! -f "$1" ]; then
  echo "오류: 파일을 찾을 수 없습니다: $1"
  exit 1
fi

echo ""
echo "=== Base64 인코딩된 Service Account Key ==="
echo ""
cat "$1" | base64
echo ""
echo "=== 위 값을 .env.local의 GOOGLE_SERVICE_ACCOUNT_KEY에 설정하세요 ==="
echo ""

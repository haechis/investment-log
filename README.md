# 📊 Portfolio Log — 월적립 투자 기록

GitHub Pages 기반 정적 투자 기록 사이트입니다.

## 📁 파일 구조

```
portfolio-log/
├── index.html          # 메인 HTML (마크업만)
├── css/
│   └── style.css       # 전체 스타일
└── js/
    ├── config.js       # 앱 설정 · 상수
    ├── store.js        # 데이터 저장 · CRUD (localStorage)
    ├── utils.js        # 포맷 · 계산 유틸
    ├── ui.js           # 렌더링 · 모달 · 탭 · 토스트
    ├── io.js           # JSON 내보내기 / 불러오기
    └── app.js          # 진입점 · 컨트롤러
```

## 🚀 GitHub Pages 배포

```bash
# 1. 레포지토리 생성 후 전체 파일 업로드
# 2. Settings → Pages → Branch: main / (root) 설정
# 3. https://<username>.github.io/<repo-name> 접속
```

## 💡 주요 기능

- 월별 매수 기록 입력 (증권사 · 종목 · 티커 · 통화 · 수량 · 단가 · 수수료 · 메모)
- 월별 / 전체 / 종목별 보기
- 종목별 평균 단가 · 총 투자금 자동 계산
- JSON 내보내기 / 불러오기 (round-trip, 중복 스킵)
- localStorage 기반 브라우저 저장

## 🔄 데이터 백업

우측 상단 **💾 내보내기** 버튼으로 JSON 파일 저장  
→ **📂 불러오기**로 재업로드하면 기존 데이터와 병합됩니다.

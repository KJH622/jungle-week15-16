# 사이드 프로젝트 공유 게시판

개발자들이 자신의 사이드 프로젝트를 공유하고 피드백을 나누는 커뮤니티 게시판입니다.

## 기술 스택

- **Frontend**: React (Vite)
- **Backend**: Spring Boot (Java 17)
- **Database**: PostgreSQL
- **AI**: RAG / MCP / AI Agent (FastAPI)

## 주요 기능

- 회원가입 / 로그인 (JWT 인증)
- 프로젝트 게시글 CRUD
- 댓글 / 태그
- 검색 / 페이징
- AI 기반 프로젝트 추천 (RAG)

## 실행 방법

### Backend
1. `application.properties.example`을 `application.properties`로 복사
2. DB 정보 입력
3. `./gradlew bootRun`

### Frontend
1. `cd frontend`
2. `npm install`
3. `npm run dev`
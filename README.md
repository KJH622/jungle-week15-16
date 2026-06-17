# 사이드 프로젝트 공유 게시판

개발자들이 자신의 사이드 프로젝트를 공유하고 피드백을 나누는 커뮤니티 게시판입니다.

## 기술 스택

- **Frontend**: React (Vite)
- **Gateway**: Nginx
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

### Gateway
로컬 개발에서는 Nginx Gateway를 `8088` 포트로 실행하고, React는 Gateway만 바라봅니다.

```bash
nginx -c <repo-root>/nginx/gateway.local.conf
```

- `/api/**` → Spring Boot `8080`
- `/ai/**` → FastAPI `8000`
- JWT 검증은 Spring Boot와 FastAPI에서 유지하고, Nginx는 `Authorization` 헤더를 그대로 전달합니다.

### Backend
1. `application.properties.example`을 `application.properties`로 복사
2. DB 정보 입력
3. `./gradlew bootRun`

### AI Server
1. `cd ai-server`
2. `.env.example`을 `.env`로 복사
3. `OPENAI_API_KEY`, `JWT_SECRET`, DB 정보를 입력
4. `uvicorn main:app --host 0.0.0.0 --port 8000 --reload`

### Frontend
1. `cd frontend`
2. `npm install`
3. `npm run dev`

### Production Nginx
EC2 운영 환경에서는 `nginx/gateway.prod.conf`를 기준으로 Nginx를 `80` 포트에서 실행하고, React 빌드 결과를 `/var/www/jungle-week15-16/frontend/dist`에 배치합니다.

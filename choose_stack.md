# 기술 선택 카드

## Spring Boot vs FastAPI / NestJS / Next.js — 백엔드 프레임워크 — 2026-06-12

### 맥락
- AI 게시판 (회원/게시물/댓글/검색/RAG/MCP/Agent) 구현 (2주)
- Java를 학습 목적으로 선택하고 싶은 상황
- 이후 추가 프로젝트에서도 해당 프레임워크를 활용 예정

### 각 기술 한 줄 요약
- **Spring Boot**: Java 기반, 엔터프라이즈 표준. 설정보다 관례(Convention over Configuration) 철학
- **FastAPI**: Python 기반, AI/ML 서버와 궁합 최고. 비동기 지원, 빠른 프로토타이핑
- **NestJS**: Node.js 기반, TypeScript 친화적. Spring과 구조가 유사
- **Next.js**: React 풀스택 프레임워크. 프론트+API를 한 곳에서 관리

### 트레이드오프
| 기준 | Spring Boot | FastAPI | NestJS |
|------|-------------|---------|--------|
| 언어 학습 가치 | Java — 이후 프로젝트 활용도 높음 | Python — AI 서버 친화적 | TypeScript |
| 초기 학습 곡선 | 높음 (Java + 생태계) | 낮음 | 중간 |
| AI 통합 | 별도 FastAPI 서버 필요 | 직접 통합 가능 | 별도 서버 필요 |
| 취업 시장 (국내) | 매우 강함 | AI 분야 강함 | 중간 |
| 게시판 적합성 | 매우 높음 | 중간 | 높음 |

### 선택한 것과 이유
- **선택:** Spring
- **이유:** Java의 생태계가 확고히 존재하고 국내 취업 시장에 매우 강하기 때문

### 나중에 다시 볼 것
- AI 서버(RAG/Agent)는 FastAPI로 분리 운영하는 게 현실적 → Spring Boot + FastAPI 이중 서버 구조

---

## PostgreSQL vs MariaDB — 데이터베이스 — 2026-06-12

### 맥락
- 게시판 기본 데이터 (회원, 게시물, 댓글, 태그) 저장
- 나중에 RAG를 위한 벡터 검색(pgvector) 필요

### 각 기술 한 줄 요약
- **PostgreSQL**: 기능이 풍부한 오픈소스 RDBMS. JSON, 배열, 확장(Extension) 지원 강함
- **MariaDB**: MySQL 포크. 가볍고 빠름. MySQL과 거의 호환

### 트레이드오프
| 기준 | PostgreSQL | MariaDB |
|------|-----------|---------|
| RAG 벡터 저장 | pgvector 확장으로 직접 지원 | 별도 벡터 DB 필요 |
| 학습 난이도 | 중간 | 낮음 |
| JSON 데이터 | jsonb 타입 — 강력 | 기본 지원 |
| 실무 사용률 | 높음 (특히 AI 프로젝트) | 높음 (웹 전반) |

### 선택한 것과 이유
- **선택:** PostgreSQL
- **이유:** AI Agents를 써야 하기 때문에 

### 나중에 다시 볼 것
- pgvector 없이 가면 Chroma/Pinecone 같은 별도 벡터 DB 추가 필요

---

## React vs Next.js — 프론트엔드 — 2026-06-12

### 맥락
- 과제 요구사항에 React 명시
- Spring Boot 백엔드와 분리된 SPA 구조로 진행

### 각 기술 한 줄 요약
- **React (Vite)**: UI 라이브러리. 라우팅/상태관리는 직접 구성
- **Next.js**: React 기반 풀스택 프레임워크. SSR, 파일 기반 라우팅 내장

### 트레이드오프
| 기준 | React (SPA) | Next.js |
|------|------------|---------|
| 백엔드 분리 | Spring Boot와 명확히 분리 | API Routes로 백엔드 일부 흡수 가능 |
| 학습 범위 | React 자체에 집중 | Next.js 개념도 추가 학습 |
| 요구사항 부합 | "React" 명시 → 직접 부합 | React 포함이지만 추가 레이어 |
| 배포 복잡도 | 낮음 | 중간 |

### 선택한 것과 이유
- **선택:** React
- **이유:** 우선적으로 프로젝트 규모가 크지 않기 때문에

### 나중에 다시 볼 것
- 프로젝트 규모가 커지면 Next.js로 마이그레이션할 가치 있음

package com.jungle.bulletin.service;

import com.jungle.bulletin.dto.PostRequest;
import com.jungle.bulletin.dto.PostResponse;
import com.jungle.bulletin.entity.Post;
import com.jungle.bulletin.entity.User;
import com.jungle.bulletin.repository.PostRepository;
import com.jungle.bulletin.repository.UserRepository;
import com.jungle.bulletin.entity.Tag;
import com.jungle.bulletin.repository.TagRepository;
import com.jungle.bulletin.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor  // final 필드 생성자 자동 생성 → Spring이 Repository 주입
public class PostService {

    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final TagRepository tagRepository;
    private final CategoryRepository categoryRepository;
    private final RestTemplate restTemplate;  // 외부 HTTP 요청 도구 (FastAPI 호출용)

    @Value("${ai.server.url}")  // application.properties의 ai.server.url 값 주입
    private String aiServerUrl;

    // 검색 + 카테고리 필터 + 페이징 — 조건 없으면 전체 조회
    public Page<PostResponse> getAllPosts(String keyword, Long domainId, Long projectTypeId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size); // 페이지 번호, 페이지 크기로 Pageable 생성
        return postRepository.search(keyword, domainId, projectTypeId, pageable)
                .map(PostResponse::new); // Page<Post> → Page<PostResponse> 변환
    }

    // 단건 조회 — 없는 id면 orElseThrow()로 예외 발생 (Optional 활용)
    public PostResponse getPost(Long id) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("게시글을 찾을 수 없습니다."));
        return new PostResponse(post);
    }

    // 게시글 작성 — JWT에서 추출한 email로 작성자 조회 후 저장
    public PostResponse createPost(PostRequest request, String email) {
        // 현재 로그인한 유저 조회
        User author = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("유저를 찾을 수 없습니다."));

        Post post = new Post();
        post.setTitle(request.getTitle());
        post.setContent(request.getContent());
        post.setAuthor(author); // 작성자 설정

        // 태그 처리 — 있으면 재사용, 없으면 새로 생성 후 저장
        if (request.getTags() != null) {
            List<Tag> tags = request.getTags().stream()
                .map(name -> tagRepository.findByName(name)
                    .orElseGet(() -> tagRepository.save(new Tag(name)))) // 없으면 insert
                .collect(Collectors.toList());
            post.setTags(tags);
        }

        // 도메인 카테고리 — id로 조회 후 게시글에 연결 (없는 id면 예외)
        if (request.getDomainId() != null) {
            post.setDomain(categoryRepository.findById(request.getDomainId())
                .orElseThrow(() -> new RuntimeException("카테고리를 찾을 수 없습니다.")));
        }

        // 성격 카테고리 — id로 조회 후 게시글에 연결 (없는 id면 예외)
        if (request.getProjectTypeId() != null) {
            post.setProjectType(categoryRepository.findById(request.getProjectTypeId())
                .orElseThrow(() -> new RuntimeException("카테고리를 찾을 수 없습니다.")));
        }

        // GitHub URL 저장
        post.setGithubUrl(request.getGithubUrl());

        // save()는 id가 없으면 INSERT, 있으면 UPDATE 자동 판단
        PostResponse saved = new PostResponse(postRepository.save(post));

        // FastAPI에 벡터 저장 요청 — 실패해도 게시글 저장은 정상 완료
        try {
            restTemplate.postForEntity(aiServerUrl + "/rag/embed/" + saved.getId(), null, String.class);
        } catch (Exception e) {
            System.out.println("[AI 연동 실패] 게시글 임베딩 오류: " + e.getMessage());
        }

        return saved;
    }

    // 게시글 수정 — 게시글 존재 확인 → 작성자 본인 확인 → 수정
    public PostResponse updatePost(Long id, PostRequest request, String email) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("게시글을 찾을 수 없습니다."));

        // 작성자 본인인지 확인
        if (!post.getAuthor().getEmail().equals(email)) {
            throw new RuntimeException("수정 권한이 없습니다.");
        }

        post.setTitle(request.getTitle());
        post.setContent(request.getContent());

        // 태그 처리 — 있으면 재사용, 없으면 새로 생성 후 저장
        if (request.getTags() != null) {
            List<Tag> tags = request.getTags().stream()
                .map(name -> tagRepository.findByName(name)
                    .orElseGet(() -> tagRepository.save(new Tag(name)))) // 없으면 insert
                .collect(Collectors.toList());
            post.setTags(tags);
        }

        // 도메인 카테고리 — id로 조회 후 게시글에 연결 (없는 id면 예외)
        if (request.getDomainId() != null) {
            post.setDomain(categoryRepository.findById(request.getDomainId())
                .orElseThrow(() -> new RuntimeException("카테고리를 찾을 수 없습니다.")));
        }

        // 성격 카테고리 — id로 조회 후 게시글에 연결 (없는 id면 예외)
        if (request.getProjectTypeId() != null) {
            post.setProjectType(categoryRepository.findById(request.getProjectTypeId())
                .orElseThrow(() -> new RuntimeException("카테고리를 찾을 수 없습니다.")));
        }

        // GitHub URL 저장
        post.setGithubUrl(request.getGithubUrl());

        PostResponse updated = new PostResponse(postRepository.save(post));

        // FastAPI에 벡터 갱신 요청 — upsert이므로 기존 벡터 덮어쓰기
        try {
            restTemplate.postForEntity(aiServerUrl + "/rag/embed/" + updated.getId(), null, String.class);
        } catch (Exception e) {
            System.out.println("[AI 연동 실패] 게시글 임베딩 오류: " + e.getMessage());
        }

        return updated;
    }

    // 프로젝트 개선 제안 — FastAPI /agent/improve 호출 후 결과 반환
    @SuppressWarnings("unchecked")
    public java.util.Map<String, Object> improveProject(Long id, String authorizationHeader) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("게시글을 찾을 수 없습니다."));

        // FastAPI에 보낼 요청 바디 구성
        java.util.Map<String, String> body = new java.util.HashMap<>();
        body.put("github_url", post.getGithubUrl() != null ? post.getGithubUrl() : "");
        body.put("title", post.getTitle());
        body.put("content", post.getContent());

        try {
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
            headers.set("Authorization", authorizationHeader);
            org.springframework.http.HttpEntity<java.util.Map<String, String>> entity =
                    new org.springframework.http.HttpEntity<>(body, headers);

            // FastAPI 응답을 Map으로 바로 역직렬화 → Spring이 JSON으로 재직렬화해서 React에 전달
            org.springframework.http.ResponseEntity<java.util.Map> response = restTemplate.postForEntity(
                    aiServerUrl + "/agent/improve", entity, java.util.Map.class);
            return (java.util.Map<String, Object>) response.getBody();
        } catch (Exception e) {
            throw new RuntimeException("AI 개선 제안 실패: " + e.getMessage());
        }
    }

    // 게시글 삭제 — 작성자 본인 확인 후 영구 삭제, 반환값 없음(void)
    public void deletePost(Long id, String email) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("게시글을 찾을 수 없습니다."));

        // 작성자 본인인지 확인
        if (!post.getAuthor().getEmail().equals(email)) {
            throw new RuntimeException("삭제 권한이 없습니다.");
        }

        postRepository.deleteById(id);

        // FastAPI에 벡터 삭제 요청 — ChromaDB에서도 해당 게시글 벡터 제거
        try {
            restTemplate.delete(aiServerUrl + "/rag/embed/" + id);
        } catch (Exception e) {
            System.out.println("[AI 연동 실패] 벡터 삭제 오류: " + e.getMessage());
        }
    }
}
